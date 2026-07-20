import {History} from '@omap/core';
import Collection from 'ol/Collection.js';
import Feature from 'ol/Feature.js';
import Point from 'ol/geom/Point.js';
import Draw from 'ol/interaction/Draw.js';
import Modify from 'ol/interaction/Modify.js';
import Translate from 'ol/interaction/Translate.js';
import VectorSource from 'ol/source/Vector.js';
import {describe, expect, it} from 'vitest';
import {
  bindFeatureHistory,
  captureFeatureGeometries,
  createAddFeaturesCommand,
  createGeometryChangeCommand,
  createRemoveFeaturesCommand,
  type EditableFeature,
} from './commands.js';

function pointFeature(x: number, y: number): EditableFeature {
  return new Feature(new Point([x, y]));
}

describe('feature commands', () => {
  it('adds, removes, undoes and redoes features through History', async () => {
    const source = new VectorSource<EditableFeature>();
    const feature = pointFeature(1, 2);
    const history = new History();

    await history.execute(createAddFeaturesCommand({source, features: feature}));
    expect(source.getFeatures()).toEqual([feature]);

    await history.undo();
    expect(source.getFeatures()).toEqual([]);

    await history.redo();
    expect(source.getFeatures()).toEqual([feature]);
  });

  it('restores features removed by a reversible command', async () => {
    const feature = pointFeature(3, 4);
    const source = new VectorSource<EditableFeature>({features: [feature]});
    const history = new History();

    await history.execute(createRemoveFeaturesCommand({source, features: feature}));
    expect(source.getFeatures()).toEqual([]);

    await history.undo();
    expect(source.getFeatures()).toEqual([feature]);
  });

  it('switches between cloned geometry snapshots', async () => {
    const feature = pointFeature(0, 0);
    const before = captureFeatureGeometries([feature]);
    feature.setGeometry(new Point([8, 9]));
    const after = captureFeatureGeometries([feature]);
    const history = new History();

    await history.record(createGeometryChangeCommand({before, after}));
    await history.undo();
    expect((feature.getGeometry() as Point).getCoordinates()).toEqual([0, 0]);

    await history.redo();
    expect((feature.getGeometry() as Point).getCoordinates()).toEqual([8, 9]);
  });

  it('records native draw events without adding the feature twice', async () => {
    const source = new VectorSource<EditableFeature>();
    const draw = new Draw({source, type: 'Point'});
    const history = new History();
    const unbind = bindFeatureHistory({history, source, draw});
    const feature = pointFeature(5, 6);

    source.addFeature(feature);
    draw.dispatchEvent({type: 'drawend', feature} as never);
    await history.whenIdle();

    expect(source.getFeatures()).toEqual([feature]);
    expect(history.state().undoLabel).toBe('Draw feature');
    await history.undo();
    expect(source.getFeatures()).toEqual([]);

    unbind();
  });

  it('records native modify and translate geometry changes', async () => {
    const feature = pointFeature(0, 0);
    const features = new Collection<EditableFeature>([feature]);
    const source = new VectorSource<EditableFeature>({features: [feature]});
    const modify = new Modify({source});
    const translate = new Translate({features});
    const history = new History();
    const unbind = bindFeatureHistory({history, source, modify, translate});

    modify.dispatchEvent({type: 'modifystart', features} as never);
    feature.setGeometry(new Point([2, 3]));
    modify.dispatchEvent({type: 'modifyend', features} as never);
    await history.whenIdle();
    await history.undo();
    expect((feature.getGeometry() as Point).getCoordinates()).toEqual([0, 0]);
    await history.redo();
    expect((feature.getGeometry() as Point).getCoordinates()).toEqual([2, 3]);

    translate.dispatchEvent({type: 'translatestart', features} as never);
    feature.setGeometry(new Point([7, 8]));
    translate.dispatchEvent({type: 'translateend', features} as never);
    await history.whenIdle();
    await history.undo();
    expect((feature.getGeometry() as Point).getCoordinates()).toEqual([2, 3]);

    unbind();
  });
});
