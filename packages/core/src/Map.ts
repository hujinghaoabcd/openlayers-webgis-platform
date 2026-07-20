import OlMap from 'ol/Map.js';
import View from 'ol/View.js';
import type Control from 'ol/control/Control.js';
import {defaults as defaultControls} from 'ol/control/defaults.js';
import type Interaction from 'ol/interaction/Interaction.js';
import {defaults as defaultInteractions} from 'ol/interaction/defaults.js';
import type BaseLayer from 'ol/layer/Base.js';
import type Overlay from 'ol/Overlay.js';
import {Events, type EventListener} from './events.js';
import {Layers, type LayerOptions} from './Layers.js';
import {Registry} from './Registry.js';
import {Scope} from './Scope.js';
import type {MapEventMap, MapOptions, MapTarget, Plugin, PluginContext} from './types.js';

interface InstalledPlugin {
  readonly plugin: Plugin;
  readonly scope: Scope;
}

/**
 * The primary OMap map object.
 *
 * OMap adds a concise lifecycle, events, managed layers, scopes, registry and
 * plugins while keeping the underlying OpenLayers map available through
 * {@link native}.
 */
export class Map {
  /** The underlying OpenLayers map. */
  public readonly native: OlMap;

  /** Managed layer collection backed by the native OpenLayers collection. */
  public readonly layers: Layers;

  /** Shared registry for named factories and runtime capabilities. */
  public readonly registry = new Registry();

  private readonly events = new Events<MapEventMap>();
  private readonly plugins = new globalThis.Map<string, InstalledPlugin>();
  private readonly scopes = new Set<Scope>();
  private removed = false;

  public constructor(options: MapOptions = {}) {
    this.native = new OlMap({
      ...(options.target !== undefined ? {target: options.target} : {}),
      view: options.view ?? new View({center: [0, 0], zoom: 2}),
      layers: options.layers ?? [],
      controls: options.controls ?? defaultControls().getArray(),
      interactions: options.interactions ?? defaultInteractions().getArray(),
      overlays: options.overlays ?? [],
    });
    this.layers = new Layers(this.native);
    this.bindLayerEvents();
  }

  /** Register a typed map event listener. */
  public on<K extends keyof MapEventMap>(type: K, listener: EventListener<MapEventMap[K]>): this {
    this.events.on(type, listener);
    return this;
  }

  /** Register a typed listener that runs once. */
  public once<K extends keyof MapEventMap>(type: K, listener: EventListener<MapEventMap[K]>): this {
    this.events.once(type, listener);
    return this;
  }

  /** Remove map event listeners. */
  public off(): this;
  public off<K extends keyof MapEventMap>(type: K): this;
  public off<K extends keyof MapEventMap>(type: K, listener: EventListener<MapEventMap[K]>): this;
  public off<K extends keyof MapEventMap>(
    type?: K,
    listener?: EventListener<MapEventMap[K]>,
  ): this {
    if (type === undefined) this.events.off();
    else if (listener === undefined) this.events.off(type);
    else this.events.off(type, listener);
    return this;
  }

  /** Create a resource scope that is also disposed with the map. */
  public scope(name?: string): Scope {
    this.assertActive();
    const scope = new Scope(this, name, disposedScope => {
      if (this.scopes.delete(disposedScope)) {
        this.events.emit('scope:dispose', {scope: disposedScope});
      }
    });
    this.scopes.add(scope);
    this.events.emit('scope:create', {scope});
    return scope;
  }

  /** Set or clear the map target. */
  public setTarget(target?: MapTarget): this {
    this.assertActive();
    this.native.setTarget(target);
    if (target !== undefined) this.native.updateSize();
    this.events.emit('target:change', {target});
    return this;
  }

  /** Return the configured target or target element. */
  public getTarget(): string | HTMLElement | undefined {
    return this.native.getTarget();
  }

  /** Return the map view. */
  public getView(): View {
    return this.native.getView();
  }

  /** Replace the map view. */
  public setView(view: View): this {
    this.assertActive();
    const previous = this.native.getView();
    this.native.setView(view);
    this.events.emit('view:change', {view, previous});
    return this;
  }

  /** Add a layer through the managed layer collection. */
  public addLayer(layer: BaseLayer, options: LayerOptions = {}): this {
    this.assertActive();
    this.layers.add(layer, options);
    return this;
  }

  /** Remove a layer by object or stable id. */
  public removeLayer(layerOrId: BaseLayer | string): BaseLayer | undefined {
    this.assertActive();
    return this.layers.remove(layerOrId);
  }

  /** Return a managed layer by stable id. */
  public getLayer<TLayer extends BaseLayer = BaseLayer>(id: string): TLayer | undefined {
    return this.layers.get<TLayer>(id);
  }

  /** Return whether a managed layer id or object exists. */
  public hasLayer(layerOrId: BaseLayer | string): boolean {
    return this.layers.has(layerOrId);
  }

  /** Show a managed layer. */
  public showLayer(layerOrId: BaseLayer | string): this {
    this.layers.show(layerOrId);
    return this;
  }

