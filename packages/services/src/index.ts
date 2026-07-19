export type ServiceKind =
  | 'map'
  | 'tile'
  | 'feature'
  | 'query'
  | 'edit'
  | 'analysis'
  | 'geocoding'
  | 'stream'
  | 'custom';

export interface ServiceRequestContext {
  readonly signal?: AbortSignal;
  readonly headers?: HeadersInit;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface ServiceClient<TConfig = unknown> {
  readonly id: string;
  readonly kind: ServiceKind;
  initialize(config: TConfig): void | Promise<void>;
  healthCheck?(context?: ServiceRequestContext): Promise<boolean>;
  dispose?(): void | Promise<void>;
}

export function defineServiceClient<TConfig>(
  client: ServiceClient<TConfig>,
): ServiceClient<TConfig> {
  return client;
}
