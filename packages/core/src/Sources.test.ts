import Feature from 'ol/Feature.js';
import Point from 'ol/geom/Point.js';
import VectorLayer from 'ol/layer/Vector.js';
import VectorSource from 'ol/source/Vector.js';
import {describe, expect, it, vi} from 'vitest';
import {Map} from './Map.js';

describe('Sources', () => {
  it('reports source state and refreshes native sources', async () => {
    const source = new VectorSource();
    const refresh = vi.spyOn(source, 'refresh');
    const layer = new VectorLayer({source});
    const map = new Map({layers: [layer]});
    map.layers.update(layer, {id: 'roads'});

    const info = map.sources.info('roads');
    expect(info.source).toBe(source);
    expect(info.sourceState).toBe('ready');
    expect(info.loadStatus).toBe('ready');

    map.refreshLayer('roads');
    expect(refresh).toHaveBeenCalledOnce();
    await map.remove();
  });

  it('forwards vector loading events with pending counts', async () => {
    const source = new VectorSource();
    const layer = new VectorLayer({source});
    const map = new Map();
    const started = vi.fn();
    const ended = vi.fn();
    const failed = vi.fn();
    map
      .on('layer:loadstart', started)
      .on('layer:loadend', ended)
      .on('layer:loaderror', failed);
    map.addLayer(layer, {id: 'data'});

    source.dispatchEvent('featuresloadstart');
    expect(map.sources.status('data')).toBe('loading');
    expect(map.sources.info('data').pending).toBe(1);

    source.dispatchEvent('featuresloadend');
    expect(map.sources.status('data')).toBe('ready');
    expect(map.sources.info('data').pending).toBe(0);

    source.dispatchEvent('featuresloadstart');
    source.dispatchEvent('featuresloaderror');
    expect(map.sources.status('data')).toBe('error');
    expect(started).toHaveBeenCalledTimes(2);
    expect(ended).toHaveBeenCalledOnce();
    expect(failed).toHaveBeenCalledOnce();

    await map.remove();
  });

  it('observes source replacement on managed layers', async () => {
    const first = new VectorSource();
    const second = new VectorSource();
    const layer = new VectorLayer({source: first});
    const map = new Map();
    const changed = vi.fn();
    map.addLayer(layer, {id: 'replaceable'});
    map.on('layer:source', changed);

    layer.setSource(second);

    expect(map.sources.get('replaceable')).toBe(second);
    expect(changed).toHaveBeenCalledWith({
      id: 'replaceable',
      layer,
      source: second,
      previous: first,
    });

    await map.remove();
  });

  it('fits the map view to a layer extent', async () => {
    const source = new VectorSource({
      features: [new Feature(new Point([5, 6]))],
    });
    const layer = new VectorLayer({source});
    layer.setExtent([1, 2, 9, 10]);
    const map = new Map();
    const fit = vi.spyOn(map.getView(), 'fit');
    map.addLayer(layer, {id: 'extent'});

    map.fitLayer('extent', {duration: 250, maxZoom: 12});

    expect(fit).toHaveBeenCalledWith(
      [1, 2, 9, 10],
      expect.objectContaining({duration: 250, maxZoom: 12}),
    );
    expect(map.sources.extent('extent')).toEqual([1, 2, 9, 10]);

    await map.remove();
  });

  it('uses vector source extent when the layer has no explicit extent', async () => {
    const source = new VectorSource({
      features: [new Feature(new Point([3, 4]))],
    });
    const layer = new VectorLayer({source});
    const map = new Map();
    map.addLayer(layer, {id: 'point'});

    expect(map.sources.extent('point')).toEqual([3, 4, 3, 4]);

    await map.remove();
  });
});
