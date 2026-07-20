import type {EventsKey} from 'ol/events.js';
import {isEmpty, type Extent} from 'ol/extent.js';
import type OlMap from 'ol/Map.js';
import {unByKey} from 'ol/Observable.js';
import type BaseLayer from 'ol/layer/Base.js';
import type Source from 'ol/source/Source.js';
import {Events, type EventListener} from './events.js';
import type {Layers, LayersEventMap} from './Layers.js';

/** State reported by an OpenLayers source. */
export type LayerSourceState = 'undefined' | 'loading' | 'ready' | 'error';

/** High-level loading status maintained for one layer source. */
export type LayerLoadStatus = 'idle' | 'loading' | 'ready' | 'error';

/** Options passed to {@link Sources.fit}. */
export interface LayerFitOptions {
  readonly size?: readonly [number, number];
  readonly padding?: readonly number[];
  readonly nearest?: boolean;
  readonly minResolution?: number;
  readonly maxZoom?: number;
  readonly duration?: number;
  readonly easing?: (fraction: number) => number;
  readonly callback?: (completed: boolean) => void;
}

/** Runtime source state for one managed layer. */
export interface LayerSourceInfo {
  readonly id: string;
  readonly layer: BaseLayer;
  readonly source: Source | null;
  readonly sourceState: LayerSourceState;
  readonly loadStatus: LayerLoadStatus;
  readonly pending: number;
  readonly error: unknown;
}

/** Events emitted while layer sources change or load data. */
export interface SourcesEventMap {
  source: {
    readonly id: string;
    readonly layer: BaseLayer;
    readonly source: Source | null;
    readonly previous: Source | null;
  };
  state: {
    readonly id: string;
    readonly layer: BaseLayer;
    readonly source: Source | null;
    readonly state: LayerSourceState;
    readonly previous: LayerSourceState;
  };
  loadstart: {
    readonly id: string;
    readonly layer: BaseLayer;
    readonly source: Source;
    readonly pending: number;
    readonly event: unknown;
  };
  loadend: {
    readonly id: string;
    readonly layer: BaseLayer;
    readonly source: Source;
    readonly pending: number;
    readonly event: unknown;
  };
  loaderror: {
    readonly id: string;
    readonly layer: BaseLayer;
    readonly source: Source;
    readonly pending: number;
    readonly error: unknown;
    readonly event: unknown;
  };
}

interface SourceRuntime {
  sourceState: LayerSourceState;
  loadStatus: LayerLoadStatus;
  pending: number;
  error: unknown;
}

interface ObservableTarget {
  on(type: string, listener: (event: unknown) => void): EventsKey;
}

interface ExtentSource {
  getExtent(): Extent | undefined;
}

const LOAD_START_EVENTS = ['tileloadstart', 'imageloadstart', 'featuresloadstart'] as const;
const LOAD_END_EVENTS = ['tileloadend', 'imageloadend', 'featuresloadend'] as const;
const LOAD_ERROR_EVENTS = ['tileloaderror', 'imageloaderror', 'featuresloaderror'] as const;

/**
 * Observes sources owned by managed layers.
 *
 * Native OpenLayers sources remain directly accessible. OMap adds consistent
 * source state, loading events, extent lookup, refresh and view fitting.
 */
export class Sources {
  private readonly events = new Events<SourcesEventMap>();
  private readonly layerKeys = new WeakMap<BaseLayer, EventsKey[]>();
  private readonly sourceKeys = new WeakMap<BaseLayer, EventsKey[]>();
  private readonly sourceByLayer = new WeakMap<BaseLayer, Source | null>();
  private readonly runtimeByLayer = new WeakMap<BaseLayer, SourceRuntime>();
  private destroyed = false;

  private readonly onLayerAdd = ({layer}: LayersEventMap['add']): void => {
    this.attach(layer);
  };

  private readonly onLayerRemove = ({layer}: LayersEventMap['remove']): void => {
    this.detach(layer);
  };

  public constructor(
    private readonly map: OlMap,
    private readonly layers: Layers,
  ) {
    for (const layer of layers.all()) this.attach(layer);
    layers.on('add', this.onLayerAdd);
    layers.on('remove', this.onLayerRemove);
  }

  /** Register a typed source listener. */
  public on<K extends keyof SourcesEventMap>(
    type: K,
    listener: EventListener<SourcesEventMap[K]>,
  ): this {
    this.events.on(type, listener);
    return this;
  }

  /** Register a typed source listener that runs once. */
  public once<K extends keyof SourcesEventMap>(
    type: K,
    listener: EventListener<SourcesEventMap[K]>,
  ): this {
    this.events.once(type, listener);
    return this;
  }

