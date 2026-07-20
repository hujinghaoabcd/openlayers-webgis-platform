import {describe, expect, it, vi} from 'vitest';
import VectorLayer from 'ol/layer/Vector.js';
import {Map} from './Map.js';

describe('Scope', () => {
  it('runs cleanup callbacks in reverse order once', async () => {
    const map = new Map();
    const order: number[] = [];
    const scope = map.scope('test');

    scope.add(() => order.push(1));
    scope.add(async () => {
      order.push(2);
    });

    await scope.dispose();
    await scope.dispose();
    expect(order).toEqual([2, 1]);
    expect(scope.isDisposed()).toBe(true);
    await map.remove();
  });

  it('owns map resources and typed event listeners', async () => {
    const map = new Map();
    const scope = map.scope('layers');
    const listener = vi.fn();
    scope.on(map, 'layer:remove', listener);
    const layer = scope.addLayer(new VectorLayer());
    expect(map.native.getLayers().getArray()).toContain(layer);

    await scope.dispose();
    expect(map.native.getLayers().getArray()).not.toContain(layer);
    expect(listener).toHaveBeenCalledWith({layer});

    map.addLayer(new VectorLayer());
    expect(listener).toHaveBeenCalledOnce();
    await map.remove();
  });

  it('is disposed automatically with its map', async () => {
    const map = new Map();
    const cleanup = vi.fn();
    const scope = map.scope();
    scope.add(cleanup);

    await map.remove();
    expect(cleanup).toHaveBeenCalledOnce();
    expect(scope.isDisposed()).toBe(true);
  });
});
