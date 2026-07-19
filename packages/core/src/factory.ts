import {Map} from './Map.js';
import type {MapOptions, MapTarget} from './types.js';

/** Create a map from an options object. */
export function map(options?: MapOptions): Map;
/** Create a map for a target using optional map options. */
export function map(target: MapTarget, options?: Omit<MapOptions, 'target'>): Map;
export function map(
  targetOrOptions: MapTarget | MapOptions = {},
  options: Omit<MapOptions, 'target'> = {},
): Map {
  if (isMapTarget(targetOrOptions)) {
    return new Map({...options, target: targetOrOptions});
  }
  return new Map(targetOrOptions);
}

function isMapTarget(value: MapTarget | MapOptions): value is MapTarget {
  return (
    typeof value === 'string' ||
    (typeof HTMLElement !== 'undefined' && value instanceof HTMLElement)
  );
}