  /** Hide a managed layer. */
  public hideLayer(layerOrId: BaseLayer | string): this {
    this.layers.hide(layerOrId);
    return this;
  }

  /** Set managed layer opacity. */
  public setLayerOpacity(layerOrId: BaseLayer | string, opacity: number): this {
    this.layers.setOpacity(layerOrId, opacity);
    return this;
  }

  /** Activate one basemap and hide other basemaps. */
  public setBasemap(layerOrId: BaseLayer | string): this {
    this.layers.setBasemap(layerOrId);
    return this;
  }

  /** Add a control to the map. */
  public addControl(control: Control): this {
    this.assertActive();
    this.native.addControl(control);
    this.events.emit('control:add', {control});
    return this;
  }

  /** Remove a control from the map. */
  public removeControl(control: Control): Control | undefined {
    this.assertActive();
    const removed = this.native.removeControl(control);
    if (removed) this.events.emit('control:remove', {control: removed});
    return removed;
  }

  /** Add an interaction to the map. */
  public addInteraction(interaction: Interaction): this {
    this.assertActive();
    this.native.addInteraction(interaction);
    this.events.emit('interaction:add', {interaction});
    return this;
  }

  /** Remove an interaction from the map. */
  public removeInteraction(interaction: Interaction): Interaction | undefined {
    this.assertActive();
    const removed = this.native.removeInteraction(interaction);
    if (removed) this.events.emit('interaction:remove', {interaction: removed});
    return removed;
  }

  /** Add an overlay to the map. */
  public addOverlay(overlay: Overlay): this {
    this.assertActive();
    this.native.addOverlay(overlay);
    this.events.emit('overlay:add', {overlay});
    return this;
  }

  /** Remove an overlay from the map. */
  public removeOverlay(overlay: Overlay): Overlay | undefined {
    this.assertActive();
    const removed = this.native.removeOverlay(overlay);
    if (removed) this.events.emit('overlay:remove', {overlay: removed});
    return removed;
  }

  /** Install a plugin once with automatic rollback on failure. */
  public async use(plugin: Plugin): Promise<this> {
    this.assertActive();
    if (this.plugins.has(plugin.id)) return this;

    const scope = this.scope(`plugin:${plugin.id}`);
    const context = this.createPluginContext(scope);
    try {
      await plugin.install(context);
    } catch (installError) {
      try {
        await scope.dispose();
      } catch (cleanupError) {
        throw new AggregateError(
          [installError, cleanupError],
          `Plugin installation and rollback failed: ${plugin.id}`,
        );
      }
      throw installError;
    }

    this.plugins.set(plugin.id, {plugin, scope});
    this.events.emit('plugin:install', {plugin});
    return this;
  }

  /** Return whether a plugin is installed. */
  public hasPlugin(id: string): boolean {
    return this.plugins.has(id);
  }

  /** Recalculate the viewport size after its container changes. */
  public updateSize(): this {
    this.assertActive();
    this.native.updateSize();
    return this;
  }

  /** Remove the map and release plugins, scopes and OpenLayers resources. */
  public async remove(): Promise<void> {
    if (this.removed) return;

    const errors: unknown[] = [];
    for (const installed of [...this.plugins.values()].reverse()) {
      const context = this.createPluginContext(installed.scope);
      try {
        await installed.plugin.dispose?.(context);
      } catch (error) {
        errors.push(error);
      }
      try {
        await installed.scope.dispose();
      } catch (error) {
        errors.push(error);
      }
      try {
        this.events.emit('plugin:dispose', {plugin: installed.plugin});
      } catch (error) {
        errors.push(error);
      }
    }
    this.plugins.clear();

    for (const scope of [...this.scopes].reverse()) {
      try {
        await scope.dispose();
      } catch (error) {
        errors.push(error);
      }
    }

    this.registry.clear();
    this.layers.destroy();
    this.native.setTarget(undefined);
    this.native.dispose();
    this.removed = true;
    try {
      this.events.emit('remove', {map: this});
    } catch (error) {
      errors.push(error);
    } finally {
      this.events.off();
    }

    if (errors.length > 0) {
      throw new AggregateError(errors, 'Failed to remove all OMap resources cleanly.');
    }
  }

  /** Return whether the map has been removed. */
  public isRemoved(): boolean {
    return this.removed;
  }

  private bindLayerEvents(): void {
    this.layers.on('add', ({layer}) => this.events.emit('layer:add', {layer}));
    this.layers.on('remove', ({layer}) => this.events.emit('layer:remove', {layer}));
    this.layers.on('visibility', event => this.events.emit('layer:visibility', event));
    this.layers.on('opacity', event => this.events.emit('layer:opacity', event));
    this.layers.on('zIndex', event => this.events.emit('layer:zIndex', event));
    this.layers.on('order', event => this.events.emit('layer:order', event));
    this.layers.on('metadata', event => this.events.emit('layer:metadata', event));
    this.layers.on('basemap', event => this.events.emit('basemap:change', event));
  }

  private createPluginContext(scope: Scope): PluginContext {
    return {map: this, native: this.native, scope, registry: this.registry};
  }

  private assertActive(): void {
    if (this.removed) throw new Error('Map has already been removed.');
  }
}
