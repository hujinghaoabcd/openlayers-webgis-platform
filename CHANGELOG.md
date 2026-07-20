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
