import Feature from 'ol/Feature.js';
import LineString from 'ol/geom/LineString.js';
import Point from 'ol/geom/Point.js';
import Polygon from 'ol/geom/Polygon.js';
import {afterEach, describe, expect, it} from 'vitest';
import {createMarker, createPopup, getFeatureOverlayCoordinate} from './overlays.js';

afterEach(() => {
  document.body.replaceChildren();
});

describe('popup and marker controllers', () => {
  it('creates safe popup content and opens and closes at coordinates', () => {
    const popup = createPopup({id: 'details', content: '<strong>plain text</strong>'});

    expect(popup.overlay.get('omap:id')).toBe('details');
    expect(popup.contentElement.textContent).toBe('<strong>plain text</strong>');
    expect(popup.contentElement.querySelector('strong')).toBeNull();
    expect(popup.isOpen()).toBe(false);

    popup.open([10, 20], 'Station A');
    expect(popup.overlay.getPosition()).toEqual([10, 20]);
    expect(popup.contentElement.textContent).toBe('Station A');
    expect(popup.isOpen()).toBe(true);

    popup.close();
    expect(popup.overlay.getPosition()).toBeUndefined();
    expect(popup.isOpen()).toBe(false);
  });

  it('accepts DOM nodes and handles the close button', () => {
    const node = document.createElement('strong');
    node.textContent = 'Feature details';
    const popup = createPopup({content: node});
    popup.open([1, 2]);

    expect(popup.contentElement.firstChild).toBe(node);
    popup.closeButton?.click();
    expect(popup.isOpen()).toBe(false);
  });

  it('creates markers with position and independent visibility state', () => {
    const marker = createMarker({id: 'station', label: 'Station', position: [5, 6]});

    expect(marker.getPosition()).toEqual([5, 6]);
    expect(marker.element.getAttribute('aria-label')).toBe('Station');
    expect(marker.isVisible()).toBe(true);

    marker.hide();
    expect(marker.isVisible()).toBe(false);
    expect(marker.getPosition()).toEqual([5, 6]);

    marker.show();
    marker.setPosition([7, 8]);
    expect(marker.isVisible()).toBe(true);
    expect(marker.getPosition()).toEqual([7, 8]);
  });

  it('destroys controllers idempotently', () => {
    const popup = createPopup();
    const marker = createMarker();
    popup.destroy();
    popup.destroy();
    marker.destroy();
    marker.destroy();

    expect(popup.overlay.getElement()).toBeUndefined();
    expect(marker.overlay.getElement()).toBeUndefined();
    expect(() => popup.open([0, 0])).toThrow('Popup controller has been destroyed.');
    expect(() => marker.setPosition([0, 0])).toThrow('Marker controller has been destroyed.');
  });

  it('returns useful anchor coordinates for common feature geometries', () => {
    expect(getFeatureOverlayCoordinate(new Feature(new Point([1, 2])))).toEqual([1, 2]);
    expect(
      getFeatureOverlayCoordinate(new Feature(new LineString([[0, 0], [10, 0]]))),
    ).toEqual([5, 0]);

    const polygon = new Polygon([[
      [0, 0],
      [10, 0],
      [10, 10],
      [0, 10],
      [0, 0],
    ]]);
    expect(getFeatureOverlayCoordinate(new Feature(polygon))).toEqual([5, 5]);
  });
});
