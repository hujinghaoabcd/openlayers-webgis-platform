import {getInteractionId} from '@omap/core';
import GeoJSON from 'ol/format/GeoJSON.js';
import DragAndDrop from 'ol/interaction/DragAndDrop.js';
import DragBox from 'ol/interaction/DragBox.js';
import Draw from 'ol/interaction/Draw.js';
import Extent from 'ol/interaction/Extent.js';
import Modify from 'ol/interaction/Modify.js';
import Select from 'ol/interaction/Select.js';
import Snap from 'ol/interaction/Snap.js';
import Translate from 'ol/interaction/Translate.js';
import VectorSource from 'ol/source/Vector.js';
import {describe, expect, it} from 'vitest';
import {
  createDragAndDropInteraction,
  createDragBoxInteraction,
  createDrawInteraction,
  createExtentInteraction,
  createModifyInteraction,
  createSelectInteraction,
  createSnapInteraction,
  createTranslateInteraction,
} from './factories.js';

describe('standard interaction factories', () => {
  it('creates native OpenLayers interaction instances', () => {
    const source = new VectorSource();

    expect(createSelectInteraction()).toBeInstanceOf(Select);
    expect(createDrawInteraction({source, type: 'Polygon'})).toBeInstanceOf(Draw);
    expect(createModifyInteraction({source})).toBeInstanceOf(Modify);
    expect(createTranslateInteraction()).toBeInstanceOf(Translate);
    expect(createSnapInteraction({source})).toBeInstanceOf(Snap);
    expect(createDragBoxInteraction()).toBeInstanceOf(DragBox);
    expect(createExtentInteraction()).toBeInstanceOf(Extent);
    expect(
      createDragAndDropInteraction({formatConstructors: [GeoJSON]}),
    ).toBeInstanceOf(DragAndDrop);
  });

  it('applies stable default metadata and tool state', () => {
    const draw = createDrawInteraction({
      source: new VectorSource(),
      type: 'Polygon',
    });

    expect(getInteractionId(draw)).toBe('draw');
    expect(draw.get('title')).toBe('Draw');
    expect(draw.get('type')).toBe('draw');
    expect(draw.get('group')).toBe('tools');
    expect(draw.getActive()).toBe(false);
  });

  it('keeps snap active and outside the exclusive tool group', () => {
    const snap = createSnapInteraction({source: new VectorSource()});

    expect(getInteractionId(snap)).toBe('snap');
    expect(snap.get('group')).toBeUndefined();
    expect(snap.getActive()).toBe(true);
  });

  it('supports metadata and native option overrides', () => {
    const select = createSelectInteraction({
      id: 'feature-picker',
      title: 'Feature picker',
      group: 'selection',
      active: true,
      multi: true,
    });

    expect(getInteractionId(select)).toBe('feature-picker');
    expect(select.get('title')).toBe('Feature picker');
    expect(select.get('group')).toBe('selection');
    expect(select.getActive()).toBe(true);
  });
});
