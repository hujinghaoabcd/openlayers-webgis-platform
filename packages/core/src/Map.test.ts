import {describe, expect, it, vi} from 'vitest';
import VectorLayer from 'ol/layer/Vector.js';
import {Map} from './Map.js';
import {map} from './factory.js';
import type {Plugin} from './types.js';

describe('Map', () => {
  it('creates an OpenLayers map without a target', async () => {
    const instance = new Map();
    expect(instance.native).toBeDefined();
    expect(instance.isRemoved()).toBe(false);
    await instance.remove();
    expect(instance.isRemoved()).toBe(true);
  });

  it('creates a map with the map factory and target', async () => {
    const target = document.createElement('div');
    document.body.append(target);
    const instance = map(target);

    expect(instance.getTarget()).toBe(target);
    instance.setTarget(undefined);
    expect(instance.getTarget()).toBeUndefined();

    await instance.remove();
    target.remove();
  });

  it('adds and removes a layer through the public map API', async () => {
    const instance = new Map();
    const layer = new VectorLayer();

    expect(instance.addLayer(layer)).toBe(instance);
    expect(instance.native.getLayers().getArray()).toContain(layer);
    expect(instance.removeLayer(layer)).toBe(layer);
    expect(instance.native.getLayers().getArray()).not.toContain(layer);

    await instance.remove();
  });

  it('installs a plugin once and disposes it with the map', async () => {
    const install = vi.fn();
    const dispose = vi.fn();
    const plugin: Plugin = {id: 'test-plugin', install, dispose};
    const instance = new Map();

    await instance.use(plugin);
    await instance.use(plugin);
    expect(instance.hasPlugin(plugin.id)).toBe(true);
    expect(install).toHaveBeenCalledTimes(1);

    await instance.remove();
    expect(dispose).toHaveBeenCalledTimes(1);
  });

  it('rejects operations after removal', async () => {
    const instance = new Map();
    await instance.remove();
    expect(() => instance.updateSize()).toThrow('Map has already been removed.');
  });
});
