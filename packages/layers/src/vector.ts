import {configureLayer} from '@omap/core';
import Feature from 'ol/Feature.js';
import GPX from 'ol/format/GPX.js';
import KML from 'ol/format/KML.js';
import WKT from 'ol/format/WKT.js';
import type Geometry from 'ol/geom/Geometry.js';
import VectorLayer from 'ol/layer/Vector.js';
import VectorTileLayer from 'ol/layer/VectorTile.js';
import VectorSource from 'ol/source/Vector.js';
import VectorTileSource from 'ol/source/VectorTile.js';
import type {StyleLike} from 'ol/style/Style.js';
import type {NamedLayerOptions} from './factories.js';

/** Common options for native vector layers. */
export interface VectorLayerOptions extends NamedLayerOptions {
  readonly source?: VectorSource<Feature<Geometry>>;
  readonly features?: Feature<Geometry>[];
  readonly style?: StyleLike;
}

/** Native vector-tile source options plus layer metadata and style. */
export interface VectorTileLayerOptions extends NamedLayerOptions {
  readonly source: ConstructorParameters<typeof VectorTileSource>[0];
  readonly style?: StyleLike;
}

/** Shared read options for text and XML vector formats. */
export interface FeatureReadOptions {
  readonly dataProjection?: string;
  readonly featureProjection?: string;
}

/** KML URL or inline-data options. Exactly one input must be provided. */
export interface KmlLayerOptions extends NamedLayerOptions, FeatureReadOptions {
  readonly url?: string;
  readonly data?: string | Document | Element;
  readonly format?: ConstructorParameters<typeof KML>[0];
  readonly style?: StyleLike;
}

/** GPX URL or inline-data options. Exactly one input must be provided. */
export interface GpxLayerOptions extends NamedLayerOptions, FeatureReadOptions {
  readonly url?: string;
  readonly data?: string | Document | Element;
  readonly format?: ConstructorParameters<typeof GPX>[0];
  readonly style?: StyleLike;
}

/** Inline WKT options. */
export interface WktLayerOptions extends NamedLayerOptions, FeatureReadOptions {
  readonly data: string;
  readonly format?: ConstructorParameters<typeof WKT>[0];
  readonly style?: StyleLike;
}

/** Create a native vector layer from a source or in-memory features. */
export function createVectorLayer(
  options: VectorLayerOptions = {},
): VectorLayer<VectorSource<Feature<Geometry>>> {
  if (options.source && options.features) {
    throw new Error('Vector layer accepts either source or features, not both.');
  }
  const source = options.source ?? new VectorSource<Feature<Geometry>>({features: options.features});
  const layer = new VectorLayer({
    source,
    ...(options.style !== undefined ? {style: options.style} : {}),
  });
  return configureLayer(layer, {kind: 'overlay', type: 'vector', ...layerMetadata(options)});
}

/** Create a vector-tile layer using native OpenLayers source options. */
export function createVectorTileLayer(options: VectorTileLayerOptions): VectorTileLayer {
  const layer = new VectorTileLayer({
    source: new VectorTileSource(options.source),
    ...(options.style !== undefined ? {style: options.style} : {}),
  });
  return configureLayer(layer, {kind: 'overlay', type: 'vector-tile', ...layerMetadata(options)});
}

/** Create a KML vector layer from a URL or inline KML. */
export function createKmlLayer(
  options: KmlLayerOptions,
): VectorLayer<VectorSource<Feature<Geometry>>> {
  assertOneInput(options.url, options.data, 'KML');
  const format = new KML(options.format);
  const source =
    options.url !== undefined
      ? new VectorSource<Feature<Geometry>>({url: options.url, format})
      : new VectorSource<Feature<Geometry>>({
          features: format.readFeatures(options.data!, readOptions(options)),
        });
  const layer = new VectorLayer({
    source,
    ...(options.style !== undefined ? {style: options.style} : {}),
  });
  return configureLayer(layer, {kind: 'overlay', type: 'kml', ...layerMetadata(options)});
}

/** Create a GPX vector layer from a URL or inline GPX. */
export function createGpxLayer(
  options: GpxLayerOptions,
): VectorLayer<VectorSource<Feature<Geometry>>> {
  assertOneInput(options.url, options.data, 'GPX');
  const format = new GPX(options.format);
  const source =
    options.url !== undefined
      ? new VectorSource<Feature<Geometry>>({url: options.url, format})
      : new VectorSource<Feature<Geometry>>({
          features: format.readFeatures(options.data!, readOptions(options)),
        });
  const layer = new VectorLayer({
    source,
    ...(options.style !== undefined ? {style: options.style} : {}),
  });
  return configureLayer(layer, {kind: 'overlay', type: 'gpx', ...layerMetadata(options)});
}

/** Create a vector layer from inline Well-Known Text. */
export function createWktLayer(
  options: WktLayerOptions,
): VectorLayer<VectorSource<Feature<Geometry>>> {
  const format = new WKT(options.format);
  const source = new VectorSource<Feature<Geometry>>({
    features: format.readFeatures(options.data, readOptions(options)),
  });
  const layer = new VectorLayer({
    source,
    ...(options.style !== undefined ? {style: options.style} : {}),
  });
  return configureLayer(layer, {kind: 'overlay', type: 'wkt', ...layerMetadata(options)});
}

function readOptions(options: FeatureReadOptions): FeatureReadOptions {
  return {
    ...(options.dataProjection !== undefined ? {dataProjection: options.dataProjection} : {}),
    ...(options.featureProjection !== undefined
      ? {featureProjection: options.featureProjection}
      : {}),
  };
}

function assertOneInput(
  url: string | undefined,
  data: string | Document | Element | undefined,
  label: string,
): void {
  if ((url === undefined) === (data === undefined)) {
    throw new Error(`${label} layer requires exactly one of url or data.`);
  }
}

function layerMetadata(options: NamedLayerOptions): NamedLayerOptions {
  const {id, title, kind, type, group, tags, visible, opacity, zIndex} = options;
  return {
    ...(id !== undefined ? {id} : {}),
    ...(title !== undefined ? {title} : {}),
    ...(kind !== undefined ? {kind} : {}),
    ...(type !== undefined ? {type} : {}),
    ...(group !== undefined ? {group} : {}),
    ...(tags !== undefined ? {tags} : {}),
    ...(visible !== undefined ? {visible} : {}),
    ...(opacity !== undefined ? {opacity} : {}),
    ...(zIndex !== undefined ? {zIndex} : {}),
  };
}
