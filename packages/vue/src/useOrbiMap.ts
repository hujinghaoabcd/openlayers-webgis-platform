import {shallowReadonly, shallowRef, type ShallowRef} from 'vue';
import type {OrbiMapApp} from '@orbilayer/core';

export interface OrbiMapBinding {
  readonly app: Readonly<ShallowRef<OrbiMapApp | undefined>>;
  bind(instance: OrbiMapApp): void;
  clear(): void;
}

export function useOrbiMap(): OrbiMapBinding {
  const app = shallowRef<OrbiMapApp>();
  return {
    app: shallowReadonly(app),
    bind(instance) {
      app.value = instance;
    },
    clear() {
      app.value = undefined;
    },
  };
}
