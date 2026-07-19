import type {OrbiLayerContext} from '@orbilayer/core';

export interface WidgetDefinition<TOptions = unknown> {
  readonly id: string;
  readonly title: string;
  readonly group?: string;
  mount(context: OrbiLayerContext, options: TOptions): void | Promise<void>;
  unmount(): void | Promise<void>;
}

export class WidgetRegistry {
  private readonly definitions = new Map<string, WidgetDefinition>();

  register(definition: WidgetDefinition): void {
    if (this.definitions.has(definition.id)) {
      throw new Error(`Widget already registered: ${definition.id}`);
    }
    this.definitions.set(definition.id, definition);
  }

  get(id: string): WidgetDefinition | undefined {
    return this.definitions.get(id);
  }

  list(): WidgetDefinition[] {
    return [...this.definitions.values()];
  }
}
