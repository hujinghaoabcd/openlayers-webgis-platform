import type Collection from 'ol/Collection.js';
import type {Coordinate} from 'ol/coordinate.js';
import type {EventsKey} from 'ol/events.js';
import type OlMap from 'ol/Map.js';
import {unByKey} from 'ol/Observable.js';
import Overlay from 'ol/Overlay.js';
import {Events, type EventListener} from './events.js';

/** OMap metadata and state properties stored on native OpenLayers overlays. */
export const OVERLAY_PROPERTY = {
  id: 'omap:id',
  title: 'omap:title',
  type: 'omap:type',
  group: 'omap:group',
  visible: 'omap:visible',
} as const;

/** Native OpenLayers overlay positioning values. */
export type OverlayPositioning =
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right'
  | 'center-left'
  | 'center-center'
  | 'center-right'
  | 'top-left'
  | 'top-center'
  | 'top-right';

/** Metadata shared by every managed overlay. */
export interface OverlayMetadata {
  readonly id: string;
  readonly title: string | undefined;
  readonly type: string | undefined;
  readonly group: string | undefined;
}

/** Options used when adding or updating an overlay. */
export interface ManagedOverlayOptions {
  readonly id?: string;
  readonly title?: string;
  readonly type?: string;
  readonly group?: string;
  readonly visible?: boolean;
  /** Set a coordinate, or pass null to clear the native position. */
  readonly position?: Coordinate | null;
  readonly offset?: readonly [number, number] | readonly number[];
  readonly positioning?: OverlayPositioning;
  readonly element?: HTMLElement;
  readonly replace?: boolean;
}

/** Snapshot of a managed overlay and its runtime state. */
export interface OverlayInfo extends OverlayMetadata {
  readonly overlay: Overlay;
  readonly index: number;
  readonly visible: boolean;
  readonly position: Coordinate | undefined;
  readonly offset: readonly number[];
  readonly positioning: OverlayPositioning;
  readonly element: HTMLElement | undefined;
}

/** Events emitted by the managed overlay collection. */
export interface OverlaysEventMap {
  add: {readonly overlay: Overlay; readonly id: string; readonly index: number};
  remove: {readonly overlay: Overlay; readonly id: string; readonly index: number};
  visible: {readonly overlay: Overlay; readonly id: string; readonly visible: boolean};
  position: {
    readonly overlay: Overlay;
    readonly id: string;
    readonly position: Coordinate | undefined;
  };
  offset: {readonly overlay: Overlay; readonly id: string; readonly offset: readonly number[]};
  positioning: {
    readonly overlay: Overlay;
    readonly id: string;
    readonly positioning: OverlayPositioning;
  };
  element: {
    readonly overlay: Overlay;
    readonly id: string;
    readonly element: HTMLElement | undefined;
  };
  order: {readonly overlay: Overlay; readonly id: string; readonly from: number; readonly to: number};
  metadata: {readonly overlay: Overlay; readonly metadata: OverlayMetadata};
}

/** Apply OMap metadata and mutable state to a native OpenLayers overlay. */
export function configureOverlay<TOverlay extends Overlay>(
  overlay: TOverlay,
  options: Omit<ManagedOverlayOptions, 'replace'> = {},
): TOverlay {
  if (options.id !== undefined) {
    const id = normalizeId(options.id);
    if (!id) throw new TypeError('Overlay id must be a non-empty string.');
    overlay.set(OVERLAY_PROPERTY.id, id);
  }
  if (options.title !== undefined) overlay.set(OVERLAY_PROPERTY.title, options.title);
  if (options.type !== undefined) overlay.set(OVERLAY_PROPERTY.type, options.type);
  if (options.group !== undefined) overlay.set(OVERLAY_PROPERTY.group, options.group);
  if (options.visible !== undefined) overlay.set(OVERLAY_PROPERTY.visible, options.visible);
  if (options.position !== undefined) overlay.setPosition(options.position ?? undefined);
  if (options.offset !== undefined) overlay.setOffset([...options.offset]);
  if (options.positioning !== undefined) overlay.setPositioning(options.positioning);
  if (options.element !== undefined) overlay.setElement(options.element);
  applyElementState(overlay);
  return overlay;
}

