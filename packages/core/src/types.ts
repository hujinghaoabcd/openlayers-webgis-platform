import type OlMap from 'ol/Map.js';
import type View from 'ol/View.js';
import type Control from 'ol/control/Control.js';
import type Interaction from 'ol/interaction/Interaction.js';
import type BaseLayer from 'ol/layer/Base.js';
import type Overlay from 'ol/Overlay.js';
import type {Map as OMap} from './Map.js';
import type {Registry} from './Registry.js';
import type {Scope} from './Scope.js';

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

/** Built-in events emitted by an OMap map. */
export interface MapEventMap {
  'target:change': {readonly target: MapTarget | undefined};
  'view:change': {readonly view: View; readonly previous: View};
  'layer:add': {readonly layer: BaseLayer};
  'layer:remove': {readonly layer: BaseLayer};
  'control:add': {readonly control: Control};
  'control:remove': {readonly control: Control};
  'interaction:add': {readonly interaction: Interaction};
  'interaction:remove': {readonly interaction: Interaction};
  'overlay:add': {readonly overlay: Overlay};
  'overlay:remove': {readonly overlay: Overlay};
  'plugin:install': {readonly plugin: Plugin};
  'plugin:dispose': {readonly plugin: Plugin};
  'scope:create': {readonly scope: Scope};
  'scope:dispose': {readonly scope: Scope};
  remove: {readonly map: OMap};
}

/** Runtime values exposed to an OMap plugin. */
export interface PluginContext {
  /** OMap's public map instance. */
  readonly map: OMap;
  /** The underlying OpenLayers map. */
  readonly native: OlMap;
  /** Resources owned by this plugin. */
  readonly scope: Scope;
  /** Shared runtime registry. */
  readonly registry: Registry;
}

/** Extension contract for reusable OMap functionality. */
export interface Plugin {
  /** Unique plugin identifier. */
  readonly id: string;
  /** Install the plugin once for the target map. */
  install(context: PluginContext): void | Promise<void>;
  /** Release resources created by the plugin before its scope is disposed. */
  dispose?(context: PluginContext): void | Promise<void>;
}
