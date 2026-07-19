import type Map from 'ol/Map.js';
import type View from 'ol/View.js';
import type BaseLayer from 'ol/layer/Base.js';
import type Control from 'ol/control/Control.js';
import type Interaction from 'ol/interaction/Interaction.js';

export type MapTarget = string | HTMLElement;

export interface OrbiMapOptions {
  target?: MapTarget;
  view?: View;
  layers?: BaseLayer[];
  controls?: Control[];
  interactions?: Interaction[];
}

export interface OrbiLayerContext {
  readonly map: Map;
  readonly app: OrbiMap;
}

export interface OrbiLayerPlugin {
  readonly name: string;
  install(context: OrbiLayerContext): void | Promise<void>;
  dispose?(context: OrbiLayerContext): void | Promise<void>;
}

export interface OrbiMap {
  readonly map: Map;
  mount(target: MapTarget): void;
  unmount(): void;
  use(plugin: OrbiLayerPlugin): Promise<this>;
  dispose(): Promise<void>;
}