/** Return an OMap overlay id when one has been assigned. */
export function getOverlayId(overlay: Overlay): string | undefined {
  return normalizeId(overlay.get(OVERLAY_PROPERTY.id)) ?? normalizeId(overlay.getId());
}

/** Managed view of an OpenLayers map overlay collection. */
export class Overlays {
  private readonly collection: Collection<Overlay>;
  private readonly events = new Events<OverlaysEventMap>();
  private readonly byId = new globalThis.Map<string, Overlay>();
  private readonly idsByOverlay = new WeakMap<Overlay, string>();
  private readonly overlayKeys = new WeakMap<Overlay, EventsKey[]>();
  private readonly collectionKeys: EventsKey[];
  private readonly updating = new WeakSet<Overlay>();
  private sequence = 0;
  private moving = false;
  private destroyed = false;

  public constructor(map: OlMap) {
    this.collection = map.getOverlays();
    for (const overlay of this.collection.getArray()) this.register(overlay, false);
    this.collectionKeys = [
      this.collection.on('add', event => {
        if (!this.moving) this.register(event.element, true, event.index);
      }),
      this.collection.on('remove', event => {
        if (!this.moving) this.unregister(event.element, true, event.index);
      }),
    ];
  }

  public on<K extends keyof OverlaysEventMap>(
    type: K,
    listener: EventListener<OverlaysEventMap[K]>,
  ): this {
    this.events.on(type, listener);
    return this;
  }

  public once<K extends keyof OverlaysEventMap>(
    type: K,
    listener: EventListener<OverlaysEventMap[K]>,
  ): this {
    this.events.once(type, listener);
    return this;
  }

  public off(): this;
  public off<K extends keyof OverlaysEventMap>(type: K): this;
  public off<K extends keyof OverlaysEventMap>(
    type: K,
    listener: EventListener<OverlaysEventMap[K]>,
  ): this;
  public off<K extends keyof OverlaysEventMap>(
    type?: K,
    listener?: EventListener<OverlaysEventMap[K]>,
  ): this {
    if (type === undefined) this.events.off();
    else if (listener === undefined) this.events.off(type);
    else this.events.off(type, listener);
    return this;
  }

  /** Add a native OpenLayers overlay. */
  public add<TOverlay extends Overlay>(
    overlay: TOverlay,
    options: ManagedOverlayOptions = {},
  ): TOverlay {
    this.assertActive();
    if (this.collection.getArray().includes(overlay)) {
      this.update(overlay, options);
      return overlay;
    }

    const requestedId = normalizeId(options.id ?? overlay.get(OVERLAY_PROPERTY.id) ?? overlay.getId());
    if (requestedId) {
      const existing = this.byId.get(requestedId);
      if (existing) {
        if (!options.replace) throw new Error(`Overlay id is already registered: ${requestedId}`);
        this.remove(existing);
      }
    }

    const {replace: _replace, ...configuration} = options;
    configureOverlay(overlay, configuration);
    this.collection.push(overlay);
    return overlay;
  }

  /** Remove an overlay by object or stable id. */
  public remove(overlayOrId: Overlay | string): Overlay | undefined {
    this.assertActive();
    const overlay = this.resolve(overlayOrId);
    return overlay ? this.collection.remove(overlay) : undefined;
  }

  public clear(): void {
    this.assertActive();
    for (const overlay of this.all()) this.collection.remove(overlay);
  }

  public get<TOverlay extends Overlay = Overlay>(id: string): TOverlay | undefined {
    return this.byId.get(id) as TOverlay | undefined;
  }

  public require<TOverlay extends Overlay = Overlay>(id: string): TOverlay {
    const overlay = this.get<TOverlay>(id);
    if (!overlay) throw new Error(`Overlay is not registered: ${id}`);
    return overlay;
  }

  public has(overlayOrId: Overlay | string): boolean {
    return this.resolve(overlayOrId) !== undefined;
  }

  public all(): Overlay[] {
    return [...this.collection.getArray()];
  }

  public ids(): string[] {
    return this.all().map(overlay => this.id(overlay));
  }

