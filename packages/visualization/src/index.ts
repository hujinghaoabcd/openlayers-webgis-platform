import type Map from 'ol/Map.js';

export interface VisualizationLayer<TOptions = unknown> {
  readonly id: string;
  attach(map: Map, options: TOptions): void | Promise<void>;
  update?(options: Partial<TOptions>): void | Promise<void>;
  detach(): void | Promise<void>;
}
