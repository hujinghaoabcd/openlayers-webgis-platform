import type Collection from 'ol/Collection.js';
import type {EventsKey} from 'ol/events.js';
import type OlMap from 'ol/Map.js';
import {unByKey} from 'ol/Observable.js';
import type Control from 'ol/control/Control.js';
import {Events, type EventListener} from './events.js';

/** OMap metadata properties stored on native OpenLayers controls. */
export const CONTROL_PROPERTY = {
  id: 'id',
  title: 'title',
  type: 'type',
  position: 'position',
  enabled: 'enabled',
} as const;

/** Logical control positions exposed for consistent styling. */
export type ControlPosition =
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right'
  | 'custom';

/** Metadata shared by every managed control. */
export interface ControlMetadata {
  readonly id: string;
  readonly title: string | undefined;
  readonly type: string | undefined;
  readonly position: ControlPosition | undefined;
}

/** Options used when adding or updating a control. */
export interface ControlOptions {
  readonly id?: string;
  readonly title?: string;
  readonly type?: string;
  readonly position?: ControlPosition;
  readonly enabled?: boolean;
  readonly replace?: boolean;
}

/** Snapshot of a managed control and its runtime state. */
export interface ControlInfo extends ControlMetadata {
  readonly control: Control;
  readonly index: number;
  readonly enabled: boolean;
}

/** Events emitted by the managed control collection. */
export interface ControlsEventMap {
  add: {readonly control: Control; readonly id: string; readonly index: number};
  remove: {readonly control: Control; readonly id: string; readonly index: number};
  enabled: {readonly control: Control; readonly id: string; readonly enabled: boolean};
  order: {readonly control: Control; readonly id: string; readonly from: number; readonly to: number};
  metadata: {readonly control: Control; readonly metadata: ControlMetadata};
}

const POSITION_CLASSES: Record<ControlPosition, string> = {
  'top-left': 'omap-control-position-top-left',
  'top-right': 'omap-control-position-top-right',
  'bottom-left': 'omap-control-position-bottom-left',
  'bottom-right': 'omap-control-position-bottom-right',
  custom: 'omap-control-position-custom',
};

interface ControlElementAccess {
  readonly element: HTMLElement;
}

/** Return the DOM element owned by a native OpenLayers control. */
export function getControlElement(control: Control): HTMLElement {
  const element = (control as unknown as ControlElementAccess).element;
  if (!element) throw new Error('Control does not expose a DOM element.');
  return element;
}

/** Apply OMap metadata and enabled state to a native OpenLayers control. */
export function configureControl<TControl extends Control>(
  control: TControl,
  options: Omit<ControlOptions, 'replace'> = {},
): TControl {
  if (options.id !== undefined) {
    const id = normalizeId(options.id);
    if (!id) throw new TypeError('Control id must be a non-empty string.');
    control.set(CONTROL_PROPERTY.id, id);
  }
  if (options.title !== undefined) control.set(CONTROL_PROPERTY.title, options.title);
  if (options.type !== undefined) control.set(CONTROL_PROPERTY.type, options.type);
  if (options.position !== undefined) control.set(CONTROL_PROPERTY.position, options.position);
  if (options.enabled !== undefined) control.set(CONTROL_PROPERTY.enabled, options.enabled);
  applyElementState(control);
  return control;
}

/** Return a control id when one has been assigned. */
export function getControlId(control: Control): string | undefined {
  return normalizeId(control.get(CONTROL_PROPERTY.id));
}

/** Managed view of an OpenLayers map control collection. */
export class Controls {
  private readonly collection: Collection<Control>;
  private readonly events = new Events<ControlsEventMap>();
  private readonly byId = new globalThis.Map<string, Control>();
  private readonly idsByControl = new WeakMap<Control, string>();
  private readonly controlKeys = new WeakMap<Control, EventsKey[]>();
  private readonly collectionKeys: EventsKey[];
  private readonly updating = new WeakSet<Control>();
  private sequence = 0;
  private moving = false;
  private destroyed = false;