  public count(): number {
    return this.collection.getLength();
  }

  public id(overlay: Overlay): string {
    const id = this.idsByOverlay.get(overlay);
    if (!id) throw new Error('Overlay is not managed by this map.');
    return id;
  }

  public info(overlayOrId: Overlay | string): OverlayInfo {
    const overlay = this.requireOverlay(overlayOrId);
    return {
      ...this.metadata(overlay),
      overlay,
      index: this.collection.getArray().indexOf(overlay),
      visible: readVisible(overlay),
      position: cloneCoordinate(overlay.getPosition()),
      offset: [...overlay.getOffset()],
      positioning: overlay.getPositioning() as OverlayPositioning,
      element: overlay.getElement(),
    };
  }

  /** Update overlay metadata and mutable native state. */
  public update<TOverlay extends Overlay>(
    overlayOrId: TOverlay | string,
    options: ManagedOverlayOptions,
  ): TOverlay {
    this.assertActive();
    const overlay = this.requireOverlay(overlayOrId) as TOverlay;
    const previousId = this.id(overlay);
    const previousVisible = readVisible(overlay);
    const previousPosition = cloneCoordinate(overlay.getPosition());
    const previousOffset = [...overlay.getOffset()];
    const previousPositioning = overlay.getPositioning() as OverlayPositioning;
    const previousElement = overlay.getElement();
    const nextId = options.id === undefined ? previousId : normalizeId(options.id);
    if (!nextId) throw new TypeError('Overlay id must be a non-empty string.');

    const conflicting = this.byId.get(nextId);
    if (conflicting && conflicting !== overlay) {
      if (!options.replace) throw new Error(`Overlay id is already registered: ${nextId}`);
      this.remove(conflicting);
    }

    const {replace: _replace, ...configuration} = options;
    this.updating.add(overlay);
    try {
      configureOverlay(overlay, configuration);
      if (nextId !== previousId) {
        this.byId.delete(previousId);
        this.byId.set(nextId, overlay);
        this.idsByOverlay.set(overlay, nextId);
        overlay.set(OVERLAY_PROPERTY.id, nextId, true);
      }
      applyElementState(overlay, nextId);
    } finally {
      this.updating.delete(overlay);
    }

    this.events.emit('metadata', {overlay, metadata: this.metadata(overlay)});
    const visible = readVisible(overlay);
    if (visible !== previousVisible) this.events.emit('visible', {overlay, id: nextId, visible});
    const position = cloneCoordinate(overlay.getPosition());
    if (!coordinatesEqual(previousPosition, position)) {
      this.events.emit('position', {overlay, id: nextId, position});
    }
    const offset = [...overlay.getOffset()];
    if (!numbersEqual(previousOffset, offset)) this.events.emit('offset', {overlay, id: nextId, offset});
    const positioning = overlay.getPositioning() as OverlayPositioning;
    if (positioning !== previousPositioning) {
      this.events.emit('positioning', {overlay, id: nextId, positioning});
    }
    const element = overlay.getElement();
    if (element !== previousElement) this.events.emit('element', {overlay, id: nextId, element});
    return overlay;
  }

  public show(overlayOrId: Overlay | string): Overlay {
    return this.setVisible(overlayOrId, true);
  }

  public hide(overlayOrId: Overlay | string): Overlay {
    return this.setVisible(overlayOrId, false);
  }

  public toggle(overlayOrId: Overlay | string): boolean {
    const visible = !this.isVisible(overlayOrId);
    this.setVisible(overlayOrId, visible);
    return visible;
  }

  public isVisible(overlayOrId: Overlay | string): boolean {
    return readVisible(this.requireOverlay(overlayOrId));
  }

  public setVisible(overlayOrId: Overlay | string, visible: boolean): Overlay {
    const overlay = this.requireOverlay(overlayOrId);
    if (readVisible(overlay) !== visible) overlay.set(OVERLAY_PROPERTY.visible, visible);
    else applyElementState(overlay);
    return overlay;
  }

  public setPosition(overlayOrId: Overlay | string, position?: Coordinate): Overlay {
    const overlay = this.requireOverlay(overlayOrId);
    overlay.setPosition(position);
    return overlay;
  }

