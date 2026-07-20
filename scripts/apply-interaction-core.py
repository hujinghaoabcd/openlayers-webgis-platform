from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    file_path = Path(path)
    text = file_path.read_text(encoding="utf-8")
    if old not in text:
        raise RuntimeError(f"Expected text not found in {path}: {old[:80]!r}")
    file_path.write_text(text.replace(old, new, 1), encoding="utf-8")


interactions_source = r'''import type Collection from 'ol/Collection.js';
import type {EventsKey} from 'ol/events.js';
import type OlMap from 'ol/Map.js';
import {unByKey} from 'ol/Observable.js';
import type Interaction from 'ol/interaction/Interaction.js';
import {Events, type EventListener} from './events.js';

/** OMap metadata properties stored on native OpenLayers interactions. */
export const INTERACTION_PROPERTY = {
  id: 'id',
  title: 'title',
  type: 'type',
  group: 'group',
} as const;

/** Metadata shared by every managed interaction. */
export interface InteractionMetadata {
  readonly id: string;
  readonly title: string | undefined;
  readonly type: string | undefined;
  readonly group: string | undefined;
}

/** Options used when adding or updating an interaction. */
export interface InteractionOptions {
  readonly id?: string;
  readonly title?: string;
  readonly type?: string;
  readonly group?: string;
  readonly active?: boolean;
  readonly replace?: boolean;
}

/** Snapshot of a managed interaction and its runtime state. */
export interface InteractionInfo extends InteractionMetadata {
  readonly interaction: Interaction;
  readonly index: number;
  readonly active: boolean;
}

/** Events emitted by the managed interaction collection. */
export interface InteractionsEventMap {
  add: {readonly interaction: Interaction; readonly id: string; readonly index: number};
  remove: {readonly interaction: Interaction; readonly id: string; readonly index: number};
  active: {
    readonly interaction: Interaction;
    readonly id: string;
    readonly active: boolean;
    readonly group: string | undefined;
  };
  order: {
    readonly interaction: Interaction;
    readonly id: string;
    readonly from: number;
    readonly to: number;
  };
  metadata: {readonly interaction: Interaction; readonly metadata: InteractionMetadata};
}

/** Apply OMap metadata and initial active state to a native interaction. */
export function configureInteraction<TInteraction extends Interaction>(
  interaction: TInteraction,
  options: Omit<InteractionOptions, 'replace'> = {},
): TInteraction {
  if (options.id !== undefined) {
    const id = normalizeId(options.id);
    if (!id) throw new TypeError('Interaction id must be a non-empty string.');
    interaction.set(INTERACTION_PROPERTY.id, id);
  }
  if (options.title !== undefined) interaction.set(INTERACTION_PROPERTY.title, options.title);
  if (options.type !== undefined) interaction.set(INTERACTION_PROPERTY.type, options.type);
  if (options.group !== undefined) interaction.set(INTERACTION_PROPERTY.group, options.group);
  if (options.active !== undefined) interaction.setActive(options.active);
  return interaction;
}

/** Return an interaction id when one has been assigned. */
export function getInteractionId(interaction: Interaction): string | undefined {
  return normalizeId(interaction.get(INTERACTION_PROPERTY.id));
}

/** Managed view of an OpenLayers map interaction collection. */
export class Interactions {
  private readonly collection: Collection<Interaction>;
  private readonly events = new Events<InteractionsEventMap>();
  private readonly byId = new globalThis.Map<string, Interaction>();
  private readonly idsByInteraction = new WeakMap<Interaction, string>();
  private readonly interactionKeys = new WeakMap<Interaction, EventsKey[]>();
  private readonly collectionKeys: EventsKey[];
  private readonly updating = new WeakSet<Interaction>();
  private sequence = 0;
  private moving = false;
  private destroyed = false;

  public constructor(map: OlMap) {
    this.collection = map.getInteractions();
    for (const interaction of this.collection.getArray()) this.register(interaction, false);

    this.collectionKeys = [
      this.collection.on('add', event => {
        if (!this.moving) this.register(event.element, true, event.index);
      }),
      this.collection.on('remove', event => {
        if (!this.moving) this.unregister(event.element, true, event.index);
      }),
    ];
  }

  /** Register a typed interaction collection listener. */
  public on<K extends keyof InteractionsEventMap>(
    type: K,
    listener: EventListener<InteractionsEventMap[K]>,
  ): this {
    this.events.on(type, listener);
    return this;
  }

  /** Register a typed listener that runs once. */
  public once<K extends keyof InteractionsEventMap>(
    type: K,
    listener: EventListener<InteractionsEventMap[K]>,
  ): this {
    this.events.once(type, listener);
    return this;
  }

  /** Remove interaction collection listeners. */
  public off(): this;
  public off<K extends keyof InteractionsEventMap>(type: K): this;
  public off<K extends keyof InteractionsEventMap>(
    type: K,
    listener: EventListener<InteractionsEventMap[K]>,
  ): this;
  public off<K extends keyof InteractionsEventMap>(
    type?: K,
    listener?: EventListener<InteractionsEventMap[K]>,
  ): this {
    if (type === undefined) this.events.off();
    else if (listener === undefined) this.events.off(type);
    else this.events.off(type, listener);
    return this;
  }

  /** Add a native OpenLayers interaction to the collection. */
  public add<TInteraction extends Interaction>(
    interaction: TInteraction,
    options: InteractionOptions = {},
  ): TInteraction {
    this.assertActive();
    const existingIndex = this.collection.getArray().indexOf(interaction);
    if (existingIndex >= 0) {
      this.update(interaction, options);
      return interaction;
    }

    const requestedId = normalizeId(options.id ?? interaction.get(INTERACTION_PROPERTY.id));
    if (requestedId) {
      const existing = this.byId.get(requestedId);
      if (existing) {
        if (!options.replace) {
          throw new Error(`Interaction id is already registered: ${requestedId}`);
        }
        this.remove(existing);
      }
    }

    const {replace: _replace, ...configuration} = options;
    configureInteraction(interaction, configuration);
    this.collection.push(interaction);
    return interaction;
  }

  /** Remove an interaction by object or stable id. */
  public remove(interactionOrId: Interaction | string): Interaction | undefined {
    this.assertActive();
    const interaction = this.resolve(interactionOrId);
    return interaction ? this.collection.remove(interaction) : undefined;
  }

  /** Remove all managed interactions. */
  public clear(): void {
    this.assertActive();
    for (const interaction of this.all()) this.collection.remove(interaction);
  }

  /** Return a managed interaction by id. */
  public get<TInteraction extends Interaction = Interaction>(id: string): TInteraction | undefined {
    return this.byId.get(id) as TInteraction | undefined;
  }

  /** Return a managed interaction by id or throw. */
  public require<TInteraction extends Interaction = Interaction>(id: string): TInteraction {
    const interaction = this.get<TInteraction>(id);
    if (!interaction) throw new Error(`Interaction is not registered: ${id}`);
    return interaction;
  }

  /** Return whether an interaction object or id is present. */
  public has(interactionOrId: Interaction | string): boolean {
    return this.resolve(interactionOrId) !== undefined;
  }

  /** Return all interactions in collection order. */
  public all(): Interaction[] {
    return [...this.collection.getArray()];
  }

  /** Return all registered interaction ids in collection order. */
  public ids(): string[] {
    return this.all().map(interaction => this.id(interaction));
  }

  /** Return the number of managed interactions. */
  public count(): number {
    return this.collection.getLength();
  }

  /** Return the stable id assigned to an interaction. */
  public id(interaction: Interaction): string {
    const id = this.idsByInteraction.get(interaction);
    if (!id) throw new Error('Interaction is not managed by this map.');
    return id;
  }

  /** Return a snapshot of one interaction. */
  public info(interactionOrId: Interaction | string): InteractionInfo {
    const interaction = this.requireInteraction(interactionOrId);
    return {
      ...this.metadata(interaction),
      interaction,
      index: this.collection.getArray().indexOf(interaction),
      active: interaction.getActive(),
    };
  }

  /** Update interaction metadata and active state. */
  public update<TInteraction extends Interaction>(
    interactionOrId: TInteraction | string,
    options: InteractionOptions,
  ): TInteraction {
    this.assertActive();
    const interaction = this.requireInteraction(interactionOrId) as TInteraction;
    const previousId = this.id(interaction);
    const nextId = options.id === undefined ? previousId : normalizeId(options.id);
    if (!nextId) throw new TypeError('Interaction id must be a non-empty string.');

    const conflicting = this.byId.get(nextId);
    if (conflicting && conflicting !== interaction) {
      if (!options.replace) throw new Error(`Interaction id is already registered: ${nextId}`);
      this.remove(conflicting);
    }

    const {replace: _replace, active, ...configuration} = options;
    this.updating.add(interaction);
    try {
      configureInteraction(interaction, configuration);
      if (nextId !== previousId) {
        this.byId.delete(previousId);
        this.byId.set(nextId, interaction);
        this.idsByInteraction.set(interaction, nextId);
        interaction.set(INTERACTION_PROPERTY.id, nextId, true);
      }
    } finally {
      this.updating.delete(interaction);
    }

    this.events.emit('metadata', {interaction, metadata: this.metadata(interaction)});
    if (active !== undefined) this.setActive(interaction, active);
    else if (interaction.getActive()) this.deactivatePeers(interaction);
    return interaction;
  }

  /** Activate an interaction and deactivate active peers in the same group. */
  public activate(interactionOrId: Interaction | string): Interaction {
    return this.setActive(interactionOrId, true);
  }

  /** Deactivate an interaction without removing it. */
  public deactivate(interactionOrId: Interaction | string): Interaction {
    return this.setActive(interactionOrId, false);
  }

  /** Toggle an interaction and return its new active state. */
  public toggle(interactionOrId: Interaction | string): boolean {
    const interaction = this.requireInteraction(interactionOrId);
    const active = !interaction.getActive();
    this.setActive(interaction, active);
    return active;
  }

  /** Return whether a managed interaction is active. */
  public isActive(interactionOrId: Interaction | string): boolean {
    return this.requireInteraction(interactionOrId).getActive();
  }

  /** Set the active state of a managed interaction. */
  public setActive(interactionOrId: Interaction | string, active: boolean): Interaction {
    const interaction = this.requireInteraction(interactionOrId);
    if (active) this.deactivatePeers(interaction);
    if (interaction.getActive() !== active) interaction.setActive(active);
    return interaction;
  }

  /** Return active interactions, optionally limited to an exclusive group. */
  public active(group?: string): Interaction[] {
    return this.all().filter(interaction => {
      if (!interaction.getActive()) return false;
      return group === undefined || readGroup(interaction) === group;
    });
  }

  /** Return the active interaction in an exclusive group, when present. */
  public current(group: string): Interaction | undefined {
    return this.active(group)[0];
  }

  /** Deactivate every interaction in a group. */
  public deactivateGroup(group: string): void {
    for (const interaction of this.active(group)) interaction.setActive(false);
  }

  /** Move an interaction to a zero-based collection index. */
  public move(interactionOrId: Interaction | string, index: number): Interaction {
    this.assertActive();
    const interaction = this.requireInteraction(interactionOrId);
    const from = this.collection.getArray().indexOf(interaction);
    const to = Math.max(0, Math.min(Math.trunc(index), this.collection.getLength() - 1));
    if (from === to) return interaction;

    this.moving = true;
    try {
      this.collection.removeAt(from);
      this.collection.insertAt(to, interaction);
    } finally {
      this.moving = false;
    }
    this.events.emit('order', {interaction, id: this.id(interaction), from, to});
    return interaction;
  }

  /** Move an interaction to the end of the native collection. */
  public bringToFront(interactionOrId: Interaction | string): Interaction {
    return this.move(interactionOrId, this.collection.getLength() - 1);
  }

  /** Move an interaction to the beginning of the native collection. */
  public sendToBack(interactionOrId: Interaction | string): Interaction {
    return this.move(interactionOrId, 0);
  }

  /** Stop observing the native collection and its interactions. */
  public destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    unByKey(this.collectionKeys);
    for (const interaction of this.collection.getArray()) this.detach(interaction);
    this.byId.clear();
    this.events.off();
  }

  private register(interaction: Interaction, emit: boolean, index?: number): void {
    let id = getInteractionId(interaction);
    if (!id) id = this.nextId(interaction.constructor.name || 'interaction');
    else if (this.byId.has(id) && this.byId.get(id) !== interaction) id = this.nextId(id);

    interaction.set(INTERACTION_PROPERTY.id, id, true);
    this.byId.set(id, interaction);
    this.idsByInteraction.set(interaction, id);
    this.attach(interaction);
    if (interaction.getActive()) this.deactivatePeers(interaction);

    if (emit) {
      this.events.emit('add', {
        interaction,
        id,
        index: index ?? this.collection.getArray().indexOf(interaction),
      });
    }
  }

  private unregister(interaction: Interaction, emit: boolean, index?: number): void {
    const id = this.idsByInteraction.get(interaction) ?? getInteractionId(interaction) ?? 'unknown';
    this.detach(interaction);
    this.idsByInteraction.delete(interaction);
    if (this.byId.get(id) === interaction) this.byId.delete(id);
    if (emit) this.events.emit('remove', {interaction, id, index: index ?? -1});
  }

  private attach(interaction: Interaction): void {
    const keys = [
      interaction.on('propertychange', event => this.handlePropertyChange(interaction, event.key)),
    ];
    this.interactionKeys.set(interaction, keys);
  }

  private detach(interaction: Interaction): void {
    const keys = this.interactionKeys.get(interaction);
    if (keys) unByKey(keys);
    this.interactionKeys.delete(interaction);
  }

  private handlePropertyChange(interaction: Interaction, key: string): void {
    if (key === 'active') {
      if (interaction.getActive()) this.deactivatePeers(interaction);
      this.events.emit('active', {
        interaction,
        id: this.id(interaction),
        active: interaction.getActive(),
        group: readGroup(interaction),
      });
      return;
    }

    if (this.updating.has(interaction) || !isMetadataKey(key)) return;
    if (key === INTERACTION_PROPERTY.id) {
      const previousId = this.idsByInteraction.get(interaction);
      const nextId = getInteractionId(interaction);
      if (!previousId) return;
      if (!nextId || (this.byId.has(nextId) && this.byId.get(nextId) !== interaction)) {
        interaction.set(INTERACTION_PROPERTY.id, previousId, true);
        return;
      }
      if (nextId !== previousId) {
        this.byId.delete(previousId);
        this.byId.set(nextId, interaction);
        this.idsByInteraction.set(interaction, nextId);
      }
    }
    if (key === INTERACTION_PROPERTY.group && interaction.getActive()) {
      this.deactivatePeers(interaction);
    }
    this.events.emit('metadata', {interaction, metadata: this.metadata(interaction)});
  }

  private deactivatePeers(interaction: Interaction): void {
    const group = readGroup(interaction);
    if (!group) return;
    for (const peer of this.collection.getArray()) {
      if (peer !== interaction && peer.getActive() && readGroup(peer) === group) {
        peer.setActive(false);
      }
    }
  }

  private metadata(interaction: Interaction): InteractionMetadata {
    return {
      id: this.id(interaction),
      title: readString(interaction, INTERACTION_PROPERTY.title),
      type: readString(interaction, INTERACTION_PROPERTY.type),
      group: readGroup(interaction),
    };
  }

  private resolve(interactionOrId: Interaction | string): Interaction | undefined {
    if (typeof interactionOrId === 'string') return this.byId.get(interactionOrId);
    return this.collection.getArray().includes(interactionOrId) ? interactionOrId : undefined;
  }

  private requireInteraction(interactionOrId: Interaction | string): Interaction {
    const interaction = this.resolve(interactionOrId);
    if (!interaction) {
      const label = typeof interactionOrId === 'string' ? interactionOrId : 'provided object';
      throw new Error(`Interaction is not managed by this map: ${label}`);
    }
    return interaction;
  }

  private nextId(prefix: string): string {
    const base = normalizePrefix(prefix);
    let id: string;
    do {
      this.sequence += 1;
      id = `${base}-${this.sequence}`;
    } while (this.byId.has(id));
    return id;
  }

  private assertActive(): void {
    if (this.destroyed) throw new Error('Interaction collection has been destroyed.');
  }
}

function normalizeId(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const id = value.trim();
  return id.length > 0 ? id : undefined;
}

function normalizePrefix(value: string): string {
  const normalized = value
    .replace(/Interaction$/u, '')
    .replace(/([a-z0-9])([A-Z])/gu, '$1-$2')
    .replace(/[^a-zA-Z0-9]+/gu, '-')
    .replace(/^-+|-+$/gu, '')
    .toLowerCase();
  return normalized || 'interaction';
}

function readString(interaction: Interaction, key: string): string | undefined {
  const value = interaction.get(key);
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined;
}

function readGroup(interaction: Interaction): string | undefined {
  return readString(interaction, INTERACTION_PROPERTY.group);
}

function isMetadataKey(key: string): boolean {
  return Object.values(INTERACTION_PROPERTY).includes(
    key as (typeof INTERACTION_PROPERTY)[keyof typeof INTERACTION_PROPERTY],
  );
}
'''

