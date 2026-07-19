# Core Foundation Build Report

- Date: 2026-07-20
- Product: OMap
- Target runtime: Node.js >= 22.12.0
- Package manager: pnpm 11.15.0

## Current foundation

- `Map` class and `map()` factory.
- Direct access to the underlying OpenLayers map through `map.native`.
- Direct layer, control, interaction and overlay methods.
- Map target, view, size and removal lifecycle.
- Plugin installation, duplicate protection and reverse-order disposal.
- Base tile, XYZ, WMS and GeoJSON layer factories.
- Vue 3 `OMap` component and `useMap()` composable.
- Workspace validation, type checking, tests, API generation and production builds.

## Completion rule

A public capability is complete only when its implementation, exported types, tests, runnable example and API documentation are present.