  public setOffset(overlayOrId: Overlay | string, offset: readonly number[]): Overlay {
    const overlay = this.requireOverlay(overlayOrId);
    overlay.setOffset([...offset]);
    return overlay;
  }

  public setPositioning(
    overlayOrId: Overlay | string,
    positioning: OverlayPositioning,
  ): Overlay {
    const overlay = this.requireOverlay(overlayOrId);
    overlay.setPositioning(positioning);
    return overlay;
  }

  public setElement(overlayOrId: Overlay | string, element: HTMLElement): Overlay {
    const overlay = this.requireOverlay(overlayOrId);
    overlay.setElement(element);
    return overlay;
  }

  public panIntoView(
    overlayOrId: Overlay | string,
    options?: Parameters<Overlay['panIntoView']>[0],
  ): Overlay {
    const overlay = this.requireOverlay(overlayOrId);
    overlay.panIntoView(options);
    return overlay;
  }

  public move(overlayOrId: Overlay | string, index: number): Overlay {
    this.assertActive();
    const overlay = this.requireOverlay(overlayOrId);
    const from = this.collection.getArray().indexOf(overlay);
    const to = Math.max(0, Math.min(Math.trunc(index), this.collection.getLength() - 1));
    if (from === to) return overlay;

    this.moving = true;
    try {
      this.collection.removeAt(from);
      this.collection.insertAt(to, overlay);
    } finally {
      this.moving = false;
    }
    this.events.emit('order', {overlay, id: this.id(overlay), from, to});
    return overlay;
  }

  public bringToFront(overlayOrId: Overlay | string): Overlay {
    return this.move(overlayOrId, this.collection.getLength() - 1);
  }

  public sendToBack(overlayOrId: Overlay | string): Overlay {
    return this.move(overlayOrId, 0);
  }

  public destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    unByKey(this.collectionKeys);
    for (const overlay of this.collection.getArray()) this.detach(overlay);
    this.byId.clear();
    this.events.off();
  }

  private register(overlay: Overlay, emit: boolean, index?: number): void {
    let id = getOverlayId(overlay);
    if (!id) id = this.nextId(overlay.constructor.name || 'overlay');
    else if (this.byId.has(id) && this.byId.get(id) !== overlay) id = this.nextId(id);

    overlay.set(OVERLAY_PROPERTY.id, id, true);
    if (overlay.get(OVERLAY_PROPERTY.visible) === undefined) {
      overlay.set(OVERLAY_PROPERTY.visible, overlay.getElement()?.hidden !== true, true);
    }
    this.byId.set(id, overlay);
    this.idsByOverlay.set(overlay, id);
    this.attach(overlay);
    applyElementState(overlay, id);

    if (emit) {
      this.events.emit('add', {
        overlay,
        id,
        index: index ?? this.collection.getArray().indexOf(overlay),
      });
    }
  }

  private unregister(overlay: Overlay, emit: boolean, index?: number): void {
    const id = this.idsByOverlay.get(overlay) ?? getOverlayId(overlay) ?? 'unknown';
    this.detach(overlay);
    this.idsByOverlay.delete(overlay);
    if (this.byId.get(id) === overlay) this.byId.delete(id);
    if (emit) this.events.emit('remove', {overlay, id, index: index ?? -1});
  }

  private attach(overlay: Overlay): void {
    this.overlayKeys.set(overlay, [
      overlay.on('propertychange', event => this.handlePropertyChange(overlay, event.key)),
    ]);
  }

  private detach(overlay: Overlay): void {
    const keys = this.overlayKeys.get(overlay);
    if (keys) unByKey(keys);
    this.overlayKeys.delete(overlay);
  }

  private handlePropertyChange(overlay: Overlay, key: string): void {
    if (this.updating.has(overlay)) return;

    if (key === OVERLAY_PROPERTY.id) {
      const previousId = this.idsByOverlay.get(overlay);
      const nextId = getOverlayId(overlay);
      if (!previousId) return;
      if (!nextId || (this.byId.has(nextId) && this.byId.get(nextId) !== overlay)) {
        overlay.set(OVERLAY_PROPERTY.id, previousId, true);
        return;
      }
      if (nextId !== previousId) {
        this.byId.delete(previousId);
        this.byId.set(nextId, overlay);
        this.idsByOverlay.set(overlay, nextId);
      }
    }

    const id = this.id(overlay);
    if (key === OVERLAY_PROPERTY.visible || key === 'element' || key === OVERLAY_PROPERTY.id) {
      applyElementState(overlay, id);
    }

    switch (key) {
      case OVERLAY_PROPERTY.visible:
        this.events.emit('visible', {overlay, id, visible: readVisible(overlay)});
        return;
      case 'position':
        this.events.emit('position', {overlay, id, position: cloneCoordinate(overlay.getPosition())});
        return;
      case 'offset':
        this.events.emit('offset', {overlay, id, offset: [...overlay.getOffset()]});
        return;
      case 'positioning':
        this.events.emit('positioning', {
          overlay,
          id,
          positioning: overlay.getPositioning() as OverlayPositioning,
        });
        return;
      case 'element':
        this.events.emit('element', {overlay, id, element: overlay.getElement()});
        return;
      default:
        if (isMetadataKey(key)) {
          this.events.emit('metadata', {overlay, metadata: this.metadata(overlay)});
        }
    }
  }

  private metadata(overlay: Overlay): OverlayMetadata {
    return {
      id: this.id(overlay),
      title: readString(overlay, OVERLAY_PROPERTY.title),
      type: readString(overlay, OVERLAY_PROPERTY.type),
      group: readString(overlay, OVERLAY_PROPERTY.group),
    };
  }

  private resolve(overlayOrId: Overlay | string): Overlay | undefined {
    return typeof overlayOrId === 'string'
      ? this.byId.get(overlayOrId)
      : this.collection.getArray().includes(overlayOrId)
        ? overlayOrId
        : undefined;
  }

  private requireOverlay(overlayOrId: Overlay | string): Overlay {
    const overlay = this.resolve(overlayOrId);
    if (!overlay) {
      const label = typeof overlayOrId === 'string' ? overlayOrId : 'provided object';
      throw new Error(`Overlay is not managed by this map: ${label}`);
    }
    return overlay;
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
    if (this.destroyed) throw new Error('Overlay collection has been destroyed.');
  }
}

