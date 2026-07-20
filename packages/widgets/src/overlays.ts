import {
  configureOverlay,
  type ManagedOverlayOptions,
  type OverlayPositioning,
} from '@omap/core';
import type {Coordinate} from 'ol/coordinate.js';
import type Feature from 'ol/Feature.js';
import {getCenter} from 'ol/extent.js';
import Circle from 'ol/geom/Circle.js';
import type Geometry from 'ol/geom/Geometry.js';
import LineString from 'ol/geom/LineString.js';
import MultiLineString from 'ol/geom/MultiLineString.js';
import MultiPoint from 'ol/geom/MultiPoint.js';
import MultiPolygon from 'ol/geom/MultiPolygon.js';
import Point from 'ol/geom/Point.js';
import Polygon from 'ol/geom/Polygon.js';
import Overlay, {type Options as NativeOverlayOptions} from 'ol/Overlay.js';

/** Text or a DOM node accepted as popup content. */
export type OverlayContent = string | Node;

/** Options shared by popup and marker controllers. */
export interface OverlayControllerOptions
  extends Omit<ManagedOverlayOptions, 'element' | 'position' | 'positioning' | 'visible'> {
  readonly position?: Coordinate;
  readonly positioning?: OverlayPositioning;
  readonly className?: string;
  readonly stopEvent?: NativeOverlayOptions['stopEvent'];
  readonly insertFirst?: NativeOverlayOptions['insertFirst'];
  readonly autoPan?: NativeOverlayOptions['autoPan'];
}

/** Options used to create a popup controller. */
export interface PopupOptions extends OverlayControllerOptions {
  readonly content?: OverlayContent;
  readonly closeButton?: boolean;
  readonly closeLabel?: string;
  readonly contentClassName?: string;
  readonly open?: boolean;
}

/** Framework-independent popup controller backed by a native OpenLayers overlay. */
export interface PopupController {
  readonly overlay: Overlay;
  readonly element: HTMLElement;
  readonly contentElement: HTMLElement;
  readonly closeButton: HTMLButtonElement | undefined;
  open(position: Coordinate, content?: OverlayContent): void;
  close(): void;
  setContent(content: OverlayContent): void;
  isOpen(): boolean;
  destroy(): void;
}

/** Options used to create a marker controller. */
export interface MarkerOptions extends OverlayControllerOptions {
  readonly element?: HTMLElement;
  readonly label?: string;
  readonly title?: string;
  readonly visible?: boolean;
}

/** Framework-independent marker controller backed by a native OpenLayers overlay. */
export interface MarkerController {
  readonly overlay: Overlay;
  readonly element: HTMLElement;
  setPosition(position?: Coordinate): void;
  getPosition(): Coordinate | undefined;
  show(): void;
  hide(): void;
  isVisible(): boolean;
  destroy(): void;
}

/** Create a popup with safe content handling and an optional close button. */
export function createPopup(options: PopupOptions = {}): PopupController {
  const element = document.createElement('div');
  element.className = joinClasses('omap-popup', options.className);
  element.setAttribute('role', 'dialog');
  element.hidden = options.open !== true;

  const contentElement = document.createElement('div');
  contentElement.className = joinClasses('omap-popup-content', options.contentClassName);
  element.append(contentElement);

  let closeButton: HTMLButtonElement | undefined;
  if (options.closeButton !== false) {
    closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.className = 'omap-popup-close';
    closeButton.setAttribute('aria-label', options.closeLabel ?? 'Close popup');
    closeButton.textContent = '×';
    element.append(closeButton);
  }

  const overlay = new Overlay({
    element,
    ...(options.position !== undefined ? {position: [...options.position]} : {}),
    offset: options.offset ? [...options.offset] : [0, -12],
    positioning: options.positioning ?? 'bottom-center',
    stopEvent: options.stopEvent ?? true,
    insertFirst: options.insertFirst,
    autoPan: options.autoPan ?? {animation: {duration: 250}, margin: 24},
  });
  configureOverlay(overlay, {
    ...(options.id !== undefined ? {id: options.id} : {}),
    ...(options.title !== undefined ? {title: options.title} : {}),
    type: options.type ?? 'popup',
    ...(options.group !== undefined ? {group: options.group} : {}),
    visible: options.open === true,
  });

  let destroyed = false;

  const controller: PopupController = {
    overlay,
    element,
    contentElement,
    closeButton,
    open(position, content) {
      assertActive();
      if (content !== undefined) setOverlayContent(contentElement, content);
      overlay.setPosition([...position]);
      overlay.set('omap:visible', true);
      overlay.panIntoView();
    },
    close() {
      if (destroyed) return;
      overlay.set('omap:visible', false);
      overlay.setPosition(undefined);
    },
    setContent(content) {
      assertActive();
      setOverlayContent(contentElement, content);
    },
    isOpen() {
      return !destroyed && overlay.get('omap:visible') !== false && overlay.getPosition() !== undefined;
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      overlay.setPosition(undefined);
      overlay.setElement(undefined);
      element.remove();
    },
  };

  closeButton?.addEventListener('click', () => controller.close());
  if (options.content !== undefined) controller.setContent(options.content);
  return controller;

  function assertActive(): void {
    if (destroyed) throw new Error('Popup controller has been destroyed.');
  }
}

