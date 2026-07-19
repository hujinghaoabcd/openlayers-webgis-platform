import OlMap from 'ol/Map.js';
import View from 'ol/View.js';
import {defaults as defaultControls} from 'ol/control/defaults.js';
import {defaults as defaultInteractions} from 'ol/interaction/defaults.js';
import type {
  MapTarget,
  OrbiLayerContext,
  OrbiLayerPlugin,
  OrbiMap,
  OrbiMapOptions,
} from './types.js';

/**
 * Small lifecycle and plugin facade around an OpenLayers map.
 *
 * OpenLayers remains directly accessible through `app.map`; the SDK does not
 * hide the native API or replace OpenLayers classes.
 */
export class OrbiMapApp implements OrbiMap {
  public readonly map: OlMap;

  private readonly plugins = new globalThis.Map<string, OrbiLayerPlugin>();
  private disposed = false;

  public constructor(options: OrbiMapOptions = {}) {
    this.map = new OlMap({
      ...(options.target !== undefined ? {target: options.target} : {}),
      view: options.view ?? new View({center: [0, 0], zoom: 2}),
      layers: options.layers ?? [],
      controls: options.controls ?? defaultControls().getArray(),
      interactions: options.interactions ?? defaultInteractions().getArray(),
    });
  }

  public mount(target: MapTarget): void {
    this.assertActive();
    this.map.setTarget(target);
    this.map.updateSize();
  }

  public unmount(): void {
    if (!this.disposed) {
      this.map.setTarget(undefined);
    }
  }

  public async use(plugin: OrbiLayerPlugin): Promise<this> {
    this.assertActive();
    if (this.plugins.has(plugin.name)) {
      return this;
    }

    const context = this.createContext();
    await plugin.install(context);
    this.plugins.set(plugin.name, plugin);
    return this;
  }

  public async dispose(): Promise<void> {
    if (this.disposed) {
      return;
    }

    const context = this.createContext();
    for (const plugin of [...this.plugins.values()].reverse()) {
      await plugin.dispose?.(context);
    }
    this.plugins.clear();
    this.map.setTarget(undefined);
    this.map.dispose();
    this.disposed = true;
  }

  private createContext(): OrbiLayerContext {
    return {map: this.map, app: this};
  }

  private assertActive(): void {
    if (this.disposed) {
      throw new Error('OrbiMapApp has already been disposed.');
    }
  }
}
