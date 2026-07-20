import OlMap from 'ol/Map.js';
import Overlay from 'ol/Overlay.js';
import View from 'ol/View.js';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {Overlays} from './Overlays.js';

const maps: OlMap[] = [];

function createMap(overlays: Overlay[] = []): OlMap {
  const target = document.createElement('div');
  document.body.append(target);
  const map = new OlMap({
    target,
    view: new View({center: [0, 0], zoom: 2}),
    controls: [],
    interactions: [],
    overlays,
  });
  maps.push(map);
  return map;
}

afterEach(() => {
  for (const map of maps.splice(0)) {
    map.setTarget(undefined);
    map.dispose();
  }
  document.body.replaceChildren();
});

describe('Overlays', () => {
  it('adds, finds and removes native overlays by stable id', () => {
    const map = createMap();
    const overlays = new Overlays(map);
    const added = vi.fn();
    const removed = vi.fn();
    overlays.on('add', added).on('remove', removed);

    const overlay = new Overlay({element: document.createElement('div')});
    overlays.add(overlay, {id: 'popup', title: 'Popup', type: 'popup'});

    expect(overlays.get('popup')).toBe(overlay);
    expect(overlays.info('popup')).toMatchObject({
      id: 'popup',
      title: 'Popup',
      type: 'popup',
      visible: true,
      index: 0,
    });
    expect(added).toHaveBeenCalledWith({overlay, id: 'popup', index: 0});

    expect(overlays.remove('popup')).toBe(overlay);
    expect(overlays.has('popup')).toBe(false);
    expect(removed).toHaveBeenCalledWith({overlay, id: 'popup', index: 0});
  });

  it('protects duplicate ids and supports explicit replacement', () => {
    const map = createMap();
    const overlays = new Overlays(map);
    const first = new Overlay({element: document.createElement('div')});
    const second = new Overlay({element: document.createElement('div')});

    overlays.add(first, {id: 'marker'});
    expect(() => overlays.add(second, {id: 'marker'})).toThrow(
      'Overlay id is already registered: marker',
    );

    overlays.add(second, {id: 'marker', replace: true});
    expect(overlays.get('marker')).toBe(second);
    expect(map.getOverlays().getArray()).toEqual([second]);
  });

  it('toggles visibility without clearing the native position', () => {
    const map = createMap();
    const overlays = new Overlays(map);
    const element = document.createElement('div');
    const overlay = new Overlay({element, position: [10, 20]});
    const visible = vi.fn();
    overlays.on('visible', visible);
    overlays.add(overlay, {id: 'popup'});

    overlays.hide('popup');
    expect(element.hidden).toBe(true);
    expect(overlay.getPosition()).toEqual([10, 20]);
    expect(overlays.isVisible('popup')).toBe(false);

    overlays.show('popup');
    expect(element.hidden).toBe(false);
    expect(overlays.isVisible('popup')).toBe(true);
    expect(visible).toHaveBeenCalledTimes(2);
  });

  it('tracks native position, offset, positioning and element changes', () => {
    const map = createMap();
    const overlays = new Overlays(map);
    const overlay = new Overlay({element: document.createElement('div')});
    const position = vi.fn();
    const offset = vi.fn();
    const positioning = vi.fn();
    const element = vi.fn();
    overlays
      .on('position', position)
      .on('offset', offset)
      .on('positioning', positioning)
      .on('element', element);
    overlays.add(overlay, {id: 'popup'});

    overlay.setPosition([1, 2]);
    overlay.setOffset([3, 4]);
    overlay.setPositioning('top-right');
    const replacement = document.createElement('section');
    overlay.setElement(replacement);

    expect(position).toHaveBeenLastCalledWith({overlay, id: 'popup', position: [1, 2]});
    expect(offset).toHaveBeenLastCalledWith({overlay, id: 'popup', offset: [3, 4]});
    expect(positioning).toHaveBeenLastCalledWith({
      overlay,
      id: 'popup',
      positioning: 'top-right',
    });
    expect(element).toHaveBeenLastCalledWith({overlay, id: 'popup', element: replacement});
    expect(replacement.dataset.omapOverlayId).toBe('popup');
  });

  it('synchronizes native collection changes and managed ordering', () => {
    const first = new Overlay({id: 'first', element: document.createElement('div')});
    const map = createMap([first]);
    const overlays = new Overlays(map);
    const second = new Overlay({id: 'second', element: document.createElement('div')});

    map.addOverlay(second);
    expect(overlays.ids()).toEqual(['first', 'second']);

    overlays.sendToBack('second');
    expect(map.getOverlays().getArray()).toEqual([second, first]);

    map.removeOverlay(first);
    expect(overlays.ids()).toEqual(['second']);
  });
});
