import {configureLayer} from '@omap/core';
import ImageLayer from 'ol/layer/Image.js';
import TileLayer from 'ol/layer/Tile.js';
import WebGLTileLayer from 'ol/layer/WebGLTile.js';
import GeoTIFFSource from 'ol/source/GeoTIFF.js';
import ImageWMS from 'ol/source/ImageWMS.js';
import WMTS from 'ol/source/WMTS.js';
import type {NamedLayerOptions} from './factories.js';

/** Native ImageWMS source options plus OMap layer metadata. */
export interface ImageWmsLayerOptions extends NamedLayerOptions {
  readonly source: ConstructorParameters<typeof ImageWMS>[0];
}

/** Native WMTS source options plus OMap layer metadata. */
export interface WmtsLayerOptions extends NamedLayerOptions {
  readonly source: ConstructorParameters<typeof WMTS>[0];
}

/** Native GeoTIFF source options plus OMap layer metadata. */
export interface GeoTiffLayerOptions extends NamedLayerOptions {
  readonly source: ConstructorParameters<typeof GeoTIFFSource>[0];
}

/** Create an untiled WMS image overlay. */
export function createImageWmsLayer(options: ImageWmsLayerOptions): ImageLayer<ImageWMS> {
  const {source: sourceOptions, ...layerOptions} = options;
  const layer = new ImageLayer({source: new ImageWMS(sourceOptions)});
  return configureLayer(layer, {kind: 'overlay', type: 'image-wms', ...layerOptions});
}

/** Create a WMTS tile layer. */
export function createWmtsLayer(options: WmtsLayerOptions): TileLayer<WMTS> {
  const {source: sourceOptions, ...layerOptions} = options;
  const layer = new TileLayer({source: new WMTS(sourceOptions)});
  return configureLayer(layer, {kind: 'basemap', type: 'wmts', ...layerOptions});
}

/** Create a WebGL-rendered GeoTIFF layer. */
export function createGeoTiffLayer(options: GeoTiffLayerOptions): WebGLTileLayer {
  const {source: sourceOptions, ...layerOptions} = options;
  const layer = new WebGLTileLayer({source: new GeoTIFFSource(sourceOptions)});
  return configureLayer(layer, {kind: 'overlay', type: 'geotiff', ...layerOptions});
}
