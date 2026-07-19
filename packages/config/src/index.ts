export const CURRENT_MAP_CONFIG_VERSION = '1.0' as const;

export interface ProjectMetadata {
  readonly id: string;
  readonly title: string;
  readonly description?: string;
}

export interface ViewConfig {
  readonly projection?: string;
  readonly center: readonly [number, number];
  readonly zoom: number;
  readonly minZoom?: number;
  readonly maxZoom?: number;
  readonly rotation?: number;
}

export interface LayerConfig {
  readonly id: string;
  readonly type: string;
  readonly title?: string;
  readonly visible?: boolean;
  readonly opacity?: number;
  readonly zIndex?: number;
  readonly options?: Readonly<Record<string, unknown>>;
}

export interface ServiceConfig {
  readonly id: string;
  readonly type: 'map' | 'tile' | 'feature' | 'query' | 'edit' | 'analysis' | 'geocoding' | 'stream' | 'custom';
  readonly url: string;
  readonly options?: Readonly<Record<string, unknown>>;
}

export interface WidgetConfig {
  readonly id: string;
  readonly type: string;
  readonly enabled?: boolean;
  readonly position?: string;
  readonly options?: Readonly<Record<string, unknown>>;
}

export interface MapConfigV1 {
  readonly version: typeof CURRENT_MAP_CONFIG_VERSION;
  readonly project: ProjectMetadata;
  readonly view: ViewConfig;
  readonly basemaps?: readonly LayerConfig[];
  readonly layers?: readonly LayerConfig[];
  readonly services?: readonly ServiceConfig[];
  readonly widgets?: readonly WidgetConfig[];
}

export type MapConfig = MapConfigV1;

export function defineMapConfig(config: MapConfig): MapConfig {
  return config;
}

export function assertMapConfig(config: unknown): asserts config is MapConfig {
  if (!config || typeof config !== 'object') {
    throw new TypeError('Map configuration must be an object.');
  }
  const candidate = config as Partial<MapConfig>;
  if (candidate.version !== CURRENT_MAP_CONFIG_VERSION) {
    throw new Error(`Unsupported map configuration version: ${String(candidate.version)}`);
  }
  if (!candidate.project?.id || !candidate.project.title) {
    throw new Error('Map configuration requires project.id and project.title.');
  }
  if (!candidate.view || !Array.isArray(candidate.view.center) || candidate.view.center.length !== 2) {
    throw new Error('Map configuration requires a two-dimensional view.center.');
  }
}
