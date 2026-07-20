import VectorLayer from 'ol/layer/Vector.js';
import {describe, expect, it, vi} from 'vitest';
import {Map} from './Map.js';

describe('Layers', () => {
  it('assigns stable ids and supports lookup and removal by id', async () => {
    const map = new Map();
    const layer = new VectorLayer();

    map.addLayer(layer);
    const id = map.layers.info(layer).id;

    expect(id).toMatch(/^layer-/);
    expect(map.getLayer(id)).toBe(layer);
    expect(map.hasLayer(id)).toBe(true);
    expect(map.removeLayer(id)).toBe(layer);
    expect(map.hasLayer(id)).toBe(false);

    await map.remove();
  });

  it('rejects duplicate ids unless replacement is explicit', async () => {
    const map = new Map();
    const first = new VectorLayer();
    const second = new VectorLayer();

    map.addLayer(first, {id: 'roads'});
    expect(() => map.addLayer(second, {id: 'roads'})).toThrow(
      'Layer id is already registered: roads',
    );

    map.addLayer(second, {id: 'roads', replace: true});
    expect(map.getLayer('roads')).toBe(second);
    expect(map.hasLayer(first)).toBe(false);

    await map.remove();
  });

  it('emits state changes and validates opacity', async () => {
    const map = new Map();
    const layer = new VectorLayer();
    const visibility = vi.fn();
    const opacity = vi.fn();

    map.addLayer(layer, {id: 'traffic'});
    map.on('layer:visibility', visibility).on('layer:opacity', opacity);
    map.hideLayer('traffic').setLayerOpacity('traffic', 0.4);

    expect(layer.getVisible()).toBe(false);
    expect(layer.getOpacity()).toBe(0.4);
    expect(visibility).toHaveBeenCalledWith({layer, id: 'traffic', visible: false});
    expect(opacity).toHaveBeenCalledWith({layer, id: 'traffic', opacity: 0.4});
    expect(() => map.setLayerOpacity('traffic', 2)).toThrow(
      'Layer opacity must be between 0 and 1.',
    );

    await map.remove();
  });

  it('keeps one visible basemap at a time', async () => {
    const first = new VectorLayer({visible: true});
    const second = new VectorLayer({visible: false});
    const map = new Map({layers: [first, second]});

    map.layers.update(first, {id: 'light', kind: 'basemap'});
    map.layers.update(second, {id: 'dark', kind: 'basemap'});
    map.setBasemap('dark');

    expect(first.getVisible()).toBe(false);
    expect(second.getVisible()).toBe(true);
    expect(map.layers.getBasemap()).toBe(second);

    map.showLayer('light');
    expect(first.getVisible()).toBe(true);
    expect(second.getVisible()).toBe(false);
    expect(map.layers.getBasemap()).toBe(first);

    await map.remove();
  });

  it('moves layers without emitting remove and add events', async () => {
    const map = new Map();
    const first = new VectorLayer();
    const second = new VectorLayer();
    const added = vi.fn();
    const removed = vi.fn();
    const ordered = vi.fn();

    map.addLayer(first, {id: 'first'}).addLayer(second, {id: 'second'});
    map.on('layer:add', added).on('layer:remove', removed).on('layer:order', ordered);
    map.layers.sendToBack('second');

    expect(map.layers.ids()).toEqual(['second', 'first']);
    expect(added).not.toHaveBeenCalled();
    expect(removed).not.toHaveBeenCalled();
    expect(ordered).toHaveBeenCalledWith({
      layer: second,
      id: 'second',
      from: 1,
      to: 0,
    });

    await map.remove();
  });
});
