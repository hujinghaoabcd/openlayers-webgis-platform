import type Collection from 'ol/Collection.js';
import type {EventsKey} from 'ol/events.js';
import type OlMap from 'ol/Map.js';
import {unByKey} from 'ol/Observable.js';
import type BaseLayer from 'ol/layer/Base.js';
import {Events, type EventListener} from './events.js';

/** OMap metadata properties stored on OpenLayers layer objects. */
export const LAYER_PROPERTY = {
  id: 'id',
  title: 'title',
  kind: 'kind',
  type: 'type',
  group: 'group',
  tags: 'tags',
} as const;

/** High-level role of a managed map layer. */
export type LayerKind = 'basemap' | 'overlay';

/** Metadata shared by every managed layer. */
export interface LayerMetadata {
  readonly id: string;
  readonly title: string | undefined;
  readonly kind: LayerKind;
  readonly type: string | undefined;
  readonly group: string | undefined;
  readonly tags: readonly string[];
}

/** Options used when adding or updating a layer. */
export interface LayerOptions {
  readonly id?: string;
  readonly title?: string;
  readonly kind?: LayerKind;
  readonly type?: string;
  readonly group?: string;
  readonly tags?: readonly string[];
  readonly visible?: boolean;
  readonly opacity?: number;
  readonly zIndex?: number;
  readonly replace?: boolean;
}

/** Snapshot of a managed layer and its current runtime state. */
export interface LayerInfo extends LayerMetadata {
  readonly layer: BaseLayer;
  readonly index: number;
  readonly visible: boolean;
  readonly opacity: number;
  readonly zIndex: number | undefined;
}

/** Events emitted by the managed layer collection. */
export interface LayersEventMap {
  add: {readonly layer: BaseLayer; readonly id: string; readonly index: number};
  remove: {readonly layer: BaseLayer; readonly id: string; readonly index: number};
  visibility: {readonly layer: BaseLayer; readonly id: string; readonly visible: boolean};
  opacity: {readonly layer: BaseLayer; readonly id: string; readonly opacity: number};
  zIndex: {readonly layer: BaseLayer; readonly id: string; readonly zIndex: number | undefined};
  order: {readonly layer: BaseLayer; readonly id: string; readonly from: number; readonly to: number};
  metadata: {readonly layer: BaseLayer; readonly metadata: LayerMetadata};
  basemap: {
    readonly layer: BaseLayer | undefined;
    readonly previous: BaseLayer | undefined;
  };
}

/** Apply OMap metadata and common OpenLayers layer state. */
export function configureLayer<TLayer extends BaseLayer>(
  layer: TLayer,
  options: Omit<LayerOptions, 'replace'> = {},
): TLayer {
  if (options.id !== undefined) {
    const id = normalizeId(options.id);
    if (!id) {
      throw new TypeError('Layer id must be a non-empty string.');
    }
    layer.set(LAYER_PROPERTY.id, id);
  }
  if (options.title !== undefined) layer.set(LAYER_PROPERTY.title, options.title);
  if (options.kind !== undefined) layer.set(LAYER_PROPERTY.kind, options.kind);
  if (options.type !== undefined) layer.set(LAYER_PROPERTY.type, options.type);
  if (options.group !== undefined) layer.set(LAYER_PROPERTY.group, options.group);
  if (options.tags !== undefined) layer.set(LAYER_PROPERTY.tags, [...options.tags]);
  if (options.visible !== undefined) layer.setVisible(options.visible);
  if (options.opacity !== undefined) {
    assertOpacity(options.opacity);
    layer.setOpacity(options.opacity);
  }
  if (options.zIndex !== undefined) layer.setZIndex(options.zIndex);
  return layer;
}

/** Return a layer id when one has been assigned. */
export function getLayerId(layer: BaseLayer): string | undefined {
  return normalizeId(layer.get(LAYER_PROPERTY.id));
}

/**
 * Managed view of an OpenLayers map layer collection.
 *
 * The underlying objects remain native OpenLayers layers. OMap adds stable ids,
 * metadata, lookup, ordering, basemap exclusivity and typed lifecycle events.
 */