function normalizeId(value: unknown): string | undefined {
  if (typeof value !== 'string' && typeof value !== 'number') return undefined;
  const id = String(value).trim();
  return id.length > 0 ? id : undefined;
}

function normalizePrefix(value: string): string {
  const normalized = value
    .replace(/Overlay$/u, '')
    .replace(/([a-z0-9])([A-Z])/gu, '$1-$2')
    .replace(/[^a-zA-Z0-9]+/gu, '-')
    .replace(/^-+|-+$/gu, '')
    .toLowerCase();
  return normalized || 'overlay';
}

function readString(overlay: Overlay, key: string): string | undefined {
  const value = overlay.get(key);
  return typeof value === 'string' ? value : undefined;
}

function readVisible(overlay: Overlay): boolean {
  return overlay.get(OVERLAY_PROPERTY.visible) !== false;
}

function applyElementState(overlay: Overlay, explicitId?: string): void {
  const element = overlay.getElement();
  if (!element) return;
  const id = explicitId ?? getOverlayId(overlay);
  if (id) element.dataset.omapOverlayId = id;
  const visible = readVisible(overlay);
  element.hidden = !visible;
  element.setAttribute('aria-hidden', visible ? 'false' : 'true');
}

function cloneCoordinate(coordinate: Coordinate | undefined): Coordinate | undefined {
  return coordinate ? [...coordinate] : undefined;
}

function coordinatesEqual(left: Coordinate | undefined, right: Coordinate | undefined): boolean {
  if (left === undefined || right === undefined) return left === right;
  return numbersEqual(left, right);
}

function numbersEqual(left: readonly number[], right: readonly number[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function isMetadataKey(key: string): boolean {
  return [
    OVERLAY_PROPERTY.id,
    OVERLAY_PROPERTY.title,
    OVERLAY_PROPERTY.type,
    OVERLAY_PROPERTY.group,
  ].includes(key);
}
