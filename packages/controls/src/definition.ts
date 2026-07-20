import type Control from 'ol/control/Control.js';

/** Context available to reusable control definitions. */
export interface ControlFactoryContext {
  readonly locale?: string;
}

/** Declarative contract for a reusable control factory. */
export interface ControlDefinition<TOptions = unknown> {
  readonly id: string;
  create(options: TOptions, context?: ControlFactoryContext): Control;
}

/** Define a reusable control without changing its implementation. */
export function defineControl<TOptions>(
  definition: ControlDefinition<TOptions>,
): ControlDefinition<TOptions> {
  return definition;
}
