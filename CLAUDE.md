# Wedding Planner

Static React app (Vite + TS + Tailwind v4) deployed to GitHub Pages. All data lives in the browser.
Product plan: `docs/plan.md`. Planning methodology the app is built on: `docs/methodology.md`.

## Commands
- `npm run dev`, `npm test` (Vitest), `npm run typecheck`, `npm run build`, `npm run lint` (oxlint)

## Architecture
- `src/lib/types.ts` is the persisted data model. Never store derived values.
- `src/lib/calc.ts` holds all derived calculations (pure functions). Put shared maths here, with tests in `calc.test.ts`.
- `src/store/store.ts` is a Zustand store persisted to localStorage. Use the generic actions
  (`upsert`, `patch`, `patchMany`, `remove`, `setCollection`, `updateSettings`, `updateSetup`).
  Changing `types.ts` means updating `store/schema.ts` and bumping `SCHEMA_VERSION` with a migration.
- When a zustand selector returns an object or array built inside it, wrap it in `useShallow`.
  Otherwise React re-renders forever.
- `src/components/ui.tsx` is the shared UI kit (Button, Card, PageHeader, Field, Input, NumberInput,
  Select, Checkbox, StatTile, Badge, EmptyState, Alert). Use it rather than ad-hoc styles.
- One folder per screen under `src/features/<name>/`, with the page as the default export of `<Name>Page.tsx`.
- Routing uses `HashRouter` and Vite `base: './'`, so the build works under any Pages path.
- Money is always shown with `formatMoney` (`$`). There is no currency setting.

## Rules
- Don't add npm dependencies without asking.
- Never commit real guest data. Demo and test data must be synthetic.
- Optional modules (`settings.modules`) hide their screens and widgets when off.
