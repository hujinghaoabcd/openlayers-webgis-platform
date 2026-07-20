import {Events, type EventListener} from './events.js';

/** One reversible operation accepted by {@link History}. */
export interface Command<TResult = void> {
  /** Human-readable operation name used by history UIs. */
  readonly label: string;
  /** Apply the operation for the first time. */
  execute(): TResult | Promise<TResult>;
  /** Revert the applied operation. */
  undo(): void | Promise<void>;
  /** Reapply an undone operation. Defaults to {@link execute}. */
  redo?(): TResult | Promise<TResult>;
}

/** Options used to create a command history. */
export interface HistoryOptions {
  /** Maximum number of undo entries retained in memory. */
  readonly limit?: number;
}

/** One immutable history entry. */
export interface HistoryEntry {
  readonly id: number;
  readonly command: Command<unknown>;
  readonly createdAt: number;
}

/** Serializable state intended for toolbars and status panels. */
export interface HistoryState {
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly undoDepth: number;
  readonly redoDepth: number;
  readonly undoLabel: string | undefined;
  readonly redoLabel: string | undefined;
}

/** Operations that can fail while mutating history. */
export type HistoryAction = 'execute' | 'record' | 'undo' | 'redo' | 'clear';

/** Events emitted by a command history. */
export interface HistoryEventMap {
  execute: {readonly entry: HistoryEntry};
  record: {readonly entry: HistoryEntry};
  undo: {readonly entry: HistoryEntry};
  redo: {readonly entry: HistoryEntry};
  clear: {readonly undoDepth: number; readonly redoDepth: number};
  change: {readonly state: HistoryState};
  error: {
    readonly action: HistoryAction;
    readonly command: Command<unknown> | undefined;
    readonly error: unknown;
  };
}

const DEFAULT_HISTORY_LIMIT = 100;

/**
 * Ordered, asynchronous command history with undo and redo support.
 *
 * Operations are serialized so an asynchronous command cannot race with a
 * following undo, redo or record call.
 */
export class History {
  public readonly limit: number;

  private readonly events = new Events<HistoryEventMap>();
  private readonly undoStack: HistoryEntry[] = [];
  private readonly redoStack: HistoryEntry[] = [];
  private tail: Promise<void> = Promise.resolve();
  private nextId = 1;
  private destroyed = false;

  public constructor(options: HistoryOptions = {}) {
    const limit = options.limit ?? DEFAULT_HISTORY_LIMIT;
    if (!Number.isInteger(limit) || limit < 1) {
      throw new Error('History limit must be a positive integer.');
    }
    this.limit = limit;
  }

  /** Register a typed history event listener. */
  public on<K extends keyof HistoryEventMap>(
    type: K,
    listener: EventListener<HistoryEventMap[K]>,
  ): this {
    this.events.on(type, listener);
    return this;
  }

  /** Register a typed listener that runs once. */
  public once<K extends keyof HistoryEventMap>(
    type: K,
    listener: EventListener<HistoryEventMap[K]>,
  ): this {
    this.events.once(type, listener);
    return this;
  }

  /** Remove history event listeners. */
  public off(): this;
  public off<K extends keyof HistoryEventMap>(type: K): this;
  public off<K extends keyof HistoryEventMap>(
    type: K,
    listener: EventListener<HistoryEventMap[K]>,
  ): this;
  public off<K extends keyof HistoryEventMap>(
    type?: K,
    listener?: EventListener<HistoryEventMap[K]>,
  ): this {
    if (type === undefined) this.events.off();
    else if (listener === undefined) this.events.off(type);
    else this.events.off(type, listener);
    return this;
  }

  /** Execute a command and add it to the undo stack after it succeeds. */
  public execute<TResult>(command: Command<TResult>): Promise<TResult> {
    this.assertActive();
    return this.enqueue(async () => {
      try {
        const result = await command.execute();
        const entry = this.push(command);
        this.events.emit('execute', {entry});
        this.emitChange();
        return result;
      } catch (error) {
        this.events.emit('error', {action: 'execute', command, error});
        throw error;
      }
    });
  }

