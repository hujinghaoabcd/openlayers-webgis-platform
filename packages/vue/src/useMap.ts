import {shallowReadonly, shallowRef, type ShallowRef} from 'vue';
import type {Map} from '@omap/core';

export interface MapBinding {
  readonly map: Readonly<ShallowRef<Map | undefined>>;
  bind(instance: Map): void;
  clear(): void;
}

/** Store and expose an OMap map instance in Vue composition code. */
export function useMap(): MapBinding {
  const map = shallowRef<Map>();
  return {
    map: shallowReadonly(map),
    bind(instance) {
      map.value = instance;
    },
    clear() {
      map.value = undefined;
    },
  };
}
