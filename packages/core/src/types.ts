import type OlMap from 'ol/Map.js';
import type View from 'ol/View.js';
import type Control from 'ol/control/Control.js';
import type Interaction from 'ol/interaction/Interaction.js';
import type BaseLayer from 'ol/layer/Base.js';
import type Overlay from 'ol/Overlay.js';
import type {Map as OMap} from './Map.js';

/** A DOM element or element id accepted as a map target. */
export type MapTarget = string | HTMLElement;

/** Options used to create an OMap map. */
export interface MapOptions {
  target?: MapTarget;
  view?: View;
  layers?: BaseLayer[];
  controls?: Control[];
  interactions?: Interaction[];
  overlays?: Overlay[];
}

/** Runtime values exposed to an OMap plugin. */
export interface PluginContext {
  /** OMap's public map instance. */
  readonly map: OMap;
  /** The underlying OpenLayers map. */
  readonly native: OlMap;
}

/** Extension contract for reusable OMap functionality. */
export interface Plugin {
  /** Unique plugin identifier. */
  readonly id: string;
  /** Install the plugin once for the target map. */
  install(context: PluginContext): void | Promise<void>;
  /** Release resources created by the plugin. */
  dispose?(context: PluginContext): void | Promise<void>;
}