  public constructor(map: OlMap) {
    this.collection = map.getControls();
    for (const control of this.collection.getArray()) this.register(control, false);
    this.collectionKeys = [
      this.collection.on('add', event => {
        if (!this.moving) this.register(event.element, true, event.index);
      }),
      this.collection.on('remove', event => {
        if (!this.moving) this.unregister(event.element, true, event.index);
      }),
    ];
  }

  public on<K extends keyof ControlsEventMap>(
    type: K,
    listener: EventListener<ControlsEventMap[K]>,
  ): this {
    this.events.on(type, listener);
    return this;
  }

  public once<K extends keyof ControlsEventMap>(
    type: K,
    listener: EventListener<ControlsEventMap[K]>,
  ): this {
    this.events.once(type, listener);
    return this;
  }

  public off(): this;
  public off<K extends keyof ControlsEventMap>(type: K): this;
  public off<K extends keyof ControlsEventMap>(
    type: K,
    listener: EventListener<ControlsEventMap[K]>,
  ): this;
  public off<K extends keyof ControlsEventMap>(
    type?: K,
    listener?: EventListener<ControlsEventMap[K]>,
  ): this {
    if (type === undefined) this.events.off();
    else if (listener === undefined) this.events.off(type);
    else this.events.off(type, listener);
    return this;
  }

  /** Add a native OpenLayers control. */
  public add<TControl extends Control>(
    control: TControl,
    options: ControlOptions = {},
  ): TControl {
    this.assertActive();
    if (this.collection.getArray().includes(control)) {
      this.update(control, options);
      return control;
    }

    const requestedId = normalizeId(options.id ?? control.get(CONTROL_PROPERTY.id));
    if (requestedId) {
      const existing = this.byId.get(requestedId);
      if (existing) {
        if (!options.replace) throw new Error(`Control id is already registered: ${requestedId}`);
        this.remove(existing);
      }
    }

    const {replace: _replace, ...configuration} = options;
    configureControl(control, configuration);
    this.collection.push(control);
    return control;
  }

  /** Remove a control by object or id. */
  public remove(controlOrId: Control | string): Control | undefined {
    this.assertActive();
    const control = this.resolve(controlOrId);
    return control ? this.collection.remove(control) : undefined;
  }

  public clear(): void {
    this.assertActive();
    for (const control of this.all()) this.collection.remove(control);
  }

  public get<TControl extends Control = Control>(id: string): TControl | undefined {
    return this.byId.get(id) as TControl | undefined;
  }

  public require<TControl extends Control = Control>(id: string): TControl {
    const control = this.get<TControl>(id);
    if (!control) throw new Error(`Control is not registered: ${id}`);
    return control;
  }

  public has(controlOrId: Control | string): boolean {
    return this.resolve(controlOrId) !== undefined;
  }

  public all(): Control[] {
    return [...this.collection.getArray()];
  }

  public ids(): string[] {
    return this.all().map(control => this.id(control));
  }

  public count(): number {
    return this.collection.getLength();
  }

  public id(control: Control): string {
    const id = this.idsByControl.get(control);
    if (!id) throw new Error('Control is not managed by this map.');
    return id;
  }

  public info(controlOrId: Control | string): ControlInfo {
    const control = this.requireControl(controlOrId);
    return {
      ...this.metadata(control),
      control,
      index: this.collection.getArray().indexOf(control),
      enabled: readEnabled(control),
    };
  }