export class Layers {
  private readonly collection: Collection<BaseLayer>;
  private readonly events = new Events<LayersEventMap>();
  private readonly byId = new globalThis.Map<string, BaseLayer>();
  private readonly idsByLayer = new WeakMap<BaseLayer, string>();
  private readonly layerKeys = new WeakMap<BaseLayer, EventsKey[]>();
  private readonly collectionKeys: EventsKey[];
  private readonly updating = new WeakSet<BaseLayer>();
  private sequence = 0;
  private moving = false;
  private changingBasemap = false;
  private activeBasemap: BaseLayer | undefined;
  private destroyed = false;

  public constructor(map: OlMap) {
    this.collection = map.getLayers();
    for (const layer of this.collection.getArray()) {
      this.register(layer, false);
    }
    this.normalizeInitialBasemaps();

    this.collectionKeys = [
      this.collection.on('add', event => {
        if (!this.moving) this.register(event.element, true, event.index);
      }),
      this.collection.on('remove', event => {
        if (!this.moving) this.unregister(event.element, true, event.index);
      }),
    ];
  }

  /** Register a typed layer collection listener. */
  public on<K extends keyof LayersEventMap>(
    type: K,
    listener: EventListener<LayersEventMap[K]>,
  ): this {
    this.events.on(type, listener);
    return this;
  }

  /** Register a typed listener that runs once. */
  public once<K extends keyof LayersEventMap>(
    type: K,
    listener: EventListener<LayersEventMap[K]>,
  ): this {
    this.events.once(type, listener);
    return this;
  }

  /** Remove layer collection listeners. */
  public off(): this;
  public off<K extends keyof LayersEventMap>(type: K): this;
  public off<K extends keyof LayersEventMap>(
    type: K,
    listener: EventListener<LayersEventMap[K]>,
  ): this;
  public off<K extends keyof LayersEventMap>(
    type?: K,
    listener?: EventListener<LayersEventMap[K]>,
  ): this {
    if (type === undefined) this.events.off();
    else if (listener === undefined) this.events.off(type);
    else this.events.off(type, listener);
    return this;
  }

  /** Add a native OpenLayers layer to the collection. */
  public add<TLayer extends BaseLayer>(layer: TLayer, options: LayerOptions = {}): TLayer {
    this.assertActive();
    const existingIndex = this.collection.getArray().indexOf(layer);
    if (existingIndex >= 0) {
      this.update(layer, options);
      return layer;
    }

    const requestedId = normalizeId(options.id ?? layer.get(LAYER_PROPERTY.id));
    if (requestedId) {
      const existing = this.byId.get(requestedId);
      if (existing) {
        if (!options.replace) {
          throw new Error(`Layer id is already registered: ${requestedId}`);
        }
        this.remove(existing);
      }
    }

    const {replace: _replace, ...configuration} = options;
    configureLayer(layer, configuration);
    this.collection.push(layer);
    return layer;
  }

  /** Remove a layer by object or id. */
  public remove(layerOrId: BaseLayer | string): BaseLayer | undefined {
    this.assertActive();
    const layer = this.resolve(layerOrId);
    return layer ? this.collection.remove(layer) : undefined;
  }

  /** Remove all layers, optionally restricted by layer kind. */
  public clear(kind?: LayerKind): void {
    this.assertActive();
    const layers = kind === undefined ? this.all() : this.all().filter(layer => this.kind(layer) === kind);
    for (const layer of layers) this.collection.remove(layer);
  }

  /** Return a managed layer by id. */
  public get<TLayer extends BaseLayer = BaseLayer>(id: string): TLayer | undefined {
    return this.byId.get(id) as TLayer | undefined;
  }

  /** Return a managed layer by id or throw. */
  public require<TLayer extends BaseLayer = BaseLayer>(id: string): TLayer {
    const layer = this.get<TLayer>(id);
    if (!layer) throw new Error(`Layer is not registered: ${id}`);
    return layer;
  }

  /** Return whether a layer object or id is present. */
  public has(layerOrId: BaseLayer | string): boolean {
    return this.resolve(layerOrId) !== undefined;
  }

  /** Return all layers in render order from bottom to top. */
  public all(): BaseLayer[] {
    return [...this.collection.getArray()];
  }