  /** Remove source listeners. */
  public off(): this;
  public off<K extends keyof SourcesEventMap>(type: K): this;
  public off<K extends keyof SourcesEventMap>(
    type: K,
    listener: EventListener<SourcesEventMap[K]>,
  ): this;
  public off<K extends keyof SourcesEventMap>(
    type?: K,
    listener?: EventListener<SourcesEventMap[K]>,
  ): this {
    if (type === undefined) this.events.off();
    else if (listener === undefined) this.events.off(type);
    else this.events.off(type, listener);
    return this;
  }

  /** Return the current source for a layer, or null for source-less layers. */
  public get(layerOrId: BaseLayer | string): Source | null {
    const layer = this.requireLayer(layerOrId);
    return this.sourceByLayer.get(layer) ?? readSource(layer);
  }

  /** Return a runtime snapshot for a layer source. */
  public info(layerOrId: BaseLayer | string): LayerSourceInfo {
    const layer = this.requireLayer(layerOrId);
    const runtime = this.runtimeByLayer.get(layer) ?? createRuntime(readSource(layer));
    return {
      id: this.layers.id(layer),
      layer,
      source: this.get(layer),
      sourceState: runtime.sourceState,
      loadStatus: runtime.loadStatus,
      pending: runtime.pending,
      error: runtime.error,
    };
  }

  /** Return the native source state for a managed layer. */
  public state(layerOrId: BaseLayer | string): LayerSourceState {
    return this.info(layerOrId).sourceState;
  }

  /** Return the high-level loading status for a managed layer. */
  public status(layerOrId: BaseLayer | string): LayerLoadStatus {
    return this.info(layerOrId).loadStatus;
  }

  /** Return the best known extent from the layer or its source. */
  public extent(layerOrId: BaseLayer | string): Extent | undefined {
    const layer = this.requireLayer(layerOrId);
    const layerExtent = layer.getExtent();
    if (isUsableExtent(layerExtent)) return [...layerExtent] as Extent;

    const source = this.get(layer);
    if (source && hasExtent(source)) {
      const sourceExtent = source.getExtent();
      if (isUsableExtent(sourceExtent)) return [...sourceExtent] as Extent;
    }
    return undefined;
  }

  /** Fit the map view to a layer or source extent. */
  public fit(layerOrId: BaseLayer | string, options: LayerFitOptions = {}): Extent {
    this.assertActive();
    const extent = this.extent(layerOrId);
    if (!extent) {
      const id = typeof layerOrId === 'string' ? layerOrId : this.layers.id(layerOrId);
      throw new Error(`Layer extent is not available: ${id}`);
    }

    const size = options.size ?? this.map.getSize();
    const fitOptions = size === undefined ? {...options} : {...options, size};
    this.map.getView().fit(extent, fitOptions);
    return extent;
  }

  /** Refresh a layer source using the native OpenLayers refresh method. */
  public refresh(layerOrId: BaseLayer | string): Source {
    this.assertActive();
    const source = this.get(layerOrId);
    if (!source) {
      const id = typeof layerOrId === 'string' ? layerOrId : this.layers.id(layerOrId);
      throw new Error(`Layer does not have a source: ${id}`);
    }
    source.refresh();
    return source;
  }

