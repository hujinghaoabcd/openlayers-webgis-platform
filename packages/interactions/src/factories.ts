import {
  configureInteraction,
  type InteractionOptions,
} from '@omap/core';
import DragAndDrop from 'ol/interaction/DragAndDrop.js';
import DragBox from 'ol/interaction/DragBox.js';
import Draw from 'ol/interaction/Draw.js';
import Extent from 'ol/interaction/Extent.js';
import type Interaction from 'ol/interaction/Interaction.js';
import Modify from 'ol/interaction/Modify.js';
import Select from 'ol/interaction/Select.js';
import Snap from 'ol/interaction/Snap.js';
import Translate from 'ol/interaction/Translate.js';

/** OMap metadata accepted by every standard interaction factory. */
export type ManagedInteractionFactoryOptions = Pick<
  InteractionOptions,
  'id' | 'title' | 'group' | 'active'
>;

type SelectNativeOptions = NonNullable<ConstructorParameters<typeof Select>[0]>;
type DrawNativeOptions = ConstructorParameters<typeof Draw>[0];
type ModifyNativeOptions = ConstructorParameters<typeof Modify>[0];
type TranslateNativeOptions = NonNullable<ConstructorParameters<typeof Translate>[0]>;
type SnapNativeOptions = ConstructorParameters<typeof Snap>[0];
type DragBoxNativeOptions = NonNullable<ConstructorParameters<typeof DragBox>[0]>;
type ExtentNativeOptions = NonNullable<ConstructorParameters<typeof Extent>[0]>;
type DragAndDropNativeOptions = NonNullable<ConstructorParameters<typeof DragAndDrop>[0]>;

export type SelectInteractionOptions = ManagedInteractionFactoryOptions & SelectNativeOptions;
export type DrawInteractionOptions = ManagedInteractionFactoryOptions & DrawNativeOptions;
export type ModifyInteractionOptions = ManagedInteractionFactoryOptions & ModifyNativeOptions;
export type TranslateInteractionOptions = ManagedInteractionFactoryOptions & TranslateNativeOptions;
export type SnapInteractionOptions = ManagedInteractionFactoryOptions & SnapNativeOptions;
export type DragBoxInteractionOptions = ManagedInteractionFactoryOptions & DragBoxNativeOptions;
export type ExtentInteractionOptions = ManagedInteractionFactoryOptions & ExtentNativeOptions;
export type DragAndDropInteractionOptions = ManagedInteractionFactoryOptions & DragAndDropNativeOptions;

/** Create a feature-selection interaction. */
export function createSelectInteraction(options: SelectInteractionOptions = {}): Select {
  return finish(
    new Select(native<SelectNativeOptions>(options)),
    {id: 'select', title: 'Select', type: 'select', group: 'tools', active: false},
    options,
  );
}

/** Create a point, line, polygon, circle or freehand drawing interaction. */
export function createDrawInteraction(options: DrawInteractionOptions): Draw {
  return finish(
    new Draw(native<DrawNativeOptions>(options)),
    {id: 'draw', title: 'Draw', type: 'draw', group: 'tools', active: false},
    options,
  );
}

/** Create a feature-geometry modification interaction. */
export function createModifyInteraction(options: ModifyInteractionOptions): Modify {
  return finish(
    new Modify(native<ModifyNativeOptions>(options)),
    {id: 'modify', title: 'Modify', type: 'modify', group: 'tools', active: false},
    options,
  );
}

/** Create a feature translation interaction. */
export function createTranslateInteraction(
  options: TranslateInteractionOptions = {},
): Translate {
  return finish(
    new Translate(native<TranslateNativeOptions>(options)),
    {id: 'translate', title: 'Translate', type: 'translate', group: 'tools', active: false},
    options,
  );
}

/** Create a vertex and edge snapping interaction. */
export function createSnapInteraction(options: SnapInteractionOptions): Snap {
  return finish(
    new Snap(native<SnapNativeOptions>(options)),
    {id: 'snap', title: 'Snap', type: 'snap', group: undefined, active: true},
    options,
  );
}

/** Create a drag-box interaction. */
export function createDragBoxInteraction(options: DragBoxInteractionOptions = {}): DragBox {
  return finish(
    new DragBox(native<DragBoxNativeOptions>(options)),
    {id: 'drag-box', title: 'Drag box', type: 'drag-box', group: 'tools', active: false},
    options,
  );
}

/** Create an editable extent interaction. */
export function createExtentInteraction(options: ExtentInteractionOptions = {}): Extent {
  return finish(
    new Extent(native<ExtentNativeOptions>(options)),
    {id: 'extent', title: 'Extent', type: 'extent', group: 'tools', active: false},
    options,
  );
}

/** Create a file drag-and-drop feature loading interaction. */
export function createDragAndDropInteraction(
  options: DragAndDropInteractionOptions = {},
): DragAndDrop {
  return finish(
    new DragAndDrop(native<DragAndDropNativeOptions>(options)),
    {
      id: 'drag-and-drop',
      title: 'Drag and drop',
      type: 'drag-and-drop',
      group: undefined,
      active: true,
    },
    options,
  );
}

function native<TNative>(options: ManagedInteractionFactoryOptions & TNative): TNative {
  const {
    id: _id,
    title: _title,
    group: _group,
    active: _active,
    ...nativeOptions
  } = options;
  return nativeOptions as TNative;
}

function finish<TInteraction extends Interaction>(
  interaction: TInteraction,
  defaults: {
    readonly id: string;
    readonly title: string;
    readonly type: string;
    readonly group: string | undefined;
    readonly active: boolean;
  },
  options: ManagedInteractionFactoryOptions,
): TInteraction {
  return configureInteraction(interaction, {
    id: options.id ?? defaults.id,
    title: options.title ?? defaults.title,
    type: defaults.type,
    group: options.group ?? defaults.group,
    active: options.active ?? defaults.active,
  });
}