  /** Return all registered layer ids in render order. */
  public ids(): string[] {
    return this.all().map(layer => this.id(layer));
  }

  /** Return the number of layers. */
  public count(): number {
    return this.collection.getLength();
  }

  /** Return all basemap layers. */
  public basemaps(): BaseLayer[] {
    return this.all().filter(layer => this.kind(layer) === 'basemap');
  }

  /** Return all non-basemap layers. */
  public overlays(): BaseLayer[] {
    return this.all().filter(layer => this.kind(layer) === 'overlay');
  }

  /** Return the stable id assigned to a layer. */
  public id(layer: BaseLayer): string {
    const id = this.idsByLayer.get(layer);
    if (!id) throw new Error('Layer is not managed by this map.');
    return id;
  }

  /** Return a snapshot of one layer. */
  public info(layerOrId: BaseLayer | string): LayerInfo {
    const layer = this.requireLayer(layerOrId);
    const metadata = this.metadata(layer);
    return {
      ...metadata,
      layer,
      index: this.collection.getArray().indexOf(layer),
      visible: layer.getVisible(),
      opacity: layer.getOpacity(),
      zIndex: layer.getZIndex(),
    };
  }

  /** Update layer metadata and common state. */
  public update<TLayer extends BaseLayer>(layerOrId: TLayer | string, options: LayerOptions): TLayer {
    this.assertActive();
    const layer = this.requireLayer(layerOrId) as TLayer;
    const previousId = this.id(layer);
    const nextId = options.id === undefined ? previousId : normalizeId(options.id);
    if (!nextId) throw new TypeError('Layer id must be a non-empty string.');

    const conflicting = this.byId.get(nextId);
    if (conflicting && conflicting !== layer) {
      if (!options.replace) throw new Error(`Layer id is already registered: ${nextId}`);
      this.remove(conflicting);
    }

    const {replace: _replace, ...configuration} = options;
    this.updating.add(layer);
    try {
      configureLayer(layer, configuration);
      if (nextId !== previousId) {
        this.byId.delete(previousId);
        this.byId.set(nextId, layer);
        this.idsByLayer.set(layer, nextId);
      }
    } finally {
      this.updating.delete(layer);
    }

    this.events.emit('metadata', {layer, metadata: this.metadata(layer)});
    this.reconcileBasemap(layer);
    return layer;
  }

  /** Show a layer. */
  public show(layerOrId: BaseLayer | string): BaseLayer {
    return this.setVisible(layerOrId, true);
  }

  /** Hide a layer. */
  public hide(layerOrId: BaseLayer | string): BaseLayer {
    return this.setVisible(layerOrId, false);
  }

  /** Toggle layer visibility and return the new state. */
  public toggle(layerOrId: BaseLayer | string): boolean {
    const layer = this.requireLayer(layerOrId);
    const visible = !layer.getVisible();
    layer.setVisible(visible);
    return visible;
  }

  /** Set layer visibility. */
  public setVisible(layerOrId: BaseLayer | string, visible: boolean): BaseLayer {
    const layer = this.requireLayer(layerOrId);
    layer.setVisible(visible);
    return layer;
  }

  /** Set layer opacity between zero and one. */
  public setOpacity(layerOrId: BaseLayer | string, opacity: number): BaseLayer {
    assertOpacity(opacity);
    const layer = this.requireLayer(layerOrId);
    layer.setOpacity(opacity);
    return layer;
  }

  /** Set the native OpenLayers z-index. */
  public setZIndex(layerOrId: BaseLayer | string, zIndex: number): BaseLayer {
    const layer = this.requireLayer(layerOrId);
    layer.setZIndex(zIndex);
    return layer;
  }

  /** Move a layer to a zero-based collection index. */
  public move(layerOrId: BaseLayer | string, index: number): BaseLayer {
    this.assertActive();
    const layer = this.requireLayer(layerOrId);
    const from = this.collection.getArray().indexOf(layer);
    const to = Math.max(0, Math.min(Math.trunc(index), this.collection.getLength() - 1));
    if (from === to) return layer;

    this.moving = true;
    try {
      this.collection.removeAt(from);
      this.collection.insertAt(to, layer);
    } finally {
      this.moving = false;
    }
    this.events.emit('order', {layer, id: this.id(layer), from, to});
    return layer;
  }

