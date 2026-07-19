# Contributing

## Branches

- `main`: stable integration branch.
- `develop`: optional shared development branch.
- `feat/*`, `fix/*`, `docs/*`, `refactor/*`: short-lived working branches.

## Required checks

```bash
pnpm validate
pnpm typecheck
pnpm test
pnpm build
```

## Completion standard

A capability is not complete until it includes:

1. Independent implementation under the project's own API;
2. Complete TypeScript types;
3. Unit or browser tests;
4. A runnable example;
5. Tutorial or API documentation;
6. A changelog entry.

Public code, naming, documentation, examples and visual design must use this project's own product language and design system.
