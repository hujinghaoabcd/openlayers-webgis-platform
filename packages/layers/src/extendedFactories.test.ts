import {getLayerId} from '@omap/core';
import Feature from 'ol/Feature.js';
import MVT from 'ol/format/MVT.js';
import Point from 'ol/geom/Point.js';
import LayerGroup from 'ol/layer/Group.js';
import ImageLayer from 'ol/layer/Image.js';
import VectorLayer from 'ol/layer/Vector.js';
import VectorTileLayer from 'ol/layer/VectorTile.js';
import ImageWMS from 'ol/source/ImageWMS.js';
import VectorSource from 'ol/source/Vector.js';
import VectorTileSource from 'ol/source/VectorTile.js';
import WMTS from 'ol/source/WMTS.js';
import WMTSTileGrid from 'ol/tilegrid/WMTS.js';
import {describe, expect, it} from 'vitest';
import {createLayerGroup} from './group.js';
import {createImageWmsLayer, createWmtsLayer} from './raster.js';
import {
  createGpxLayer,
  createKmlLayer,
  createVectorLayer,
  createVectorTileLayer,
  createWktLayer,
} from './vector.js';

describe('extended layer factories', () => {
  it('creates an ImageWMS overlay with native source options', () => {
    const layer = createImageWmsLayer({
      id: 'image-wms',
      source: {
        url: 'https://example.com/wms',
        params: {LAYERS: 'roads'},
      },
    });

    expect(layer).toBeInstanceOf(ImageLayer);
    expect(layer.getSource()).toBeInstanceOf(ImageWMS);
    expect(getLayerId(layer)).toBe('image-wms');
    expect(layer.get('kind')).toBe('overlay');
    expect(layer.get('type')).toBe('image-wms');
  });

  it('creates a WMTS basemap with a native tile grid', () => {
    const layer = createWmtsLayer({
      id: 'wmts',
      source: {
        url: 'https://example.com/wmts',
        layer: 'base',
        matrixSet: 'EPSG:3857',
        format: 'image/png',
        projection: 'EPSG:3857',
        style: 'default',
        tileGrid: new WMTSTileGrid({
          origin: [0, 0],
          resolutions: [1],
          matrixIds: ['0'],
        }),
      },
    });

    expect(layer.getSource()).toBeInstanceOf(WMTS);
    expect(layer.get('kind')).toBe('basemap');
    expect(layer.get('type')).toBe('wmts');
  });

  it('creates native vector and vector-tile layers', () => {
    const vector = createVectorLayer({
      id: 'points',
      features: [new Feature(new Point([1, 2]))],
    });
    const vectorTile = createVectorTileLayer({
      id: 'mvt',
      source: {
        url: 'https://example.com/{z}/{x}/{y}.pbf',
        format: new MVT(),
      },
    });

    expect(vector).toBeInstanceOf(VectorLayer);
    expect(vector.getSource()).toBeInstanceOf(VectorSource);
    expect(vector.getSource()?.getFeatures()).toHaveLength(1);
    expect(vectorTile).toBeInstanceOf(VectorTileLayer);
    expect(vectorTile.getSource()).toBeInstanceOf(VectorTileSource);
    expect(vectorTile.get('type')).toBe('vector-tile');
  });

  it('creates KML and GPX URL sources and parses inline WKT', () => {
    const kml = createKmlLayer({id: 'kml', url: 'https://example.com/data.kml'});
    const gpx = createGpxLayer({id: 'gpx', url: 'https://example.com/data.gpx'});
    const wkt = createWktLayer({id: 'wkt', data: 'POINT (1 2)'});

    expect(kml.getSource()).toBeInstanceOf(VectorSource);
    expect(gpx.getSource()).toBeInstanceOf(VectorSource);
    expect(wkt.getSource()?.getFeatures()).toHaveLength(1);
    expect(kml.get('type')).toBe('kml');
    expect(gpx.get('type')).toBe('gpx');
    expect(wkt.get('type')).toBe('wkt');
  });

  it('creates a managed native layer group', () => {
    const child = createVectorLayer({id: 'child'});
    const group = createLayerGroup({id: 'group', layers: [child]});

    expect(group).toBeInstanceOf(LayerGroup);
    expect(group.getLayers().getArray()).toEqual([child]);
    expect(group.get('type')).toBe('group');
  });

  it('rejects ambiguous vector inputs', () => {
    expect(() =>
      createVectorLayer({
        source: new VectorSource(),
        features: [],
      }),
    ).toThrow('Vector layer accepts either source or features, not both.');
    expect(() => createKmlLayer({url: 'a.kml', data: '<kml />'})).toThrow(
      'KML layer requires exactly one of url or data.',
    );
  });
});
