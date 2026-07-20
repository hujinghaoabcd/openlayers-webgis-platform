import type {Command, History} from '@omap/core';
import type {EventsKey} from 'ol/events.js';
import type Feature from 'ol/Feature.js';
import type Geometry from 'ol/geom/Geometry.js';
import type Draw from 'ol/interaction/Draw.js';
import type Modify from 'ol/interaction/Modify.js';
import type Translate from 'ol/interaction/Translate.js';
import {unByKey} from 'ol/Observable.js';
import type VectorSource from 'ol/source/Vector.js';

/** Vector feature type used by the reusable editing commands. */
export type EditableFeature = Feature<Geometry>;

/** One captured feature geometry. Geometries are cloned when captured. */
export interface FeatureGeometryState {
  readonly feature: EditableFeature;
  readonly geometry: Geometry | undefined;
}

/** Options shared by add and remove feature commands. */
export interface FeatureSetCommandOptions {
  readonly source: VectorSource<EditableFeature>;
  readonly features: EditableFeature | readonly EditableFeature[];
  readonly label?: string;
}

/** Options for a geometry snapshot command. */
export interface GeometryChangeCommandOptions {
  readonly before: readonly FeatureGeometryState[];
  readonly after: readonly FeatureGeometryState[];
  readonly label?: string;
}

/** Labels used by automatic native interaction history recording. */
export interface FeatureHistoryLabels {
  readonly draw?: string;
  readonly modify?: string;
  readonly translate?: string;
}

/** Options for binding native editing interactions to a command history. */
export interface BindFeatureHistoryOptions {
  readonly history: History;
  readonly source: VectorSource<EditableFeature>;
  readonly draw?: Draw;
  readonly modify?: Modify;
  readonly translate?: Translate;
  readonly labels?: FeatureHistoryLabels;
}

/** Create a reversible command that adds one or more features. */
export function createAddFeaturesCommand(options: FeatureSetCommandOptions): Command {
  const features = normalizeFeatures(options.features);
  return {
    label: options.label ?? (features.length === 1 ? 'Add feature' : 'Add features'),
    execute() {
      for (const feature of features) {
        if (!hasFeature(options.source, feature)) options.source.addFeature(feature);
      }
    },
    undo() {
      for (const feature of features) {
        if (hasFeature(options.source, feature)) options.source.removeFeature(feature);
      }
    },
  };
}

/** Create a reversible command that removes one or more features. */
export function createRemoveFeaturesCommand(options: FeatureSetCommandOptions): Command {
  const features = normalizeFeatures(options.features);
  return {
    label: options.label ?? (features.length === 1 ? 'Remove feature' : 'Remove features'),
    execute() {
      for (const feature of features) {
        if (hasFeature(options.source, feature)) options.source.removeFeature(feature);
      }
    },
    undo() {
      for (const feature of features) {
        if (!hasFeature(options.source, feature)) options.source.addFeature(feature);
      }
    },
  };
}

/** Capture cloned geometries for a feature collection or ordinary iterable. */
export function captureFeatureGeometries(
  features: Iterable<EditableFeature>,
): readonly FeatureGeometryState[] {
  return [...features].map(feature => ({
    feature,
    geometry: feature.getGeometry()?.clone(),
  }));
}

/** Create a reversible command that switches between geometry snapshots. */
export function createGeometryChangeCommand(options: GeometryChangeCommandOptions): Command {
  const before = cloneGeometryState(options.before);
  const after = cloneGeometryState(options.after);
  return {
    label: options.label ?? 'Change geometry',
    execute() {
      applyGeometryState(after);
    },
    undo() {
      applyGeometryState(before);
    },
  };
}

/**
 * Bind native Draw, Modify and Translate events to an existing history.
 *
 * Native interactions apply their changes before their end events fire, so the
 * resulting commands are recorded with {@link History.record} rather than
 * executed a second time.
 */
export function bindFeatureHistory(options: BindFeatureHistoryOptions): () => void {
  const keys: EventsKey[] = [];
  let modifyBefore: readonly FeatureGeometryState[] = [];
  let translateBefore: readonly FeatureGeometryState[] = [];

  if (options.draw) {
    keys.push(
      options.draw.on('drawend', event => {
        void options.history.record(
          createAddFeaturesCommand({
            source: options.source,
            features: event.feature as EditableFeature,
            label: options.labels?.draw ?? 'Draw feature',
          }),
        );
      }),
    );
  }

  if (options.modify) {
    keys.push(
      options.modify.on('modifystart', event => {
        modifyBefore = captureFeatureGeometries(event.features.getArray() as EditableFeature[]);
      }),
      options.modify.on('modifyend', event => {
        const after = captureFeatureGeometries(event.features.getArray() as EditableFeature[]);
        if (modifyBefore.length > 0) {
          void options.history.record(
            createGeometryChangeCommand({
              before: modifyBefore,
              after,
              label: options.labels?.modify ?? 'Modify features',
            }),
          );
        }
        modifyBefore = [];
      }),
    );
  }

  if (options.translate) {
    keys.push(
      options.translate.on('translatestart', event => {
        translateBefore = captureFeatureGeometries(event.features.getArray() as EditableFeature[]);
      }),
      options.translate.on('translateend', event => {
        const after = captureFeatureGeometries(event.features.getArray() as EditableFeature[]);
        if (translateBefore.length > 0) {
          void options.history.record(
            createGeometryChangeCommand({
              before: translateBefore,
              after,
              label: options.labels?.translate ?? 'Translate features',
            }),
          );
        }
        translateBefore = [];
      }),
    );
  }

  return () => {
    unByKey(keys);
    modifyBefore = [];
    translateBefore = [];
  };
}

function normalizeFeatures(
  features: EditableFeature | readonly EditableFeature[],
): readonly EditableFeature[] {
  return Array.isArray(features) ? [...features] : [features];
}

function hasFeature(source: VectorSource<EditableFeature>, feature: EditableFeature): boolean {
  return source.getFeatures().includes(feature);
}

function cloneGeometryState(
  state: readonly FeatureGeometryState[],
): readonly FeatureGeometryState[] {
  return state.map(item => ({
    feature: item.feature,
    geometry: item.geometry?.clone(),
  }));
}

function applyGeometryState(state: readonly FeatureGeometryState[]): void {
  for (const item of state) {
    item.feature.setGeometry(item.geometry?.clone());
  }
}
