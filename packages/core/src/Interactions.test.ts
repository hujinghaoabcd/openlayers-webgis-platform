import Interaction from 'ol/interaction/Interaction.js';
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