  /** Stop observing all managed layer sources. */
  public destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.layers.off('add', this.onLayerAdd);
    this.layers.off('remove', this.onLayerRemove);
    for (const layer of this.layers.all()) this.detach(layer);
    this.events.off();
  }

  private attach(layer: BaseLayer): void {
    if (this.destroyed) return;
    const observable = layer as unknown as ObservableTarget;
    const keys = [
      observable.on('change:source', () => {
        this.attachSource(layer, true);
      }),
    ];
    this.layerKeys.set(layer, keys);
    this.attachSource(layer, false);
  }

  private detach(layer: BaseLayer): void {
    const layerKeys = this.layerKeys.get(layer);
    if (layerKeys) unByKey(layerKeys);
    this.layerKeys.delete(layer);
    this.detachSource(layer);
    this.sourceByLayer.delete(layer);
    this.runtimeByLayer.delete(layer);
  }

  private attachSource(layer: BaseLayer, emit: boolean): void {
    const previous = this.sourceByLayer.get(layer) ?? null;
    this.detachSource(layer);

    const source = readSource(layer);
    this.sourceByLayer.set(layer, source);
    this.runtimeByLayer.set(layer, createRuntime(source));

    if (source) {
      const observable = source as unknown as ObservableTarget;
      const keys: EventsKey[] = [
        observable.on('change', () => this.handleSourceChange(layer, source)),
      ];
      for (const type of LOAD_START_EVENTS) {
        keys.push(observable.on(type, event => this.handleLoadStart(layer, source, event)));
      }
      for (const type of LOAD_END_EVENTS) {
        keys.push(observable.on(type, event => this.handleLoadEnd(layer, source, event)));
      }
      for (const type of LOAD_ERROR_EVENTS) {
        keys.push(observable.on(type, event => this.handleLoadError(layer, source, event)));
      }
      this.sourceKeys.set(layer, keys);
    }

    if (emit && previous !== source) {
      this.events.emit('source', {
        id: this.layers.id(layer),
        layer,
        source,
        previous,
      });
    }
  }

  private detachSource(layer: BaseLayer): void {
    const keys = this.sourceKeys.get(layer);
    if (keys) unByKey(keys);
    this.sourceKeys.delete(layer);
  }

  private handleSourceChange(layer: BaseLayer, source: Source): void {
    if (this.sourceByLayer.get(layer) !== source) return;
    const runtime = this.requireRuntime(layer);
    const state = readState(source);
    if (state === runtime.sourceState) return;

    const previous = runtime.sourceState;
    runtime.sourceState = state;
    if (state === 'loading') runtime.loadStatus = 'loading';
    else if (state === 'error') runtime.loadStatus = 'error';
    else if (runtime.pending === 0) runtime.loadStatus = state === 'ready' ? 'ready' : 'idle';

    this.events.emit('state', {
      id: this.layers.id(layer),
      layer,
      source,
      state,
      previous,
    });
  }

  private handleLoadStart(layer: BaseLayer, source: Source, event: unknown): void {
    if (this.sourceByLayer.get(layer) !== source) return;
    const runtime = this.requireRuntime(layer);
    runtime.pending += 1;
    runtime.loadStatus = 'loading';
    runtime.error = undefined;
    this.events.emit('loadstart', {
      id: this.layers.id(layer),
      layer,
      source,
      pending: runtime.pending,
      event,
    });
  }

  private handleLoadEnd(layer: BaseLayer, source: Source, event: unknown): void {
    if (this.sourceByLayer.get(layer) !== source) return;
    const runtime = this.requireRuntime(layer);
    runtime.pending = Math.max(0, runtime.pending - 1);
    runtime.loadStatus = runtime.pending > 0 ? 'loading' : 'ready';
    this.events.emit('loadend', {
      id: this.layers.id(layer),
      layer,
      source,
      pending: runtime.pending,
      event,
    });
  }

  private handleLoadError(layer: BaseLayer, source: Source, event: unknown): void {
    if (this.sourceByLayer.get(layer) !== source) return;
    const runtime = this.requireRuntime(layer);
    runtime.pending = Math.max(0, runtime.pending - 1);
    runtime.loadStatus = 'error';
    runtime.error = readError(event);
    this.events.emit('loaderror', {
      id: this.layers.id(layer),
      layer,
      source,
      pending: runtime.pending,
      error: runtime.error,
      event,
    });
  }

  private requireRuntime(layer: BaseLayer): SourceRuntime {
    const runtime = this.runtimeByLayer.get(layer);
    if (!runtime) throw new Error('Layer source is not being observed.');
    return runtime;
  }

  private requireLayer(layerOrId: BaseLayer | string): BaseLayer {
    if (typeof layerOrId === 'string') return this.layers.require(layerOrId);
    if (!this.layers.has(layerOrId)) throw new Error('Layer is not managed by this map.');
    return layerOrId;
  }

  private assertActive(): void {
    if (this.destroyed) throw new Error('Layer sources have been destroyed.');
  }
}

function readSource(layer: BaseLayer): Source | null {
  const candidate = layer as unknown as {getSource?: () => Source | null};
  return typeof candidate.getSource === 'function' ? candidate.getSource() : null;
}

function readState(source: Source | null): LayerSourceState {
  if (!source) return 'undefined';
  const state = source.getState();
  return state === 'loading' || state === 'ready' || state === 'error' ? state : 'undefined';
}

function createRuntime(source: Source | null): SourceRuntime {
  const sourceState = readState(source);
  return {
    sourceState,
    loadStatus:
      sourceState === 'loading'
        ? 'loading'
        : sourceState === 'error'
          ? 'error'
          : sourceState === 'ready'
            ? 'ready'
            : 'idle',
    pending: 0,
    error: undefined,
  };
}

function hasExtent(source: Source): source is Source & ExtentSource {
  return typeof (source as unknown as ExtentSource).getExtent === 'function';
}

function isUsableExtent(extent: Extent | undefined): extent is Extent {
  return extent !== undefined && extent.every(Number.isFinite) && !isEmpty(extent);
}

function readError(event: unknown): unknown {
  if (typeof event === 'object' && event !== null && 'error' in event) {
    return (event as {error: unknown}).error;
  }
  return event;
}
