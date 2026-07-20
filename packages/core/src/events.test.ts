import {describe, expect, it, vi} from 'vitest';
import {Events} from './events.js';

interface TestEvents {
  change: {readonly value: number};
  close: undefined;
}

describe('Events', () => {
  it('dispatches typed payloads and removes listeners', () => {
    const events = new Events<TestEvents>();
    const listener = vi.fn();

    events.on('change', listener);
    events.emit('change', {value: 3});
    events.off('change', listener);
    events.emit('change', {value: 4});

    expect(listener).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenCalledWith({value: 3});
  });

  it('removes a once listener before invocation', () => {
    const events = new Events<TestEvents>();
    const listener = vi.fn(() => {
      events.emit('change', {value: 2});
    });

    events.once('change', listener);
    events.emit('change', {value: 1});

    expect(listener).toHaveBeenCalledOnce();
    expect(events.listens('change')).toBe(false);
  });

  it('supports events with an undefined payload', () => {
    const events = new Events<TestEvents>();
    const listener = vi.fn();

    events.on('close', listener).emit('close', undefined);
    expect(listener).toHaveBeenCalledWith(undefined);
  });
});
