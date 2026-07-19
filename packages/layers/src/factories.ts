import Feature from 'ol/Feature.js';
import GeoJSON from 'ol/format/GeoJSON.js';
import TileLayer from 'ol/layer/Tile.js';
import VectorLayer from 'ol/layer/Vector.js';
import OSM from 'ol/source/OSM.js';
import TileWMS from 'ol/source/TileWMS.js';
import VectorSource from 'ol/source/Vector.js';
import XYZ from 'ol/source/XYZ.js';
import type {GeoJSONFeatureCollection} from 'ol/format/GeoJSON.js';
import type Geometry from 'ol/geom/Geometry.js';
import type BaseLayer from 'ol/layer/Base.js';
import type {StyleLike} from 'ol/style/Style.js';

export interface NamedLayerOptions {
  id?: string;
  title?: string;
  visible?: boolean;
  opacity?: number;
  zIndex?: number;
}

export interface XyzLayerOptions extends NamedLayerOptions {
  url: string;
  attributions?: string | string[];
  crossOrigin?: string | null;
  maxZoom?: number;
}

export interface WmsLayerOptions extends NamedLayerOptions {
  url: string;
  params: Record<string, unknown> & {LAYERS: string};
  crossOrigin?: string | null;
}

function applyMetadata<T extends BaseLayer>(layer: T, options: NamedLayerOptions): T {
  if (options.id) layer.set('id', options.id);
  if (options.title) layer.set('title', options.title);
  if (options.visible !== undefined) layer.setVisible(options.visible);
  if (options.opacity !== undefined) layer.setOpacity(options.opacity);
  if (options.zIndex !== undefined) layer.setZIndex(options.zIndex);
  return layer;
}

export function createOsmLayer(options: NamedLayerOptions = {}): TileLayer<OSM> {
  return applyMetadata(new TileLayer({source: new OSM()}), options);
}

export function createXyzLayer(options: XyzLayerOptions): TileLayer<XYZ> {
  const source = new XYZ({
    url: options.url,
    ...(options.attributions !== undefined ? {attributions: options.attributions} : {}),
    ...(options.crossOrigin !== undefined ? {crossOrigin: options.crossOrigin} : {}),
    ...(options.maxZoom !== undefined ? {maxZoom: options.maxZoom} : {}),
  });
  return applyMetadata(new TileLayer({source}), options);
}

export function createWmsLayer(options: WmsLayerOptions): TileLayer<TileWMS> {
  const source = new TileWMS({
    url: options.url,
    params: options.params,
    ...(options.crossOrigin !== undefined ? {crossOrigin: options.crossOrigin} : {}),
  });
  return applyMetadata(new TileLayer({source}), options);
}

export function createGeoJsonLayer(
  data: GeoJSONFeatureCollection,
  options: NamedLayerOptions & {style?: StyleLike} = {},
): VectorLayer<VectorSource<Feature<Geometry>>> {
  const source = new VectorSource<Feature<Geometry>>({
    features: new GeoJSON().readFeatures(data),
  });
  const layer = new VectorLayer({
    source,
    ...(options.style !== undefined ? {style: options.style} : {}),
  });
  return applyMetadata(layer, options);
}
