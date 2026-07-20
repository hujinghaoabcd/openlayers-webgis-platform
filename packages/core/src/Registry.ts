import {Events, type EventListener} from './events.js';

/** One named value stored in a registry category. */
export interface RegistryEntry<TValue = unknown> {
  readonly kind: string;
  readonly id: string;
  readonly value: TValue;
}

/** Options controlling duplicate registry entries. */
export interface RegisterOptions {
  readonly replace?: boolean;
}

/** Events emitted by a registry. */
export interface RegistryEventMap {
  register: RegistryEntry & {readonly replaced: boolean};
  unregister: RegistryEntry;
  clear: {readonly kind: string | undefined};
}

/**
 * Category-based registry for layer, control, interaction and service
 * factories or any other named runtime value.
 */
export class Registry {
  private readonly stores = new globalThis.Map<string, globalThis.Map<string, unknown>>();
  private readonly events = new Events<RegistryEventMap>();

  /** Register a value under a category and id. */
  public register<TValue>(
    kind: string,
    id: string,
    value: TValue,
    options: RegisterOptions = {},
  ): TValue {
    this.assertKey('kind', kind);
    this.assertKey('id', id);

    const store = this.getStore(kind, true);
    const replaced = store.has(id);
    if (replaced && options.replace !== true) {
      throw new Error(`Registry entry already exists: ${kind}:${id}`);
    }

    store.set(id, value);
    this.events.emit('register', {kind, id, value, replaced});
    return value;
  }

  /** Return a registered value, or undefined when it is absent. */
  public get<TValue = unknown>(kind: string, id: string): TValue | undefined {
    return this.getStore(kind, false)?.get(id) as TValue | undefined;
  }

  /** Return a registered value or throw a descriptive error. */
  public require<TValue = unknown>(kind: string, id: string): TValue {
    if (!this.has(kind, id)) {
      throw new Error(`Registry entry not found: ${kind}:${id}`);
    }
    return this.get<TValue>(kind, id) as TValue;
  }

  /** Return whether an entry exists. */
  public has(kind: string, id: string): boolean {
    return this.getStore(kind, false)?.has(id) ?? false;
  }

  /** Remove and return an entry. */
  public unregister<TValue = unknown>(kind: string, id: string): TValue | undefined {
    const store = this.getStore(kind, false);
    if (!store || !store.has(id)) {
      return undefined;
    }

    const value = store.get(id) as TValue;
    store.delete(id);
    if (store.size === 0) {
      this.stores.delete(kind);
    }
    this.events.emit('unregister', {kind, id, value});
    return value;
  }

  /** List entries in one category. */
  public list<TValue = unknown>(kind: string): readonly RegistryEntry<TValue>[] {
    const store = this.getStore(kind, false);
    if (!store) {
      return [];
    }
    return [...store].map(([id, value]) => ({kind, id, value: value as TValue}));
  }

  /** List all non-empty categories. */
  public kinds(): readonly string[] {
    return [...this.stores.keys()];
  }

  /** Clear one category, or every category when no kind is provided. */
  public clear(kind?: string): this {
    if (kind === undefined) {
      if (this.stores.size > 0) {
        this.stores.clear();
        this.events.emit('clear', {kind: undefined});
      }
      return this;
    }

    if (this.stores.delete(kind)) {
      this.events.emit('clear', {kind});
    }
    return this;
  }

  /** Register a registry event listener. */
  public on<K extends keyof RegistryEventMap>(
    type: K,
    listener: EventListener<RegistryEventMap[K]>,
  ): this {
    this.events.on(type, listener);
    return this;
  }

  /** Remove registry event listeners. */
  public off(): this;
  public off<K extends keyof RegistryEventMap>(type: K): this;
  public off<K extends keyof RegistryEventMap>(
    type: K,
    listener: EventListener<RegistryEventMap[K]>,
  ): this;
  public off<K extends keyof RegistryEventMap>(
    type?: K,
    listener?: EventListener<RegistryEventMap[K]>,
  ): this {
    if (type === undefined) {
      this.events.off();
    } else if (listener === undefined) {
      this.events.off(type);
    } else {
      this.events.off(type, listener);
    }
    return this;
  }

  private getStore(kind: string, create: false): globalThis.Map<string, unknown> | undefined;
  private getStore(kind: string, create: true): globalThis.Map<string, unknown>;
  private getStore(kind: string, create: boolean): globalThis.Map<string, unknown> | undefined {
    let store = this.stores.get(kind);
    if (!store && create) {
      store = new globalThis.Map<string, unknown>();
      this.stores.set(kind, store);
    }
    return store;
  }

  private assertKey(name: string, value: string): void {
    if (value.trim().length === 0) {
      throw new TypeError(`Registry ${name} must be a non-empty string.`);
    }
  }
}
