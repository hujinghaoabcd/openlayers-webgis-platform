import type Interaction from 'ol/interaction/Interaction.js';

export {
  createDragAndDropInteraction,
  createDragBoxInteraction,
  createDrawInteraction,
  createExtentInteraction,
  createModifyInteraction,
  createSelectInteraction,
  createSnapInteraction,
  createTranslateInteraction,
} from './factories.js';
export type {
  DragAndDropInteractionOptions,
  DragBoxInteractionOptions,
  DrawInteractionOptions,
  ExtentInteractionOptions,
  ManagedInteractionFactoryOptions,
  ModifyInteractionOptions,
  SelectInteractionOptions,
  SnapInteractionOptions,
  TranslateInteractionOptions,
} from './factories.js';

export interface InteractionDefinition<TOptions = unknown> {
  readonly id: string;
  readonly group?: string;
  create(options: TOptions): Interaction;
}

export interface Command {
  readonly label: string;
  execute(): void | Promise<void>;
  undo(): void | Promise<void>;
}

export function defineInteraction<TOptions>(
  definition: InteractionDefinition<TOptions>,
): InteractionDefinition<TOptions> {
  return definition;
}