interactions_test = r'''import Interaction from 'ol/interaction/Interaction.js';
import {describe, expect, it, vi} from 'vitest';
import {Map} from './Map.js';

class TestInteraction extends Interaction {}

describe('Interactions', () => {
  it('assigns stable ids and supports lookup and removal by id', async () => {
    const map = new Map({controls: [], interactions: []});
    const interaction = new TestInteraction();

    map.addInteraction(interaction);
    const id = map.interactions.info(interaction).id;

    expect(id).toMatch(/^test-/);
    expect(map.getInteraction(id)).toBe(interaction);
    expect(map.hasInteraction(id)).toBe(true);
    expect(map.removeInteraction(id)).toBe(interaction);
    expect(map.hasInteraction(id)).toBe(false);

    await map.remove();
  });

  it('rejects duplicate ids unless replacement is explicit', async () => {
    const map = new Map({controls: [], interactions: []});
    const first = new TestInteraction();
    const second = new TestInteraction();

    map.addInteraction(first, {id: 'draw'});
    expect(() => map.addInteraction(second, {id: 'draw'})).toThrow(
      'Interaction id is already registered: draw',
    );

    map.addInteraction(second, {id: 'draw', replace: true});
    expect(map.getInteraction('draw')).toBe(second);
    expect(map.hasInteraction(first)).toBe(false);

    await map.remove();
  });

  it('activates and deactivates interactions with typed events', async () => {
    const map = new Map({controls: [], interactions: []});
    const interaction = new TestInteraction({active: false});
    const active = vi.fn();

    map.addInteraction(interaction, {id: 'select', group: 'tools'});
    map.on('interaction:active', active);
    map.activateInteraction('select');

    expect(map.interactions.isActive('select')).toBe(true);
    expect(active).toHaveBeenLastCalledWith({
      interaction,
      id: 'select',
      active: true,
      group: 'tools',
    });

    map.deactivateInteraction('select');
    expect(map.interactions.isActive('select')).toBe(false);

    await map.remove();
  });

  it('enforces one active interaction per exclusive group', async () => {
    const map = new Map({controls: [], interactions: []});
    const draw = new TestInteraction({active: false});
    const modify = new TestInteraction({active: false});

    map.addInteraction(draw, {id: 'draw', group: 'editing'});
    map.addInteraction(modify, {id: 'modify', group: 'editing'});

    map.activateInteraction('draw');
    expect(map.interactions.current('editing')).toBe(draw);

    map.activateInteraction('modify');
    expect(draw.getActive()).toBe(false);
    expect(modify.getActive()).toBe(true);
    expect(map.interactions.current('editing')).toBe(modify);
    expect(map.interactions.active('editing')).toEqual([modify]);

    await map.remove();
  });

  it('synchronizes native collection changes and ordering', async () => {
    const map = new Map({controls: [], interactions: []});
    const first = new TestInteraction();
    const second = new TestInteraction();
    const added = vi.fn();
    const ordered = vi.fn();

    map.on('interaction:add', added).on('interaction:order', ordered);
    map.native.addInteraction(first);
    map.addInteraction(second, {id: 'second'});
    const firstId = map.interactions.id(first);

    expect(added).toHaveBeenCalledWith({interaction: first, id: firstId, index: 0});
    map.interactions.sendToBack('second');
    expect(map.interactions.ids()).toEqual(['second', firstId]);
    expect(ordered).toHaveBeenCalledWith({
      interaction: second,
      id: 'second',
      from: 1,
      to: 0,
    });

    await map.remove();
  });
});
'''

