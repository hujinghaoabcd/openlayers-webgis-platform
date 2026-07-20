# Changelog

## Unreleased

### Added

- Type-safe `Map.on()`, `Map.once()` and `Map.off()` events.
- `Scope` for grouped cleanup of layers, controls, interactions, overlays, listeners and custom resources.
- Category-based `Registry` for named runtime factories and capabilities.
- Automatic plugin scopes and rollback when plugin installation fails.
- Managed `map.layers` collection with stable IDs, metadata, lookup, state operations and ordering.
- Exclusive basemap activation through `map.setBasemap()` and `map.layers.setBasemap()`.
- Standard layer metadata defaults for OSM, XYZ, WMS and GeoJSON factories.
- Managed `map.sources` runtime with source state, loading status, pending counts and errors.
- `map.refreshLayer()` and `map.fitLayer()` source utilities.
- Typed tile, image and vector loading events on the public map API.
- ImageWMS, WMTS, GeoTIFF, Vector, VectorTile, KML, GPX, WKT and LayerGroup factories.
- Managed `map.controls` collection with stable IDs, metadata, enable/disable state and ordering.
- Typed control lifecycle, enabled, metadata and order events.
- Zoom, Rotate, Attribution, ScaleLine, MousePosition, FullScreen, OverviewMap, ZoomSlider and ZoomToExtent factories.
- Managed `map.interactions` collection with stable IDs, metadata, active state and ordering.
- Exclusive interaction groups with automatic peer deactivation.
- Typed interaction lifecycle, active-state, metadata and order events.
- Select, Draw, Modify, Translate, Snap, DragBox, Extent and DragAndDrop interaction factories.
- Asynchronous `map.history` with execute, record, undo, redo, clear and configurable limits.
- Typed command-history execution, recording, state-change and error events.
- Reversible feature add, remove and geometry snapshot commands.
- Native Draw, Modify and Translate history recording through `bindFeatureHistory()`.
- Managed `map.overlays` collection with stable IDs, metadata, visibility, position, offset, element and ordering operations.
- Typed overlay lifecycle, visibility, position, offset, positioning, element, metadata and order events.
- Framework-independent Popup and Marker controllers backed by native OpenLayers overlays.
- Safe popup text and DOM-node content handling, close lifecycle and viewport auto-pan.
- Feature-to-overlay anchor coordinates for point, line, polygon, circle and fallback geometries.