/** Create a marker backed by a native OpenLayers overlay. */
export function createMarker(options: MarkerOptions = {}): MarkerController {
  const element = options.element ?? document.createElement('div');
  element.className = joinClasses('omap-marker', options.className, element.className);
  element.setAttribute('role', element.getAttribute('role') ?? 'img');
  if (options.label !== undefined) {
    element.setAttribute('aria-label', options.label);
    if (!options.element) element.textContent = options.label;
  }
  if (options.title !== undefined) element.title = options.title;

  const overlay = new Overlay({
    element,
    ...(options.position !== undefined ? {position: [...options.position]} : {}),
    offset: options.offset ? [...options.offset] : [0, 0],
    positioning: options.positioning ?? 'center-center',
    stopEvent: options.stopEvent ?? false,
    insertFirst: options.insertFirst,
    autoPan: options.autoPan,
  });
  configureOverlay(overlay, {
    ...(options.id !== undefined ? {id: options.id} : {}),
    ...(options.title !== undefined ? {title: options.title} : {}),
    type: options.type ?? 'marker',
    ...(options.group !== undefined ? {group: options.group} : {}),
    visible: options.visible !== false,
  });

  let destroyed = false;
  return {
    overlay,
    element,
    setPosition(position) {
      assertActive();
      overlay.setPosition(position ? [...position] : undefined);
    },
    getPosition() {
      const position = overlay.getPosition();
      return position ? [...position] : undefined;
    },
    show() {
      assertActive();
      overlay.set('omap:visible', true);
    },
    hide() {
      if (!destroyed) overlay.set('omap:visible', false);
    },
    isVisible() {
      return !destroyed && overlay.get('omap:visible') !== false;
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      overlay.setPosition(undefined);
      overlay.setElement(undefined);
      element.remove();
    },
  };

  function assertActive(): void {
    if (destroyed) throw new Error('Marker controller has been destroyed.');
  }
}

/** Return a useful overlay anchor coordinate for an OpenLayers feature. */
export function getFeatureOverlayCoordinate(
  feature: Feature<Geometry>,
): Coordinate | undefined {
  const geometry = feature.getGeometry();
  if (!geometry) return undefined;
  if (geometry instanceof Point) return [...geometry.getCoordinates()];
  if (geometry instanceof MultiPoint) return cloneCoordinate(geometry.getFirstCoordinate());
  if (geometry instanceof LineString) return cloneCoordinate(geometry.getCoordinateAt(0.5));
  if (geometry instanceof MultiLineString) {
    return cloneCoordinate(geometry.getLineString(0)?.getCoordinateAt(0.5));
  }
  if (geometry instanceof Polygon) return toXY(geometry.getInteriorPoint().getCoordinates());
  if (geometry instanceof MultiPolygon) {
    return toXY(geometry.getInteriorPoints().getFirstCoordinate());
  }
  if (geometry instanceof Circle) return cloneCoordinate(geometry.getCenter());
  return cloneCoordinate(getCenter(geometry.getExtent()));
}

function setOverlayContent(target: HTMLElement, content: OverlayContent): void {
  target.replaceChildren();
  if (typeof content === 'string') target.textContent = content;
  else target.append(content);
}

function cloneCoordinate(coordinate: Coordinate | undefined): Coordinate | undefined {
  return coordinate ? [...coordinate] : undefined;
}

function toXY(coordinate: Coordinate | undefined): Coordinate | undefined {
  return coordinate ? [coordinate[0]!, coordinate[1]!] : undefined;
}

function joinClasses(...values: Array<string | undefined>): string {
  return values
    .flatMap(value => value?.split(/\s+/u) ?? [])
    .filter(Boolean)
    .filter((value, index, all) => all.indexOf(value) === index)
    .join(' ');
}
