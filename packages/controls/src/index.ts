import type Control from 'ol/control/Control.js';

export interface ControlFactoryContext {
  readonly locale?: string;
}

export interface ControlDefinition<TOptions = unknown> {
  readonly id: string;
  create(options: TOptions, context?: ControlFactoryContext): Control;
}

export function defineControl<TOptions>(definition: ControlDefinition<TOptions>): ControlDefinition<TOptions> {
  return definition;
}