  /**
   * Record a command whose effect has already been applied externally.
   *
   * This is intended for native interactions that mutate features before
   * dispatching events such as drawend, modifyend and translateend.
   */
  public record(command: Command<unknown>): Promise<HistoryEntry> {
    this.assertActive();
    return this.enqueue(async () => {
      try {
        const entry = this.push(command);
        this.events.emit('record', {entry});
        this.emitChange();
        return entry;
      } catch (error) {
        this.events.emit('error', {action: 'record', command, error});
        throw error;
      }
    });
  }

  /** Undo the most recent command. Returns false when there is nothing to undo. */
  public undo(): Promise<boolean> {
    this.assertActive();
    return this.enqueue(async () => {
      const entry = this.undoStack.at(-1);
      if (!entry) return false;

      try {
        await entry.command.undo();
        this.undoStack.pop();
        this.redoStack.push(entry);
        this.events.emit('undo', {entry});
        this.emitChange();
        return true;
      } catch (error) {
        this.events.emit('error', {action: 'undo', command: entry.command, error});
        throw error;
      }
    });
  }

  /** Redo the most recently undone command. Returns false when unavailable. */
  public redo(): Promise<boolean> {
    this.assertActive();
    return this.enqueue(async () => {
      const entry = this.redoStack.at(-1);
      if (!entry) return false;

      try {
        if (entry.command.redo) await entry.command.redo();
        else await entry.command.execute();
        this.redoStack.pop();
        this.undoStack.push(entry);
        this.trimUndoStack();
        this.events.emit('redo', {entry});
        this.emitChange();
        return true;
      } catch (error) {
        this.events.emit('error', {action: 'redo', command: entry.command, error});
        throw error;
      }
    });
  }

  /** Clear both history stacks without changing current application state. */
  public clear(): Promise<void> {
    this.assertActive();
    return this.enqueue(async () => {
      const undoDepth = this.undoStack.length;
      const redoDepth = this.redoStack.length;
      if (undoDepth === 0 && redoDepth === 0) return;

      this.undoStack.length = 0;
      this.redoStack.length = 0;
      this.events.emit('clear', {undoDepth, redoDepth});
      this.emitChange();
    });
  }

  /** Return whether an undo operation is currently available. */
  public canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  /** Return whether a redo operation is currently available. */
  public canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  /** Return the current immutable history state. */
  public state(): HistoryState {
    return {
      canUndo: this.canUndo(),
      canRedo: this.canRedo(),
      undoDepth: this.undoStack.length,
      redoDepth: this.redoStack.length,
      undoLabel: this.undoStack.at(-1)?.command.label,
      redoLabel: this.redoStack.at(-1)?.command.label,
    };
  }

  /** Return a stable snapshot of undo entries, oldest first. */
  public undoEntries(): readonly HistoryEntry[] {
    return [...this.undoStack];
  }

  /** Return a stable snapshot of redo entries, oldest first. */
  public redoEntries(): readonly HistoryEntry[] {
    return [...this.redoStack];
  }

  /** Wait until all previously requested history operations have settled. */
  public whenIdle(): Promise<void> {
    return this.tail;
  }

  /** Release history entries and listeners after pending operations finish. */
  public async destroy(): Promise<void> {
    if (this.destroyed) return;
    await this.whenIdle();
    this.undoStack.length = 0;
    this.redoStack.length = 0;
    this.events.off();
    this.destroyed = true;
  }

  private push(command: Command<unknown>): HistoryEntry {
    const entry: HistoryEntry = {
      id: this.nextId++,
      command,
      createdAt: Date.now(),
    };
    this.undoStack.push(entry);
    this.redoStack.length = 0;
    this.trimUndoStack();
    return entry;
  }

  private trimUndoStack(): void {
    const overflow = this.undoStack.length - this.limit;
    if (overflow > 0) this.undoStack.splice(0, overflow);
  }

  private emitChange(): void {
    this.events.emit('change', {state: this.state()});
  }

  private enqueue<TResult>(operation: () => Promise<TResult>): Promise<TResult> {
    const result = this.tail.then(operation, operation);
    this.tail = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }

  private assertActive(): void {
    if (this.destroyed) throw new Error('History has already been destroyed.');
  }
}
