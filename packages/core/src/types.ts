import type OlMap from 'ol/Map.js';
import type View from 'ol/View.js';
import type Control from 'ol/control/Control.js';
import type Interaction from 'ol/interaction/Interaction.js';
import type BaseLayer from 'ol/layer/Base.js';
import type Overlay from 'ol/Overlay.js';
import type {ControlsEventMap} from './Controls.js';
import type {HistoryEventMap, HistoryOptions} from './History.js';
import type {InteractionsEventMap} from './Interactions.js';
import type {LayersEventMap} from './Layers.js';
import type {Map as OMap} from './Map.js';
import type {OverlaysEventMap} from './Overlays.js';
import type {Registry} from './Registry.js';
import type {Scope} from './Scope.js';
import type {SourcesEventMap} from './Sources.js';

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
  history?: HistoryOptions;
}

/** Built-in events emitted by an OMap map. */
export interface MapEventMap {
  'target:change': {readonly target: MapTarget | undefined};
  'view:change': {readonly view: View; readonly previous: View};
  'layer:add': {readonly layer: BaseLayer};
  'layer:remove': {readonly layer: BaseLayer};
  'layer:visibility': LayersEventMap['visibility'];
  'layer:opacity': LayersEventMap['opacity'];
  'layer:zIndex': LayersEventMap['zIndex'];
  'layer:order': LayersEventMap['order'];
  'layer:metadata': LayersEventMap['metadata'];
  'layer:source': SourcesEventMap['source'];
  'layer:source-state': SourcesEventMap['state'];
  'layer:loadstart': SourcesEventMap['loadstart'];
  'layer:loadend': SourcesEventMap['loadend'];
  'layer:loaderror': SourcesEventMap['loaderror'];
  'basemap:change': LayersEventMap['basemap'];
  'control:add': ControlsEventMap['add'];
  'control:remove': ControlsEventMap['remove'];
  'control:enabled': ControlsEventMap['enabled'];
  'control:order': ControlsEventMap['order'];
  'control:metadata': ControlsEventMap['metadata'];
  'interaction:add': InteractionsEventMap['add'];
  'interaction:remove': InteractionsEventMap['remove'];
  'interaction:active': InteractionsEventMap['active'];
  'interaction:order': InteractionsEventMap['order'];
  'interaction:metadata': InteractionsEventMap['metadata'];
  'history:execute': HistoryEventMap['execute'];
  'history:record': HistoryEventMap['record'];
  'history:undo': HistoryEventMap['undo'];
  'history:redo': HistoryEventMap['redo'];
  'history:clear': HistoryEventMap['clear'];
  'history:change': HistoryEventMap['change'];
  'history:error': HistoryEventMap['error'];
  'overlay:add': OverlaysEventMap['add'];
  'overlay:remove': OverlaysEventMap['remove'];
  'overlay:visible': OverlaysEventMap['visible'];
  'overlay:position': OverlaysEventMap['position'];
  'overlay:offset': OverlaysEventMap['offset'];
  'overlay:positioning': OverlaysEventMap['positioning'];
  'overlay:element': OverlaysEventMap['element'];
  'overlay:order': OverlaysEventMap['order'];
  'overlay:metadata': OverlaysEventMap['metadata'];
  'plugin:install': {readonly plugin: Plugin};
  'plugin:dispose': {readonly plugin: Plugin};
  'scope:create': {readonly scope: Scope};
  'scope:dispose': {readonly scope: Scope};
  remove: {readonly map: OMap};
}

/** Runtime values exposed to an OMap plugin. */
export interface PluginContext {
  readonly map: OMap;
  readonly native: OlMap;
  readonly scope: Scope;
  readonly registry: Registry;
}

/** Extension contract for reusable OMap functionality. */
export interface Plugin {
  readonly id: string;
  install(context: PluginContext): void | Promise<void>;
  dispose?(context: PluginContext): void | Promise<void>;
}
