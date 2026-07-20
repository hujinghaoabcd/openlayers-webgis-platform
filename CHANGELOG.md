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
