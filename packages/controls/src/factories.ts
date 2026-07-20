import {
  configureControl,
  type ControlOptions,
  type ControlPosition,
} from '@omap/core';
import Attribution from 'ol/control/Attribution.js';
import type Control from 'ol/control/Control.js';
import FullScreen from 'ol/control/FullScreen.js';
import MousePosition from 'ol/control/MousePosition.js';
import OverviewMap from 'ol/control/OverviewMap.js';
import Rotate from 'ol/control/Rotate.js';
import ScaleLine from 'ol/control/ScaleLine.js';
import Zoom from 'ol/control/Zoom.js';
import ZoomSlider from 'ol/control/ZoomSlider.js';
import ZoomToExtent from 'ol/control/ZoomToExtent.js';

/** OMap metadata accepted by every standard control factory. */
export interface ManagedControlOptions extends Omit<ControlOptions, 'replace'> {}

type ZoomNativeOptions = NonNullable<ConstructorParameters<typeof Zoom>[0]>;
type RotateNativeOptions = NonNullable<ConstructorParameters<typeof Rotate>[0]>;
type AttributionNativeOptions = NonNullable<ConstructorParameters<typeof Attribution>[0]>;
type ScaleLineNativeOptions = NonNullable<ConstructorParameters<typeof ScaleLine>[0]>;
type MousePositionNativeOptions = NonNullable<ConstructorParameters<typeof MousePosition>[0]>;
type FullScreenNativeOptions = NonNullable<ConstructorParameters<typeof FullScreen>[0]>;
type OverviewMapNativeOptions = NonNullable<ConstructorParameters<typeof OverviewMap>[0]>;
type ZoomSliderNativeOptions = NonNullable<ConstructorParameters<typeof ZoomSlider>[0]>;
type ZoomToExtentNativeOptions = NonNullable<ConstructorParameters<typeof ZoomToExtent>[0]>;

export type ZoomControlOptions = ManagedControlOptions & ZoomNativeOptions;
export type RotateControlOptions = ManagedControlOptions & RotateNativeOptions;
export type AttributionControlOptions = ManagedControlOptions & AttributionNativeOptions;
export type ScaleLineControlOptions = ManagedControlOptions & ScaleLineNativeOptions;
export type MousePositionControlOptions = ManagedControlOptions & MousePositionNativeOptions;
export type FullScreenControlOptions = ManagedControlOptions & FullScreenNativeOptions;
export type OverviewMapControlOptions = ManagedControlOptions & OverviewMapNativeOptions;
export type ZoomSliderControlOptions = ManagedControlOptions & ZoomSliderNativeOptions;
export type ZoomToExtentControlOptions = ManagedControlOptions & ZoomToExtentNativeOptions;

/** Create the standard zoom buttons. */
export function createZoomControl(options: ZoomControlOptions = {}): Zoom {
  return finish(
    new Zoom(native<ZoomNativeOptions>(options)),
    {id: 'zoom', title: 'Zoom', type: 'zoom', position: 'top-left'},
    options,
  );
}

/** Create the view rotation reset control. */
export function createRotateControl(options: RotateControlOptions = {}): Rotate {
  return finish(
    new Rotate(native<RotateNativeOptions>(options)),
    {id: 'rotate', title: 'Rotate', type: 'rotate', position: 'top-right'},
    options,
  );
}

/** Create the map attribution control. */
export function createAttributionControl(
  options: AttributionControlOptions = {},
): Attribution {
  return finish(
    new Attribution(native<AttributionNativeOptions>(options)),
    {id: 'attribution', title: 'Attribution', type: 'attribution', position: 'bottom-right'},
    options,
  );
}

/** Create a scale-line or scale-bar control. */
export function createScaleLineControl(options: ScaleLineControlOptions = {}): ScaleLine {
  return finish(
    new ScaleLine(native<ScaleLineNativeOptions>(options)),
    {id: 'scale-line', title: 'Scale line', type: 'scale-line', position: 'bottom-left'},
    options,
  );
}

/** Create a pointer-coordinate readout. */
export function createMousePositionControl(
  options: MousePositionControlOptions = {},
): MousePosition {
  return finish(
    new MousePosition(native<MousePositionNativeOptions>(options)),
    {
      id: 'mouse-position',
      title: 'Mouse position',
      type: 'mouse-position',
      position: 'bottom-right',
    },
    options,
  );
}

/** Create a full-screen toggle control. */
export function createFullScreenControl(options: FullScreenControlOptions = {}): FullScreen {
  return finish(
    new FullScreen(native<FullScreenNativeOptions>(options)),
    {id: 'full-screen', title: 'Full screen', type: 'full-screen', position: 'top-right'},
    options,
  );
}

/** Create a collapsible map overview. */
export function createOverviewMapControl(options: OverviewMapControlOptions = {}): OverviewMap {
  return finish(
    new OverviewMap(native<OverviewMapNativeOptions>(options)),
    {id: 'overview-map', title: 'Overview map', type: 'overview-map', position: 'bottom-left'},
    options,
  );
}

/** Create the vertical zoom slider. */
export function createZoomSliderControl(options: ZoomSliderControlOptions = {}): ZoomSlider {
  return finish(
    new ZoomSlider(native<ZoomSliderNativeOptions>(options)),
    {id: 'zoom-slider', title: 'Zoom slider', type: 'zoom-slider', position: 'top-left'},
    options,
  );
}

/** Create a button that fits the view to a configured extent. */
export function createZoomToExtentControl(
  options: ZoomToExtentControlOptions = {},
): ZoomToExtent {
  return finish(
    new ZoomToExtent(native<ZoomToExtentNativeOptions>(options)),
    {
      id: 'zoom-to-extent',
      title: 'Zoom to extent',
      type: 'zoom-to-extent',
      position: 'top-left',
    },
    options,
  );
}

function native<TNative>(options: ManagedControlOptions & TNative): TNative {
  const {
    id: _id,
    title: _title,
    type: _type,
    position: _position,
    enabled: _enabled,
    ...nativeOptions
  } = options;
  return nativeOptions as TNative;
}

function finish<TControl extends Control>(
  control: TControl,
  defaults: {
    readonly id: string;
    readonly title: string;
    readonly type: string;
    readonly position: ControlPosition;
  },
  options: ManagedControlOptions,
): TControl {
  return configureControl(control, {
    id: options.id ?? defaults.id,
    title: options.title ?? defaults.title,
    type: options.type ?? defaults.type,
    position: options.position ?? defaults.position,
    enabled: options.enabled ?? true,
  });
}
