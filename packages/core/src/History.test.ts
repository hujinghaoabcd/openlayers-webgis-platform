import {describe, expect, it, vi} from 'vitest';
import {History, type Command} from './History.js';

function valueCommand(
  state: {value: number},
  next: number,
  label = `Set ${next}`,
): Command<number> {
  const previous = state.value;
  return {
    label,
    execute() {
      state.value = next;
      return state.value;
    },
    undo() {
      state.value = previous;
    },
  };
}

describe('History', () => {
  it('executes, undoes and redoes commands with typed state events', async () => {
    const history = new History();
    const state = {value: 0};
    const changed = vi.fn();
    const executed = vi.fn();
    const undone = vi.fn();
    const redone = vi.fn();

    history
      .on('change', changed)
      .on('execute', executed)
      .on('undo', undone)
      .on('redo', redone);

    await expect(history.execute(valueCommand(state, 4))).resolves.toBe(4);
    expect(state.value).toBe(4);
    expect(history.state()).toMatchObject({
      canUndo: true,
      canRedo: false,
      undoDepth: 1,
      redoDepth: 0,
      undoLabel: 'Set 4',
    });

    await expect(history.undo()).resolves.toBe(true);
    expect(state.value).toBe(0);
    expect(history.canRedo()).toBe(true);

    await expect(history.redo()).resolves.toBe(true);
    expect(state.value).toBe(4);
    expect(executed).toHaveBeenCalledTimes(1);
    expect(undone).toHaveBeenCalledTimes(1);
    expect(redone).toHaveBeenCalledTimes(1);
    expect(changed).toHaveBeenCalledTimes(3);
  });

  it('records an already-applied command without executing it twice', async () => {
    const history = new History();
    const state = {value: 8};
    const execute = vi.fn(() => {
      state.value = 8;
    });
    const command: Command = {
      label: 'Draw feature',
      execute,
      undo() {
        state.value = 0;
      },
    };

    const entry = await history.record(command);
    expect(entry.command).toBe(command);
    expect(execute).not.toHaveBeenCalled();

    await history.undo();
    expect(state.value).toBe(0);
    await history.redo();
    expect(state.value).toBe(8);
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it('keeps stacks unchanged when command execution or undo fails', async () => {
    const history = new History();
    const errors = vi.fn();
    history.on('error', errors);

    const executeError = new Error('execute failed');
    await expect(
      history.execute({
        label: 'Broken execute',
        execute() {
          throw executeError;
        },
        undo() {},
      }),
    ).rejects.toBe(executeError);
    expect(history.state().undoDepth).toBe(0);

    await history.execute({
      label: 'Broken undo',
      execute() {},
      undo() {
        throw new Error('undo failed');
      },
    });
    await expect(history.undo()).rejects.toThrow('undo failed');
    expect(history.state()).toMatchObject({undoDepth: 1, redoDepth: 0});
    expect(errors).toHaveBeenCalledTimes(2);
  });

  it('clears redo entries when a new command is executed after undo', async () => {
    const history = new History();
    const state = {value: 0};

    await history.execute(valueCommand(state, 1));
    await history.execute(valueCommand(state, 2));
    await history.undo();
    expect(history.canRedo()).toBe(true);

    await history.execute(valueCommand(state, 3));
    expect(state.value).toBe(3);
    expect(history.state()).toMatchObject({undoDepth: 2, redoDepth: 0, canRedo: false});
  });

  it('respects the configured undo limit', async () => {
    const history = new History({limit: 2});
    const state = {value: 0};

    await history.execute(valueCommand(state, 1, 'First'));
    await history.execute(valueCommand(state, 2, 'Second'));
    await history.execute(valueCommand(state, 3, 'Third'));

    expect(history.undoEntries().map(entry => entry.command.label)).toEqual(['Second', 'Third']);
    expect(history.state().undoDepth).toBe(2);
  });

  it('serializes asynchronous commands and following undo requests', async () => {
    const history = new History();
    const order: string[] = [];
    let release!: () => void;
    const gate = new Promise<void>(resolve => {
      release = resolve;
    });

    const executePromise = history.execute({
      label: 'Async command',
      async execute() {
        order.push('execute:start');
        await gate;
        order.push('execute:end');
      },
      undo() {
        order.push('undo');
      },
    });
    const undoPromise = history.undo();

    await Promise.resolve();
    expect(order).toEqual(['execute:start']);
    release();
    await executePromise;
    await undoPromise;

    expect(order).toEqual(['execute:start', 'execute:end', 'undo']);
    expect(history.state()).toMatchObject({undoDepth: 0, redoDepth: 1});
  });
});
