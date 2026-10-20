# Wedding Planner

I planned and organised my own wedding: a large one, with over 200 guests, and it went
wonderfully. Since then, many couples have asked how I kept it all under control. This is my answer:
the tools I used, rebuilt as an app anyone can use.

It's a free, private planning tool that runs entirely in your browser. Import your guest list, track
RSVPs, plan seating, compare venues and keep your budget on track. There are no accounts, and nothing
you enter is sent online.

The method behind it is simple: one guest list that feeds every view, a headcount chosen by what it
really costs once gifts are counted, and a budget planned from the top down. See
[docs/methodology.md](docs/methodology.md).

## Features

- **Guided setup.** Step by step: basics, venue capacity and pricing, guest categories, guest groups,
  table-balancing attributes and optional modules. Each step is checked before you move on.
- **Guest list import.** Download a CSV template built from your own categories and groups, fill it in,
  then upload it. Columns are matched for you, and messy values are cleaned up or flagged before
  anything is imported.
- **Guests and RSVPs.** Guests grouped by household, with filters and bulk edits, a chase list of
  who still needs to reply, and a forecast that updates as replies come in.
- **Dashboard and headcount optimiser.** Capacity against your venue's minimum, goal and maximum, and
  the venue cost at your forecast and actual headcounts. A chart of net cost (venue cost minus the
  gifts you expect) across every headcount shows the cheapest guest count, including tiered pricing
  where paying for a few extra places is cheaper.
- **Seating.** Drag guests onto tables, with live seat counts and balance bars by category or any
  attribute you choose (e.g. age group).
- **Budget.** Set an overall budget, take off the non-negotiables (venue and any fixed costs), then
  share out the rest by percentage with sliders. Track estimates and payments against each share.
- **Gifts and thank-yous** (optional). Log gifts, see their value per guest and their spread on a
  box plot, and track thank-you cards with an optional rule for who needs one.
- **Venue comparison** (optional). Compare venues and their packages like for like, with flat fees,
  per-head tiers, drinks included or bring-your-own, extras and a "what's included" checklist.
- **Drinks calculator** (optional). Bottles per event and prices from several suppliers, giving the
  cheapest order.

## Your data

Everything is saved in your browser's local storage on the device you use. Use
**Settings & data → Download backup** to save a JSON file, and **Load backup** to restore it or carry
on from another device. Clearing your browser data deletes the planner's data, so keep a backup.

To explore first, choose **Load demo wedding** on the welcome screen. It fills the planner with a
made-up wedding.

## Development

Requires Node 22 or later.

```bash
npm install
npm run dev        # start the dev server
npm test           # run the tests (Vitest)
npm run typecheck  # TypeScript
npm run lint       # oxlint
npm run build      # production build in dist/
```

Built with React, TypeScript, Vite, Tailwind CSS, Zustand, Zod, PapaParse, Recharts and dnd-kit.

### Project layout

- `src/lib/`: the data model (`types.ts`), defaults, and the shared calculations (`calc.ts`, `budget.ts`), with tests
- `src/store/`: the browser-saved store, and backup checking and migration
- `src/features/<screen>/`: one folder per screen
- `src/components/ui.tsx`: shared UI components
- `docs/`: the product plan and the planning methodology

## Deploying to GitHub Pages

The workflow in `.github/workflows/deploy.yml` tests, builds and publishes the site on every push to
`main`. To turn it on, set **Settings → Pages → Source** to **GitHub Actions** in the repository. The
build uses relative paths and hash-based URLs, so it works under any repository name.

## Author

Adrian Metlenko

## Licence

Copyright © 2026 Adrian Metlenko. All rights reserved.

You're welcome to use the hosted planner free of charge. The source code is public to read, but it
may not be copied, modified, redistributed or self-hosted without permission. See [LICENSE](LICENSE).