  /** Update control metadata and enabled state. */
  public update<TControl extends Control>(
    controlOrId: TControl | string,
    options: ControlOptions,
  ): TControl {
    this.assertActive();
    const control = this.requireControl(controlOrId) as TControl;
    const previousId = this.id(control);
    const previousEnabled = readEnabled(control);
    const nextId = options.id === undefined ? previousId : normalizeId(options.id);
    if (!nextId) throw new TypeError('Control id must be a non-empty string.');

    const conflicting = this.byId.get(nextId);
    if (conflicting && conflicting !== control) {
      if (!options.replace) throw new Error(`Control id is already registered: ${nextId}`);
      this.remove(conflicting);
    }

    const {replace: _replace, ...configuration} = options;
    this.updating.add(control);
    try {
      configureControl(control, configuration);
      if (nextId !== previousId) {
        this.byId.delete(previousId);
        this.byId.set(nextId, control);
        this.idsByControl.set(control, nextId);
        control.set(CONTROL_PROPERTY.id, nextId, true);
      }
      applyElementState(control, nextId);
    } finally {
      this.updating.delete(control);
    }

    const enabled = readEnabled(control);
    this.events.emit('metadata', {control, metadata: this.metadata(control)});
    if (enabled !== previousEnabled) this.events.emit('enabled', {control, id: nextId, enabled});
    return control;
  }

  public enable(controlOrId: Control | string): Control {
    return this.setEnabled(controlOrId, true);
  }

  public disable(controlOrId: Control | string): Control {
    return this.setEnabled(controlOrId, false);
  }

  public toggle(controlOrId: Control | string): boolean {
    const enabled = !this.isEnabled(controlOrId);
    this.setEnabled(controlOrId, enabled);
    return enabled;
  }

  public isEnabled(controlOrId: Control | string): boolean {
    return readEnabled(this.requireControl(controlOrId));
  }

  public setEnabled(controlOrId: Control | string, enabled: boolean): Control {
    const control = this.requireControl(controlOrId);
    if (readEnabled(control) !== enabled) control.set(CONTROL_PROPERTY.enabled, enabled);
    return control;
  }

  public move(controlOrId: Control | string, index: number): Control {
    this.assertActive();
    const control = this.requireControl(controlOrId);
    const from = this.collection.getArray().indexOf(control);
    const to = Math.max(0, Math.min(Math.trunc(index), this.collection.getLength() - 1));
    if (from === to) return control;

    this.moving = true;
    try {
      this.collection.removeAt(from);
      this.collection.insertAt(to, control);
    } finally {
      this.moving = false;
    }
    this.events.emit('order', {control, id: this.id(control), from, to});
    return control;
  }

  public bringToFront(controlOrId: Control | string): Control {
    return this.move(controlOrId, this.collection.getLength() - 1);
  }

  public sendToBack(controlOrId: Control | string): Control {
    return this.move(controlOrId, 0);
  }

