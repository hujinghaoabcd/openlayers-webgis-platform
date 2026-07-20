import Control from 'ol/control/Control.js';
import {describe, expect, it, vi} from 'vitest';
import {Map} from './Map.js';

function createControl(): Control {
  return new Control({element: document.createElement('div')});
}

describe('Controls', () => {
  it('assigns stable ids and supports lookup and removal by id', async () => {
    const map = new Map({controls: []});
    const control = createControl();

    map.addControl(control);
    const id = map.controls.info(control).id;

    expect(id).toMatch(/^control-/);
    expect(map.getControl(id)).toBe(control);
    expect(map.hasControl(id)).toBe(true);
    expect(map.removeControl(id)).toBe(control);
    expect(map.hasControl(id)).toBe(false);

    await map.remove();
  });

  it('rejects duplicate ids unless replacement is explicit', async () => {
    const map = new Map({controls: []});
    const first = createControl();
    const second = createControl();

    map.addControl(first, {id: 'scale'});
    expect(() => map.addControl(second, {id: 'scale'})).toThrow(
      'Control id is already registered: scale',
    );

    map.addControl(second, {id: 'scale', replace: true});
    expect(map.getControl('scale')).toBe(second);
    expect(map.hasControl(first)).toBe(false);

    await map.remove();
  });

  it('enables and disables controls without removing them', async () => {
    const map = new Map({controls: []});
    const control = createControl();
    const enabled = vi.fn();

    map.addControl(control, {id: 'mouse-position'});
    map.on('control:enabled', enabled);
    map.disableControl('mouse-position');

    expect(map.hasControl('mouse-position')).toBe(true);
    expect(map.controls.isEnabled('mouse-position')).toBe(false);
    expect(control.element.hidden).toBe(true);
    expect(enabled).toHaveBeenCalledWith({
      control,
      id: 'mouse-position',
      enabled: false,
    });

    map.enableControl('mouse-position');
    expect(control.element.hidden).toBe(false);
    expect(map.controls.isEnabled('mouse-position')).toBe(true);

    await map.remove();
  });

  it('applies metadata and logical position classes', async () => {
    const map = new Map({controls: []});
    const control = createControl();

    map.addControl(control, {
      id: 'scale-line',
      title: 'Scale',
      type: 'scale-line',
      position: 'bottom-left',
    });

    expect(map.controls.info('scale-line')).toMatchObject({
      id: 'scale-line',
      title: 'Scale',
      type: 'scale-line',
      position: 'bottom-left',
      enabled: true,
    });
    expect(control.element.dataset.omapControlId).toBe('scale-line');
    expect(control.element.dataset.omapControlPosition).toBe('bottom-left');
    expect(control.element.classList.contains('omap-control-position-bottom-left')).toBe(true);

    map.controls.update('scale-line', {position: 'top-right'});
    expect(control.element.classList.contains('omap-control-position-bottom-left')).toBe(false);
    expect(control.element.classList.contains('omap-control-position-top-right')).toBe(true);

    await map.remove();
  });

  it('synchronizes native collection changes and ordering', async () => {
    const map = new Map({controls: []});
    const first = createControl();
    const second = createControl();
    const added = vi.fn();
    const ordered = vi.fn();

    map.on('control:add', added).on('control:order', ordered);
    map.native.addControl(first);
    map.addControl(second, {id: 'second'});
    const firstId = map.controls.id(first);

    expect(added).toHaveBeenCalledWith({control: first, id: firstId, index: 0});
    map.controls.sendToBack('second');
    expect(map.controls.ids()).toEqual(['second', firstId]);
    expect(ordered).toHaveBeenCalledWith({
      control: second,
      id: 'second',
      from: 1,
      to: 0,
    });

    await map.remove();
  });
});
