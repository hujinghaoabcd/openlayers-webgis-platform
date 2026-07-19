import {describe, expect, it, vi} from 'vitest';
import {OrbiMapApp} from './OrbiMapApp.js';
import type {OrbiLayerPlugin} from './types.js';

describe('OrbiMapApp', () => {
  it('creates an OpenLayers map without a target', async () => {
    const app = new OrbiMapApp();
    expect(app.map).toBeDefined();
    await app.dispose();
  });

  it('mounts and unmounts a target element', async () => {
    const target = document.createElement('div');
    document.body.append(target);
    const app = new OrbiMapApp();

    app.mount(target);
    expect(app.map.getTargetElement()).toBe(target);

    app.unmount();
    expect(app.map.getTarget()).toBeUndefined();
    await app.dispose();
    target.remove();
  });

  it('installs a plugin once and disposes it with the app', async () => {
    const install = vi.fn();
    const dispose = vi.fn();
    const plugin: OrbiLayerPlugin = {name: 'test-plugin', install, dispose};
    const app = new OrbiMapApp();

    await app.use(plugin);
    await app.use(plugin);
    expect(install).toHaveBeenCalledTimes(1);

    await app.dispose();
    expect(dispose).toHaveBeenCalledTimes(1);
  });
});