Path('packages/core/src/Interactions.ts').write_text(interactions_source, encoding='utf-8')
Path('packages/core/src/Interactions.test.ts').write_text(interactions_test, encoding='utf-8')

replace_once(
    'packages/core/src/Map.ts',
    "import {Layers, type LayerOptions} from './Layers.js';",
    "import {Interactions, type InteractionOptions} from './Interactions.js';\nimport {Layers, type LayerOptions} from './Layers.js';",
)
replace_once(
    'packages/core/src/Map.ts',
    'OMap adds a concise lifecycle, events, managed layers, sources and controls,\n * scopes, registry and plugins while keeping the underlying OpenLayers map',
    'OMap adds a concise lifecycle, events, managed layers, sources, controls and\n * interactions, scopes, registry and plugins while keeping the underlying OpenLayers map',
)
replace_once(
    'packages/core/src/Map.ts',
    "  /** Managed control collection backed by the native OpenLayers collection. */\n  public readonly controls: Controls;",
    "  /** Managed control collection backed by the native OpenLayers collection. */\n  public readonly controls: Controls;\n\n  /** Managed interaction collection backed by the native OpenLayers collection. */\n  public readonly interactions: Interactions;",
)
replace_once(
    'packages/core/src/Map.ts',
    "    this.controls = new Controls(this.native);\n    this.bindLayerEvents();",
    "    this.controls = new Controls(this.native);\n    this.interactions = new Interactions(this.native);\n    this.bindLayerEvents();",
)
replace_once(
    'packages/core/src/Map.ts',
    "    this.bindControlEvents();\n  }",
    "    this.bindControlEvents();\n    this.bindInteractionEvents();\n  }",
)
replace_once(
    'packages/core/src/Map.ts',
    "  /** Add an interaction to the map. */\n  public addInteraction(interaction: Interaction): this {\n    this.assertActive();\n    this.native.addInteraction(interaction);\n    this.events.emit('interaction:add', {interaction});\n    return this;\n  }\n\n  /** Remove an interaction from the map. */\n  public removeInteraction(interaction: Interaction): Interaction | undefined {\n    this.assertActive();\n    const removed = this.native.removeInteraction(interaction);\n    if (removed) this.events.emit('interaction:remove', {interaction: removed});\n    return removed;\n  }",
    "  /** Add an interaction through the managed interaction collection. */\n  public addInteraction(interaction: Interaction, options: InteractionOptions = {}): this {\n    this.assertActive();\n    this.interactions.add(interaction, options);\n    return this;\n  }\n\n  /** Remove an interaction by object or stable id. */\n  public removeInteraction(interactionOrId: Interaction | string): Interaction | undefined {\n    this.assertActive();\n    return this.interactions.remove(interactionOrId);\n  }\n\n  /** Return a managed interaction by stable id. */\n  public getInteraction<TInteraction extends Interaction = Interaction>(\n    id: string,\n  ): TInteraction | undefined {\n    return this.interactions.get<TInteraction>(id);\n  }\n\n  /** Return whether a managed interaction id or object exists. */\n  public hasInteraction(interactionOrId: Interaction | string): boolean {\n    return this.interactions.has(interactionOrId);\n  }\n\n  /** Activate a managed interaction and deactivate peers in the same group. */\n  public activateInteraction(interactionOrId: Interaction | string): this {\n    this.interactions.activate(interactionOrId);\n    return this;\n  }\n\n  /** Deactivate a managed interaction without removing it. */\n  public deactivateInteraction(interactionOrId: Interaction | string): this {\n    this.interactions.deactivate(interactionOrId);\n    return this;\n  }",
)
replace_once(
    'packages/core/src/Map.ts',
    "    this.registry.clear();\n    this.controls.destroy();",
    "    this.registry.clear();\n    this.interactions.destroy();\n    this.controls.destroy();",
)
replace_once(
    'packages/core/src/Map.ts',
    "  private createPluginContext(scope: Scope): PluginContext {",
    "  private bindInteractionEvents(): void {\n    this.interactions.on('add', event => this.events.emit('interaction:add', event));\n    this.interactions.on('remove', event => this.events.emit('interaction:remove', event));\n    this.interactions.on('active', event => this.events.emit('interaction:active', event));\n    this.interactions.on('order', event => this.events.emit('interaction:order', event));\n    this.interactions.on('metadata', event => this.events.emit('interaction:metadata', event));\n  }\n\n  private createPluginContext(scope: Scope): PluginContext {",
)