  public destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    unByKey(this.collectionKeys);
    for (const control of this.collection.getArray()) this.detach(control);
    this.byId.clear();
    this.events.off();
  }

  private register(control: Control, emit: boolean, index?: number): void {
    let id = getControlId(control);
    if (!id) id = this.nextId(control.constructor.name || 'control');
    else if (this.byId.has(id) && this.byId.get(id) !== control) id = this.nextId(id);

    control.set(CONTROL_PROPERTY.id, id, true);
    if (control.get(CONTROL_PROPERTY.enabled) === undefined) {
      control.set(CONTROL_PROPERTY.enabled, true, true);
    }
    this.byId.set(id, control);
    this.idsByControl.set(control, id);
    this.attach(control);
    applyElementState(control, id);

    if (emit) {
      this.events.emit('add', {
        control,
        id,
        index: index ?? this.collection.getArray().indexOf(control),
      });
    }
  }

  private unregister(control: Control, emit: boolean, index?: number): void {
    const id = this.idsByControl.get(control) ?? getControlId(control) ?? 'unknown';
    this.detach(control);
    this.idsByControl.delete(control);
    if (this.byId.get(id) === control) this.byId.delete(id);
    if (emit) this.events.emit('remove', {control, id, index: index ?? -1});
  }

  private attach(control: Control): void {
    this.controlKeys.set(control, [
      control.on('propertychange', event => this.handlePropertyChange(control, event.key)),
    ]);
  }

  private detach(control: Control): void {
    const keys = this.controlKeys.get(control);
    if (keys) unByKey(keys);
    this.controlKeys.delete(control);
  }

  private handlePropertyChange(control: Control, key: string): void {
    if (this.updating.has(control) || !isMetadataKey(key)) return;

    if (key === CONTROL_PROPERTY.id) {
      const previousId = this.idsByControl.get(control);
      const nextId = getControlId(control);
      if (!previousId) return;
      if (!nextId || (this.byId.has(nextId) && this.byId.get(nextId) !== control)) {
        control.set(CONTROL_PROPERTY.id, previousId, true);
        return;
      }
      if (nextId !== previousId) {
        this.byId.delete(previousId);
        this.byId.set(nextId, control);
        this.idsByControl.set(control, nextId);
      }
    }

    applyElementState(control, this.id(control));
    if (key === CONTROL_PROPERTY.enabled) {
      this.events.emit('enabled', {
        control,
        id: this.id(control),
        enabled: readEnabled(control),
      });
    }
    this.events.emit('metadata', {control, metadata: this.metadata(control)});
  }

  private metadata(control: Control): ControlMetadata {
    return {
      id: this.id(control),
      title: readString(control, CONTROL_PROPERTY.title),
      type: readString(control, CONTROL_PROPERTY.type),
      position: readPosition(control),
    };
  }

  private resolve(controlOrId: Control | string): Control | undefined {
    return typeof controlOrId === 'string'
      ? this.byId.get(controlOrId)
      : this.collection.getArray().includes(controlOrId)
        ? controlOrId
        : undefined;
  }

  private requireControl(controlOrId: Control | string): Control {
    const control = this.resolve(controlOrId);
    if (!control) {
      const label = typeof controlOrId === 'string' ? controlOrId : 'provided object';
      throw new Error(`Control is not managed by this map: ${label}`);
    }
    return control;
  }

  private nextId(prefix: string): string {
    const base = normalizePrefix(prefix);
    let id: string;
    do {
      this.sequence += 1;
      id = `${base}-${this.sequence}`;
    } while (this.byId.has(id));
    return id;
  }

  private assertActive(): void {
    if (this.destroyed) throw new Error('Control collection has been destroyed.');
  }
}

function normalizeId(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const id = value.trim();
  return id.length > 0 ? id : undefined;
}

function normalizePrefix(value: string): string {
  const normalized = value
    .replace(/Control$/u, '')
    .replace(/([a-z0-9])([A-Z])/gu, '$1-$2')
    .replace(/[^a-zA-Z0-9]+/gu, '-')
    .replace(/^-+|-+$/gu, '')
    .toLowerCase();
  return normalized || 'control';
}

function readString(control: Control, key: string): string | undefined {
  const value = control.get(key);
  return typeof value === 'string' ? value : undefined;
}

function readPosition(control: Control): ControlPosition | undefined {
  const value = control.get(CONTROL_PROPERTY.position);
  return isPosition(value) ? value : undefined;
}

function readEnabled(control: Control): boolean {
  return control.get(CONTROL_PROPERTY.enabled) !== false;
}

function applyElementState(control: Control, explicitId?: string): void {
  const element = getControlElement(control);
  const id = explicitId ?? getControlId(control);
  if (id) element.dataset.omapControlId = id;

  for (const className of Object.values(POSITION_CLASSES)) element.classList.remove(className);
  const position = readPosition(control);
  if (position) {
    element.classList.add(POSITION_CLASSES[position]);
    element.dataset.omapControlPosition = position;
  } else {
    delete element.dataset.omapControlPosition;
  }

  const enabled = readEnabled(control);
  element.hidden = !enabled;
  element.setAttribute('aria-hidden', enabled ? 'false' : 'true');
}

function isPosition(value: unknown): value is ControlPosition {
  return typeof value === 'string' && value in POSITION_CLASSES;
}

function isMetadataKey(key: string): boolean {
  return Object.values(CONTROL_PROPERTY).includes(
    key as (typeof CONTROL_PROPERTY)[keyof typeof CONTROL_PROPERTY],
  );
}
