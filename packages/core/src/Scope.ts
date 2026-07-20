import type {EventsKey} from 'ol/events.js';
import {unByKey} from 'ol/Observable.js';
import type Control from 'ol/control/Control.js';
import type Interaction from 'ol/interaction/Interaction.js';
import type BaseLayer from 'ol/layer/Base.js';
import type Overlay from 'ol/Overlay.js';
import type {ControlOptions} from './Controls.js';
import type {EventListener} from './events.js';
import type {LayerOptions} from './Layers.js';
import type {Map} from './Map.js';
import type {Registry, RegistryEventMap} from './Registry.js';
import type {MapEventMap} from './types.js';

/** A synchronous or asynchronous resource cleanup callback. */
export type Cleanup = () => void | Promise<void>;

/** Owns resources that should be released together. */
export class Scope {
  public readonly name: string | undefined;
  private readonly cleanups: Cleanup[] = [];
  private disposed = false;

  public constructor(
    private readonly map: Map,
    name?: string,
    private readonly onDispose?: (scope: Scope) => void,
  ) {
    this.name = name;
  }

  /** Add a cleanup callback to the scope. Callbacks run in reverse order. */
  public add(cleanup: Cleanup): this {
    this.assertActive();
    this.cleanups.push(cleanup);
    return this;
  }

  /** Add a layer and remove it automatically with the scope. */
  public addLayer<TLayer extends BaseLayer>(layer: TLayer, options: LayerOptions = {}): TLayer {
    this.assertActive();
    this.map.addLayer(layer, options);
    this.add(() => {
      this.map.removeLayer(layer);
    });
    return layer;
  }

  /** Add a control and remove it automatically with the scope. */
  public addControl<TControl extends Control>(
    control: TControl,
    options: ControlOptions = {},
  ): TControl {
    this.assertActive();
    this.map.addControl(control, options);
    this.add(() => {
      this.map.removeControl(control);
    });
    return control;
  }

  /** Add an interaction and remove it automatically with the scope. */
  public addInteraction<TInteraction extends Interaction>(interaction: TInteraction): TInteraction {
    this.assertActive();
    this.map.addInteraction(interaction);
    this.add(() => {
      this.map.removeInteraction(interaction);
    });
    return interaction;
  }

  /** Add an overlay and remove it automatically with the scope. */
  public addOverlay<TOverlay extends Overlay>(overlay: TOverlay): TOverlay {
    this.assertActive();
    this.map.addOverlay(overlay);
    this.add(() => {
      this.map.removeOverlay(overlay);
    });
    return overlay;
  }

  /** Track one or more OpenLayers event keys. */
  public trackKey(key: EventsKey | readonly EventsKey[]): this {
    this.assertActive();
    this.add(() => {
      unByKey(key as EventsKey | EventsKey[]);
    });
    return this;
  }

  /** Register and automatically remove an OMap map event listener. */
  public on<K extends keyof MapEventMap>(
    source: Map,
    type: K,
    listener: EventListener<MapEventMap[K]>,
  ): this;
  /** Register and automatically remove a registry event listener. */
  public on<K extends keyof RegistryEventMap>(
    source: Registry,
    type: K,
    listener: EventListener<RegistryEventMap[K]>,
  ): this;
  public on(
    source: Map | Registry,
    type: string,
    listener: EventListener<unknown>,
  ): this {
    this.assertActive();
    const eventSource = source as unknown as {
      on(eventType: string, eventListener: EventListener<unknown>): unknown;
      off(eventType: string, eventListener: EventListener<unknown>): unknown;
    };
    eventSource.on(type, listener);
    this.add(() => {
      eventSource.off(type, listener);
    });
    return this;
  }

  /** Dispose all owned resources in reverse registration order. */
  public async dispose(): Promise<void> {
    if (this.disposed) return;

    this.disposed = true;
    const errors: unknown[] = [];
    for (const cleanup of this.cleanups.reverse()) {
      try {
        await cleanup();
      } catch (error) {
        errors.push(error);
      }
    }
    this.cleanups.length = 0;
    this.onDispose?.(this);

    if (errors.length > 0) {
      throw new AggregateError(errors, `Failed to dispose scope${this.name ? ` "${this.name}"` : ''}.`);
    }
  }

  /** Return whether the scope has been disposed. */
  public isDisposed(): boolean {
    return this.disposed;
  }

  private assertActive(): void {
    if (this.disposed) throw new Error('Scope has already been disposed.');
  }
}
