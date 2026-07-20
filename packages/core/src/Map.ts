import OlMap from 'ol/Map.js';
import View from 'ol/View.js';
import type Control from 'ol/control/Control.js';
import {defaults as defaultControls} from 'ol/control/defaults.js';
import type Interaction from 'ol/interaction/Interaction.js';
import {defaults as defaultInteractions} from 'ol/interaction/defaults.js';
import type BaseLayer from 'ol/layer/Base.js';
import type Overlay from 'ol/Overlay.js';
import {Controls, type ControlOptions} from './Controls.js';
import {Events, type EventListener} from './events.js';
import {History, type Command} from './History.js';
import {Interactions, type InteractionOptions} from './Interactions.js';
import {Layers, type LayerOptions} from './Layers.js';
import {Registry} from './Registry.js';
import {Scope} from './Scope.js';
import {Sources, type LayerFitOptions} from './Sources.js';
import type {MapEventMap, MapOptions, MapTarget, Plugin, PluginContext} from './types.js';

interface InstalledPlugin {
  readonly plugin: Plugin;
  readonly scope: Scope;
}

/**
 * The primary OMap map object.
 *
 * OMap adds a concise lifecycle, events, managed layers, sources, controls,
 * interactions and history, scopes, registry and plugins while keeping the underlying OpenLayers map
 * available through {@link native}.
 */
export class Map {
  /** The underlying OpenLayers map. */
  public readonly native: OlMap;

  /** Managed layer collection backed by the native OpenLayers collection. */
  public readonly layers: Layers;

  /** Source state and loading utilities for managed layers. */
  public readonly sources: Sources;

  /** Managed control collection backed by the native OpenLayers collection. */
  public readonly controls: Controls;

  /** Managed interaction collection backed by the native OpenLayers collection. */
  public readonly interactions: Interactions;

  /** Reversible command history for editing and application actions. */
  public readonly history: History;

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
    this.sources = new Sources(this.native, this.layers);
    this.controls = new Controls(this.native);
    this.interactions = new Interactions(this.native);
    this.history = new History(options.history);
    this.bindLayerEvents();
    this.bindSourceEvents();
    this.bindControlEvents();
    this.bindInteractionEvents();
    this.bindHistoryEvents();
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

  /** Refresh the native source owned by a managed layer. */
  public refreshLayer(layerOrId: BaseLayer | string): this {
    this.sources.refresh(layerOrId);
    return this;
  }

  /** Fit the map view to the best known layer or source extent. */
  public fitLayer(layerOrId: BaseLayer | string, options: LayerFitOptions = {}): this {
    this.sources.fit(layerOrId, options);
    return this;
  }

  /** Add a control through the managed control collection. */
  public addControl(control: Control, options: ControlOptions = {}): this {
    this.assertActive();
    this.controls.add(control, options);
    return this;
  }

  /** Remove a control by object or stable id. */
  public removeControl(controlOrId: Control | string): Control | undefined {
    this.assertActive();
    return this.controls.remove(controlOrId);
  }

  /** Return a managed control by stable id. */
  public getControl<TControl extends Control = Control>(id: string): TControl | undefined {
    return this.controls.get<TControl>(id);
  }

  /** Return whether a managed control id or object exists. */
  public hasControl(controlOrId: Control | string): boolean {
    return this.controls.has(controlOrId);
  }

  /** Enable and display a managed control. */
  public enableControl(controlOrId: Control | string): this {
    this.controls.enable(controlOrId);
    return this;
  }

  /** Disable and hide a managed control without removing it. */
  public disableControl(controlOrId: Control | string): this {
    this.controls.disable(controlOrId);
    return this;
  }

  /** Add an interaction through the managed interaction collection. */
  public addInteraction(interaction: Interaction, options: InteractionOptions = {}): this {
    this.assertActive();
    this.interactions.add(interaction, options);
    return this;
  }

  /** Remove an interaction by object or stable id. */
  public removeInteraction(interactionOrId: Interaction | string): Interaction | undefined {
    this.assertActive();
    return this.interactions.remove(interactionOrId);
  }

  /** Return a managed interaction by stable id. */
  public getInteraction<TInteraction extends Interaction = Interaction>(
    id: string,
  ): TInteraction | undefined {
    return this.interactions.get<TInteraction>(id);
  }

  /** Return whether a managed interaction id or object exists. */
  public hasInteraction(interactionOrId: Interaction | string): boolean {
    return this.interactions.has(interactionOrId);
  }

  /** Activate a managed interaction and deactivate peers in the same group. */
  public activateInteraction(interactionOrId: Interaction | string): this {
    this.interactions.activate(interactionOrId);
    return this;
  }

  /** Deactivate a managed interaction without removing it. */
  public deactivateInteraction(interactionOrId: Interaction | string): this {
    this.interactions.deactivate(interactionOrId);
    return this;
  }

  /** Execute and record one reversible command. */
  public execute<TResult>(command: Command<TResult>): Promise<TResult> {
    this.assertActive();
    return this.history.execute(command);
  }

  /** Undo the most recent reversible command. */
  public undo(): Promise<boolean> {
    this.assertActive();
    return this.history.undo();
  }

  /** Redo the most recently undone command. */
  public redo(): Promise<boolean> {
    this.assertActive();
    return this.history.redo();
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

    try {
      await this.history.destroy();
    } catch (error) {
      errors.push(error);
    }

    this.registry.clear();
    this.interactions.destroy();
    this.controls.destroy();
    this.sources.destroy();
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

  private bindSourceEvents(): void {
    this.sources.on('source', event => this.events.emit('layer:source', event));
    this.sources.on('state', event => this.events.emit('layer:source-state', event));
    this.sources.on('loadstart', event => this.events.emit('layer:loadstart', event));
    this.sources.on('loadend', event => this.events.emit('layer:loadend', event));
    this.sources.on('loaderror', event => this.events.emit('layer:loaderror', event));
  }

  private bindControlEvents(): void {
    this.controls.on('add', event => this.events.emit('control:add', event));
    this.controls.on('remove', event => this.events.emit('control:remove', event));
    this.controls.on('enabled', event => this.events.emit('control:enabled', event));
    this.controls.on('order', event => this.events.emit('control:order', event));
    this.controls.on('metadata', event => this.events.emit('control:metadata', event));
  }

  private bindInteractionEvents(): void {
    this.interactions.on('add', event => this.events.emit('interaction:add', event));
    this.interactions.on('remove', event => this.events.emit('interaction:remove', event));
    this.interactions.on('active', event => this.events.emit('interaction:active', event));
    this.interactions.on('order', event => this.events.emit('interaction:order', event));
    this.interactions.on('metadata', event => this.events.emit('interaction:metadata', event));
  }

  private bindHistoryEvents(): void {
    this.history.on('execute', event => this.events.emit('history:execute', event));
    this.history.on('record', event => this.events.emit('history:record', event));
    this.history.on('undo', event => this.events.emit('history:undo', event));
    this.history.on('redo', event => this.events.emit('history:redo', event));
    this.history.on('clear', event => this.events.emit('history:clear', event));
    this.history.on('change', event => this.events.emit('history:change', event));
    this.history.on('error', event => this.events.emit('history:error', event));
  }

  private createPluginContext(scope: Scope): PluginContext {
    return {map: this, native: this.native, scope, registry: this.registry};
  }

  private assertActive(): void {
    if (this.removed) throw new Error('Map has already been removed.');
  }
}