replace_once(
    'packages/core/src/Scope.ts',
    "import type {LayerOptions} from './Layers.js';",
    "import type {InteractionOptions} from './Interactions.js';\nimport type {LayerOptions} from './Layers.js';",
)
replace_once(
    'packages/core/src/Scope.ts',
    "  /** Add an interaction and remove it automatically with the scope. */\n  public addInteraction<TInteraction extends Interaction>(interaction: TInteraction): TInteraction {\n    this.assertActive();\n    this.map.addInteraction(interaction);\n    this.add(() => {\n      this.map.removeInteraction(interaction);\n    });\n    return interaction;\n  }",
    "  /** Add an interaction and remove it automatically with the scope. */\n  public addInteraction<TInteraction extends Interaction>(\n    interaction: TInteraction,\n    options: InteractionOptions = {},\n  ): TInteraction {\n    this.assertActive();\n    this.map.addInteraction(interaction, options);\n    this.add(() => {\n      this.map.removeInteraction(interaction);\n    });\n    return interaction;\n  }",
)

replace_once(
    'packages/core/src/types.ts',
    "import type {LayersEventMap} from './Layers.js';",
    "import type {InteractionsEventMap} from './Interactions.js';\nimport type {LayersEventMap} from './Layers.js';",
)
replace_once(
    'packages/core/src/types.ts',
    "  'interaction:add': {readonly interaction: Interaction};\n  'interaction:remove': {readonly interaction: Interaction};",
    "  'interaction:add': InteractionsEventMap['add'];\n  'interaction:remove': InteractionsEventMap['remove'];\n  'interaction:active': InteractionsEventMap['active'];\n  'interaction:order': InteractionsEventMap['order'];\n  'interaction:metadata': InteractionsEventMap['metadata'];",
)

replace_once(
    'packages/core/src/index.ts',
    "export type {EventListener, EventName} from './events.js';",
    "export {\n  configureInteraction,\n  getInteractionId,\n  INTERACTION_PROPERTY,\n  Interactions,\n} from './Interactions.js';\nexport type {EventListener, EventName} from './events.js';",
)
replace_once(
    'packages/core/src/index.ts',
    "export type {\n  LayerInfo,",
    "export type {\n  InteractionInfo,\n  InteractionMetadata,\n  InteractionOptions,\n  InteractionsEventMap,\n} from './Interactions.js';\nexport type {\n  LayerInfo,",
)