  /** Move a layer to the top of the collection. */
  public bringToFront(layerOrId: BaseLayer | string): BaseLayer {
    return this.move(layerOrId, this.collection.getLength() - 1);
  }

  /** Move a layer to the bottom of the collection. */
  public sendToBack(layerOrId: BaseLayer | string): BaseLayer {
    return this.move(layerOrId, 0);
  }

  /** Activate one basemap and hide all other basemaps. */
  public setBasemap(layerOrId: BaseLayer | string): BaseLayer {
    const layer = this.requireLayer(layerOrId);
    if (this.kind(layer) !== 'basemap') {
      throw new Error(`Layer is not a basemap: ${this.id(layer)}`);
    }
    this.activateBasemap(layer);
    return layer;
  }

  /** Return the currently visible basemap. */
  public getBasemap(): BaseLayer | undefined {
    return this.activeBasemap;
  }

  /** Stop observing the native collection and its layers. */
  public destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    unByKey(this.collectionKeys);
    for (const layer of this.collection.getArray()) this.detach(layer);
    this.byId.clear();
    this.activeBasemap = undefined;
    this.events.off();
  }

  private register(layer: BaseLayer, emit: boolean, index?: number): void {
    let id = getLayerId(layer);
    if (!id) id = this.nextId('layer');
    else if (this.byId.has(id) && this.byId.get(id) !== layer) id = this.nextId(id);

    const kind = readKind(layer);
    layer.set(LAYER_PROPERTY.id, id, true);
    layer.set(LAYER_PROPERTY.kind, kind, true);
    this.byId.set(id, layer);
    this.idsByLayer.set(layer, id);
    this.attach(layer);

    if (emit) {
      this.events.emit('add', {
        layer,
        id,
        index: index ?? this.collection.getArray().indexOf(layer),
      });
    }
    if (kind === 'basemap' && layer.getVisible()) this.activateBasemap(layer);
  }

  private unregister(layer: BaseLayer, emit: boolean, index?: number): void {
    const id = this.idsByLayer.get(layer) ?? getLayerId(layer) ?? 'unknown';
    const wasBasemap = this.activeBasemap === layer;
    this.detach(layer);
    this.idsByLayer.delete(layer);
    if (this.byId.get(id) === layer) this.byId.delete(id);

    if (emit) this.events.emit('remove', {layer, id, index: index ?? -1});
    if (wasBasemap) {
      const previous = this.activeBasemap;
      this.activeBasemap = undefined;
      this.events.emit('basemap', {layer: undefined, previous});
    }
  }

  private attach(layer: BaseLayer): void {
    const keys: EventsKey[] = [
      layer.on('change:visible', () => this.handleVisibility(layer)),
      layer.on('change:opacity', () => {
        this.events.emit('opacity', {layer, id: this.id(layer), opacity: layer.getOpacity()});
      }),
      layer.on('change:zIndex', () => {
        this.events.emit('zIndex', {layer, id: this.id(layer), zIndex: layer.getZIndex()});
      }),
      layer.on('propertychange', event => this.handleMetadataChange(layer, event.key)),
    ];
    this.layerKeys.set(layer, keys);
  }

  private detach(layer: BaseLayer): void {
    const keys = this.layerKeys.get(layer);
    if (keys) unByKey(keys);
    this.layerKeys.delete(layer);
  }

  private handleVisibility(layer: BaseLayer): void {
    const visible = layer.getVisible();
    this.events.emit('visibility', {layer, id: this.id(layer), visible});
    if (this.changingBasemap || this.kind(layer) !== 'basemap') return;

    if (visible) this.activateBasemap(layer);
    else if (this.activeBasemap === layer) {
      const previous = layer;
      this.activeBasemap = undefined;
      this.events.emit('basemap', {layer: undefined, previous});
    }
  }

  private handleMetadataChange(layer: BaseLayer, key: string): void {
    if (this.updating.has(layer) || !isMetadataKey(key)) return;

    if (key === LAYER_PROPERTY.id) {
      const previousId = this.idsByLayer.get(layer);
      const nextId = getLayerId(layer);
      if (!previousId) return;
      if (!nextId || (this.byId.has(nextId) && this.byId.get(nextId) !== layer)) {
        layer.set(LAYER_PROPERTY.id, previousId, true);
        return;
      }
      if (nextId !== previousId) {
        this.byId.delete(previousId);
        this.byId.set(nextId, layer);
        this.idsByLayer.set(layer, nextId);
      }
    }

    this.events.emit('metadata', {layer, metadata: this.metadata(layer)});
    if (key === LAYER_PROPERTY.kind) this.reconcileBasemap(layer);
  }

  private reconcileBasemap(layer: BaseLayer): void {
    if (this.kind(layer) === 'basemap' && layer.getVisible()) {
      this.activateBasemap(layer);
    } else if (this.activeBasemap === layer) {
      const previous = layer;
      this.activeBasemap = undefined;
      this.events.emit('basemap', {layer: undefined, previous});
    }
  }

  private activateBasemap(layer: BaseLayer): void {
    const previous = this.activeBasemap;
    this.changingBasemap = true;
    try {
      for (const candidate of this.basemaps()) {
        candidate.setVisible(candidate === layer);
      }
    } finally {
      this.changingBasemap = false;
    }
    this.activeBasemap = layer;
    if (previous !== layer) this.events.emit('basemap', {layer, previous});
  }

  private normalizeInitialBasemaps(): void {
    const visible = this.basemaps().filter(layer => layer.getVisible());
    const active = visible.at(-1);
    if (!active) return;
    this.changingBasemap = true;
    try {
      for (const layer of visible) layer.setVisible(layer === active);
    } finally {
      this.changingBasemap = false;
    }
    this.activeBasemap = active;
  }

  private metadata(layer: BaseLayer): LayerMetadata {
    return {
      id: this.id(layer),
      title: readString(layer, LAYER_PROPERTY.title),
      kind: this.kind(layer),
      type: readString(layer, LAYER_PROPERTY.type),
      group: readString(layer, LAYER_PROPERTY.group),
      tags: readTags(layer),
    };
  }

  private kind(layer: BaseLayer): LayerKind {
    return readKind(layer);
  }

  private resolve(layerOrId: BaseLayer | string): BaseLayer | undefined {
    if (typeof layerOrId === 'string') return this.byId.get(layerOrId);
    return this.collection.getArray().includes(layerOrId) ? layerOrId : undefined;
  }

  private requireLayer(layerOrId: BaseLayer | string): BaseLayer {
    const layer = this.resolve(layerOrId);
    if (!layer) {
      const label = typeof layerOrId === 'string' ? layerOrId : 'provided object';
      throw new Error(`Layer is not managed by this map: ${label}`);
    }
    return layer;
  }

  private nextId(prefix: string): string {
    const base = normalizeId(prefix) ?? 'layer';
    let id: string;
    do {
      this.sequence += 1;
      id = `${base}-${this.sequence}`;
    } while (this.byId.has(id));
    return id;
  }

  private assertActive(): void {
    if (this.destroyed) throw new Error('Layer collection has been destroyed.');
  }
}

function normalizeId(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const id = value.trim();
  return id.length > 0 ? id : undefined;
}

function readString(layer: BaseLayer, key: string): string | undefined {
  const value = layer.get(key);
  return typeof value === 'string' ? value : undefined;
}

function readKind(layer: BaseLayer): LayerKind {
  return layer.get(LAYER_PROPERTY.kind) === 'basemap' ? 'basemap' : 'overlay';
}

function readTags(layer: BaseLayer): readonly string[] {
  const value = layer.get(LAYER_PROPERTY.tags);
  return Array.isArray(value) ? value.filter(item => typeof item === 'string') : [];
}

function assertOpacity(opacity: number): void {
  if (!Number.isFinite(opacity) || opacity < 0 || opacity > 1) {
    throw new RangeError('Layer opacity must be between 0 and 1.');
  }
}

function isMetadataKey(key: string): boolean {
  return Object.values(LAYER_PROPERTY).includes(key as (typeof LAYER_PROPERTY)[keyof typeof LAYER_PROPERTY]);
}
