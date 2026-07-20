import {getLayerId} from '@omap/core';
import {describe, expect, it} from 'vitest';
import {createGeoJsonLayer, createOsmLayer, createWmsLayer, createXyzLayer} from './factories.js';

describe('layer factories', () => {
  it('creates an OSM basemap with standard metadata', () => {
    const layer = createOsmLayer();
    expect(getLayerId(layer)).toBe('osm');
    expect(layer.get('title')).toBe('OpenStreetMap');
    expect(layer.get('kind')).toBe('basemap');
    expect(layer.get('type')).toBe('osm');
  });

  it('allows XYZ metadata overrides', () => {
    const layer = createXyzLayer({
      id: 'satellite',
      title: 'Satellite',
      kind: 'overlay',
      url: 'https://example.com/{z}/{x}/{y}.png',
    });
    expect(getLayerId(layer)).toBe('satellite');
    expect(layer.get('kind')).toBe('overlay');
    expect(layer.get('type')).toBe('xyz');
  });

  it('marks WMS and GeoJSON layers as overlays', () => {
    const wms = createWmsLayer({
      id: 'wms',
      url: 'https://example.com/wms',
      params: {LAYERS: 'roads'},
    });
    const geojson = createGeoJsonLayer(
      {type: 'FeatureCollection', features: []},
      {id: 'geojson'},
    );

    expect(wms.get('kind')).toBe('overlay');
    expect(wms.get('type')).toBe('wms');
    expect(geojson.get('kind')).toBe('overlay');
    expect(geojson.get('type')).toBe('geojson');
  });
});
