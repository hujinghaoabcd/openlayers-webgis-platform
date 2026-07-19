import OlMap from 'ol/Map.js';
import View from 'ol/View.js';
import type Control from 'ol/control/Control.js';
import {defaults as defaultControls} from 'ol/control/defaults.js';
import type Interaction from 'ol/interaction/Interaction.js';
import {defaults as defaultInteractions} from 'ol/interaction/defaults.js';
import type BaseLayer from 'ol/layer/Base.js';
import type Overlay from 'ol/Overlay.js';
import type {MapOptions, MapTarget, Plugin, PluginContext} from './types.js';

/**
 * The primary OMap map object.
 *
 * OMap adds a small lifecycle and plugin layer while keeping the underlying
 * OpenLayers map available through {@link native}.
 */
export class Map {
  /** The underlying OpenLayers map. */
  public readonly native: OlMap;

  private readonly plugins = new globalThis.Map<string, Plugin>();
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
  }

  /** Set or clear the map target. */
  public setTarget(target?: MapTarget): this {
    this.assertActive();
    this.native.setTarget(target);
    if (target !== undefined) {
      this.native.updateSize();
    }
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
    this.native.setView(view);
    return this;
  }

  /** Add a layer to the map. */
  public addLayer(layer: BaseLayer): this {
    this.assertActive();
    this.native.addLayer(layer);
    return this;
  }

  /** Remove a layer from the map. */
  public removeLayer(layer: BaseLayer): BaseLayer | undefined {
    this.assertActive();
    return this.native.removeLayer(layer);
  }

  /** Add a control to the map. */
  public addControl(control: Control): this {
    this.assertActive();
    this.native.addControl(control);
    return this;
  }

  /** Remove a control from the map. */
  public removeControl(control: Control): Control | undefined {
    this.assertActive();
    return this.native.removeControl(control);
  }

  /** Add an interaction to the map. */
  public addInteraction(interaction: Interaction): this {
    this.assertActive();
    this.native.addInteraction(interaction);
    return this;
  }

  /** Remove an interaction from the map. */
  public removeInteraction(interaction: Interaction): Interaction | undefined {
    this.assertActive();
    return this.native.removeInteraction(interaction);
  }

  /** Add an overlay to the map. */
  public addOverlay(overlay: Overlay): this {
    this.assertActive();
    this.native.addOverlay(overlay);
    return this;
  }

  /** Remove an overlay from the map. */
  public removeOverlay(overlay: Overlay): Overlay | undefined {
    this.assertActive();
    return this.native.removeOverlay(overlay);
  }

  /** Install a plugin once. */
  public async use(plugin: Plugin): Promise<this> {
    this.assertActive();
    if (this.plugins.has(plugin.id)) {
      return this;
    }

    await plugin.install(this.createPluginContext());
    this.plugins.set(plugin.id, plugin);
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

  /** Remove the map and release plugins and OpenLayers resources. */
  public async remove(): Promise<void> {
    if (this.removed) {
      return;
    }

    const context = this.createPluginContext();
    for (const plugin of [...this.plugins.values()].reverse()) {
      await plugin.dispose?.(context);
    }

    this.plugins.clear();
    this.native.setTarget(undefined);
    this.native.dispose();
    this.removed = true;
  }

  /** Return whether the map has been removed. */
  public isRemoved(): boolean {
    return this.removed;
  }

  private createPluginContext(): PluginContext {
    return {map: this, native: this.native};
  }

  private assertActive(): void {
    if (this.removed) {
      throw new Error('Map has already been removed.');
    }
  }
}
