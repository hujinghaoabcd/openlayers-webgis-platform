import {configureLayer} from '@omap/core';
import LayerGroup from 'ol/layer/Group.js';
import type BaseLayer from 'ol/layer/Base.js';
import type {NamedLayerOptions} from './factories.js';

/** Options for a native OpenLayers layer group. */
export interface LayerGroupOptions extends NamedLayerOptions {
  readonly layers?: BaseLayer[];
}

/** Create a native layer group with OMap metadata. */
export function createLayerGroup(options: LayerGroupOptions = {}): LayerGroup {
  const layer = new LayerGroup({layers: options.layers ?? []});
  return configureLayer(layer, {kind: 'overlay', type: 'group', ...options});
}
