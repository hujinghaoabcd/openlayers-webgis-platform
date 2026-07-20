import {getControlElement, getControlId} from '@omap/core';
import Attribution from 'ol/control/Attribution.js';
import FullScreen from 'ol/control/FullScreen.js';
import MousePosition from 'ol/control/MousePosition.js';
import OverviewMap from 'ol/control/OverviewMap.js';
import Rotate from 'ol/control/Rotate.js';
import ScaleLine from 'ol/control/ScaleLine.js';
import Zoom from 'ol/control/Zoom.js';
import ZoomSlider from 'ol/control/ZoomSlider.js';
import ZoomToExtent from 'ol/control/ZoomToExtent.js';
import {describe, expect, it} from 'vitest';
import {
  createAttributionControl,
  createFullScreenControl,
  createMousePositionControl,
  createOverviewMapControl,
  createRotateControl,
  createScaleLineControl,
  createZoomControl,
  createZoomSliderControl,
  createZoomToExtentControl,
} from './factories.js';

describe('standard control factories', () => {
  it('creates native OpenLayers control instances', () => {
    expect(createZoomControl()).toBeInstanceOf(Zoom);
    expect(createRotateControl()).toBeInstanceOf(Rotate);
    expect(createAttributionControl()).toBeInstanceOf(Attribution);
    expect(createScaleLineControl()).toBeInstanceOf(ScaleLine);
    expect(createMousePositionControl()).toBeInstanceOf(MousePosition);
    expect(createFullScreenControl()).toBeInstanceOf(FullScreen);
    expect(createOverviewMapControl()).toBeInstanceOf(OverviewMap);
    expect(createZoomSliderControl()).toBeInstanceOf(ZoomSlider);
    expect(createZoomToExtentControl()).toBeInstanceOf(ZoomToExtent);
  });

  it('applies stable default metadata and position hooks', () => {
    const scale = createScaleLineControl();
    const element = getControlElement(scale);

    expect(getControlId(scale)).toBe('scale-line');
    expect(scale.get('type')).toBe('scale-line');
    expect(scale.get('position')).toBe('bottom-left');
    expect(scale.get('enabled')).toBe(true);
    expect(element.dataset.omapControlPosition).toBe('bottom-left');
  });

  it('supports metadata and native option overrides', () => {
    const rotate = createRotateControl({
      id: 'north',
      title: 'Reset north',
      position: 'bottom-right',
      autoHide: false,
      enabled: false,
    });

    expect(getControlId(rotate)).toBe('north');
    expect(rotate.get('title')).toBe('Reset north');
    expect(rotate.get('position')).toBe('bottom-right');
    expect(getControlElement(rotate).hidden).toBe(true);
  });

  it('forwards extent configuration to ZoomToExtent', () => {
    const extent: [number, number, number, number] = [0, 0, 10, 10];
    const control = createZoomToExtentControl({extent});
    expect(control).toBeInstanceOf(ZoomToExtent);
    expect(getControlId(control)).toBe('zoom-to-extent');
  });
});
