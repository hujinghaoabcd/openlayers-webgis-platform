/** A listener for one event payload. */
export type EventListener<TPayload> = (event: TPayload) => void;

/** Event names accepted by an event map. */
export type EventName<TEvents extends object> = Extract<keyof TEvents, string>;

interface ListenerRecord<TPayload> {
  readonly listener: EventListener<TPayload>;
  readonly once: boolean;
}

/**
 * Small synchronous, type-safe event dispatcher.
 *
 * Event maps are ordinary interfaces whose keys are event names and whose
 * values are listener payloads.
 */
export class Events<TEvents extends object> {
  private readonly listeners = new globalThis.Map<
    EventName<TEvents>,
    Set<ListenerRecord<TEvents[EventName<TEvents>]>>
  >();

  /** Register an event listener. */
  public on<K extends EventName<TEvents>>(type: K, listener: EventListener<TEvents[K]>): this {
    this.add(type, listener, false);
    return this;
  }

  /** Register a listener that is removed before its first invocation. */
  public once<K extends EventName<TEvents>>(type: K, listener: EventListener<TEvents[K]>): this {
    this.add(type, listener, true);
    return this;
  }

  /**
   * Remove listeners.
   *
   * Calling without arguments removes every listener. Passing only an event
   * name removes all listeners for that event.
   */
  public off(): this;
  public off<K extends EventName<TEvents>>(type: K): this;
  public off<K extends EventName<TEvents>>(type: K, listener: EventListener<TEvents[K]>): this;
  public off<K extends EventName<TEvents>>(
    type?: K,
    listener?: EventListener<TEvents[K]>,
  ): this {
    if (type === undefined) {
      this.listeners.clear();
      return this;
    }

    const records = this.listeners.get(type);
    if (!records) {
      return this;
    }

    if (listener === undefined) {
      this.listeners.delete(type);
      return this;
    }

    for (const record of records) {
      if (record.listener === listener) {
        records.delete(record);
      }
    }

    if (records.size === 0) {
      this.listeners.delete(type);
    }
    return this;
  }

  /** Dispatch an event to a stable snapshot of its listeners. */
  public emit<K extends EventName<TEvents>>(type: K, event: TEvents[K]): this {
    const records = this.listeners.get(type);
    if (!records || records.size === 0) {
      return this;
    }

    for (const record of [...records]) {
      if (record.once) {
        records.delete(record);
      }
      (record.listener as EventListener<TEvents[K]>)(event);
    }

    if (records.size === 0) {
      this.listeners.delete(type);
    }
    return this;
  }

  /** Return whether at least one listener is registered for an event. */
  public listens<K extends EventName<TEvents>>(type: K): boolean {
    return (this.listeners.get(type)?.size ?? 0) > 0;
  }

  private add<K extends EventName<TEvents>>(
    type: K,
    listener: EventListener<TEvents[K]>,
    once: boolean,
  ): void {
    let records = this.listeners.get(type);
    if (!records) {
      records = new Set<ListenerRecord<TEvents[EventName<TEvents>]>>();
      this.listeners.set(type, records);
    }

    records.add({
      listener: listener as EventListener<TEvents[EventName<TEvents>]>,
      once,
    });
  }
}
