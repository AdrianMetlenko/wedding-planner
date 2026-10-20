# Wedding Planner: product plan

A static, single-page React app on GitHub Pages. All data stays in the browser (localStorage),
with JSON download/load for backup and for moving between devices. No server, no accounts.

See [methodology.md](methodology.md) for the planning method behind it.

## 1. Guiding principles

1. **One master guest list.** Every other screen is a view of it (see `methodology.md`).
2. **A guided setup flow.** Steps run in order, each one is validated, and the next step stays locked
   until the current one is valid. This makes setup mistakes hard to make.
3. **Everything is optional apart from the core.** Core = guests, RSVP, capacity/cost, seating.
   Gifts, thank-yous, expenses, liquor, venue scouting and honeymoon are turned on or off during setup.
4. **Prefilled example everywhere.** Categories, groups, expense categories and table themes start
   with sensible editable defaults. A "Load demo wedding" button fills in a fully synthetic dataset.
5. **Data is private and portable.** Autosave to localStorage. Export/import a versioned JSON file
   (schema version + migrations).

## 2. Setup wizard (first run; can be reopened from Settings)

| Step | What the couple enters | Validation |
|---|---|---|
| 1. Basics | Couple names, wedding date. Amounts are shown in `$`; no currency setting | Date and names required |
| 2. Capacity & cost | Venue **max** (required); **min** and **goal** optional. Which guest types count toward the venue min/max and tiers (Adult / Child / Staff checkboxes, all ticked by default: venues differ). Price per head by guest type, plus optional **headcount price tiers** (e.g. <180 → 179, <220 → 157, else 139). Optional **expected average gift per guest** for the net-cost optimiser (§5) | min ≤ goal ≤ max; tiers ascending |
| 3. Categories | "Whose guest / which circle". Prefilled: *Couple A family, Couple B family, Couple A friends, Couple B friends, Shared friends, Work, Church/Community, Plus-ones, Vendors/Staff*. Add, rename, delete, recolour | ≥ 1 category |
| 4. Guest groups (tags) | Cross-cutting subsets, e.g. *International, Needs accommodation, Choir, Bridal party, Reader, Dietary needs*. Prefilled, editable | none |
| 4b. Balance attributes | Optional attributes used to balance tables, each with a fixed list of values. Prefilled suggestions, all off by default: *Sex (M/F/X)*, *Age group (Child/Young adult/Adult/Senior)*, *Relationship (Single/Couple)*. Couples can add their own | Each enabled attribute has ≥ 2 values |
| 5. Modules | Toggles: Gifts, Thank-you tracking (+ optional rule), Expenses budget, Liquor calculator, Venue scouting, Honeymoon (in budget / tracked separately / off) | none |
| 6. Guest import | (a) **Download CSV template**, built from the categories, groups and balance attributes set in steps 3–4b and with example rows. (b) Upload a CSV. (c) Column-mapping screen, auto-matched by header name. (d) Validation & clean-up preview (see §4). (e) Confirm. Couples can also skip and add guests manually | Blocking errors must be fixed or the row excluded |

## 3. Data model (TypeScript, persisted as JSON)

```ts
type GuestType = 'adult' | 'child' | 'staff';
type Rsvp = 'pending' | 'yes' | 'no';

interface Guest {
  id: string;
  title?: string;           // Mr, Mrs, Dr, Fr …
  firstName: string;
  lastName: string;
  attributes: Record<string, string>; // balance attribute id → value (sex, age group, …); all optional
  householdId: string;      // invitation unit; grouped together in lists
  categoryId: string;
  tagIds: string[];         // guest groups
  type: GuestType;          // default 'adult'
  planned: boolean;         // forecast: in the plan to reach the goal (A-list)
  rsvp: Rsvp;
  tableId?: string;
  seat?: number;
  email?: string; phone?: string;
  address?: { line1?: string; city?: string; state?: string; postcode?: string; country?: string };
  notes?: string;
}

interface Household { id: string; name: string }            // e.g. "Smith family"
interface Category  { id: string; name: string; color: string }
interface Tag       { id: string; name: string; color: string }
interface BalanceAttribute { id: string; name: string; values: string[]; enabled: boolean }
interface Table     { id: string; name: string; theme?: string; capacity: number; order: number;
                      shape: 'round' | 'long' | 'custom' }  // each table has its own capacity;
                                                            // a roomier table is just one seated below capacity

interface Gift {
  id: string;
  from: string;             // free text ("Aunt Vera")
  householdIds: string[];   // links to guests; may be empty for non-invited givers
  kind: 'money' | 'item' | 'experience';
  amount?: number;          // money value or estimated value
  description?: string;
  thankYouSent: boolean;
}

interface Expense {
  id: string; item: string; categoryId: string;
  estimate: number; paid: number;   // remaining is derived
  module: 'wedding' | 'honeymoon' | 'liquor';
}

interface Settings {
  couple: string[]; date: string;                  // money is always shown as "$"
  capacity: { min?: number; goal?: number; max: number; countsTypes: GuestType[] };
  pricePerHead: Record<GuestType, number>;
  tiers?: { below: number; price: number }[];      // adult price by counted headcount
  averageGift?: number;                            // expected gift per guest, for the optimiser
  defaultTableCapacity: number;                    // e.g. 10
  modules: { gifts: boolean; thankYous: boolean; expenses: boolean; liquor: boolean;
             venues: boolean; honeymoon: 'in-budget' | 'separate' | 'off' };
  thankYouRule?: { nonAttendees: boolean; perHeadOver?: number };
}

interface AppState { schemaVersion: number; settings: Settings; guests: Guest[];
  households: Household[]; categories: Category[]; tags: Tag[];
  balanceAttributes: BalanceAttribute[]; tables: Table[];
  gifts: Gift[]; expenses: Expense[]; liquor: LiquorItem[]; venues: Venue[] }
```

Derived (never stored): headcounts, cost, remaining budget, per-head gift value, the
thank-you-required flag, table fill, seating balance.

## 4. CSV template & import

Template columns (header names are what auto-mapping matches on):

`Household, Title, First Name, Last Name, Guest Type, Category, Groups, Planned, RSVP, Email, Phone, Address, City, State, Postcode, Country, Notes`, plus one column per enabled balance attribute (e.g. `Sex`, `Age Group`).

- **Household**: any label; rows with the same label become one household. If it is blank, the
  guest gets their own household.
- **Groups**: a semicolon-separated list of tag names.
- **Guest Type**: blank → Adult.
- **Planned / RSVP**: accepts `yes/no/1/0/y/n/true/false`, and blank (RSVP → pending, Planned → yes).
- **Balance attribute columns**: values are matched case-insensitively to the attribute's value
  list (`m.` → M); values that don't match are flagged.
- **Clean-up**: trim whitespace, normalise Title and State (`Mr` → Mr., `VIC ` → VIC).
  Flag likely duplicates (same first + last name), unknown categories (offer to create them or map
  to an existing one), and formula junk (`#REF!`, `#N/A`).
- Re-importing the CSV can either **replace** the list or **merge**, matching on first + last +
  household with a diff preview.

## 5. Screens after setup

1. **Dashboard**
   - Planned vs Actual tiles: coming / declined / pending.
   - Headcount against the min / goal / max bands.
   - Cost: total and effective cost per head.
   - **Headcount optimiser**. For every headcount between min and
     max, compute venue cost (tiered price × counted guests) and, if an average gift is set,
     **net cost = venue cost − headcount × average gift**. Chart the curve, then mark the cheapest
     headcount, the goal, and the current planned and actual counts. Also show "the next guest
     costs/saves $X" at the current count. Worked example: 180 guests cost
     $28,260 (−$19,800 in gifts = $8,460 net), while 220 cost $30,580 (−$24,200 = $6,380 net),
     so aiming for 220 was cheaper overall.
   - Breakdown charts by category and guest type.
   - Gift totals (if the module is on).
   - Countdown to the date.
2. **Guests**: editable table grouped by household. Filter by category, group, RSVP or planned;
   bulk-edit RSVP, tags and category; add a guest or a household.
3. **RSVP**: a chase list (pending, grouped by household, with contact details) and a confirmed list.
   One click sets a whole household.
4. **Seating**
   - Table setup: add "N tables × capacity C × shape" (default capacity from settings). Shape is
     round, long (e.g. a head table or banquet row) or custom. Any table can be edited to its own
     capacity. Seating fewer guests than capacity (e.g. a roomier table) needs no special type;
     the fill indicator shows it.
   - Table cards, each with a name, theme, shape and capacity.
   - Drag attending guests from an unassigned pool onto tables.
   - Per table: fill (8/10), a category mix bar, and a bar for the chosen enabled balance
     attribute (switch between sex, age group, etc.).
   - Households are **not** forced together, since children often sit apart from their parents.
     A guest card can show where the rest of their household is sitting, for information only.
   - An overall capacity summary: seats vs attendees, with surplus or shortfall.
   - Reorder seats within a table.
5. **Gifts** (optional): log gifts, link them to households, and see the per-head value.
   **Thank-you tracker** (optional): a checklist. When the rule is on, it highlights gifts that
   "require" a card: the giver didn't attend, and/or the gift is above X per head.
6. **Budget** (optional)
   - **Budget plan (top-down):** overall budget (set in setup, editable here) − non-negotiables (venue & catering from
     the forecast headcount + categories marked *Fixed*) = remainder, split across the other categories by %.
     Each category is *% share* / *Fixed* / *Off*. Sliders rebalance the other unlocked shares to keep 100%; a lock
     pins a share; turning a category off hands its share to the rest. A 100% distribution bar shows venue, fixed,
     each allocation and any headroom/overspend; each category shows allocated vs estimated vs paid.
   - Expenses with category / estimate / paid / remaining.
   - The reception cost is derived automatically from the headcount.
   - Category donut chart and a paid vs remaining bar chart.
   - Honeymoon is included in or excluded from the totals, as chosen in setup.
7. **Liquor calculator** (optional): drinks × events (reception, second day, etc.) × bottles, with
   prices from several vendors → the cheapest order. Can push its total into Budget.
8. **Venue scouting** (optional). Each venue holds shared details (name, location, link, notes)
   and one or more **packages** (e.g. "Premier" vs "Elite", or a different room), each compared on its own.
   - Package pricing: flat hire fee + price per head, optional per-head tiers by guest count,
     min/max guests, discount, gratuity, tax, optional child/staff prices.
   - Drinks: included / bar tab / bring-your-own. For a bar tab or BYO, an estimated drinks cost per guest is added.
   - Extras not included (DJ, cake…), flat or per guest, are added so totals compare like for like.
   - "What's included" side-by-side checklist (prefilled rows, editable).
   - Cost grid and chart across headcounts, showing the cheapest package per headcount.
   - Choosing a package previews and, on confirm, copies its min/max, per-head prices, tiers, flat fee,
     discount and service charge into the planner's cost settings.
9. **Settings / Data**: reopen the wizard steps, export or import JSON, load the demo, reset everything.

Not included yet: printing labels, place cards, seating-chart export (the planning.wedding
workflow), currency settings (always `$`), tracking second-day guests (its costs go in Budget).

## 6. Tech stack

| Concern | Choice |
|---|---|
| Build | Vite + React + TypeScript |
| Routing | React Router with `HashRouter` (avoids 404s on deep links on GitHub Pages) |
| State | Zustand + `persist` middleware (localStorage); a `schemaVersion` with a migration function |
| Validation | Zod schemas for JSON import and CSV rows |
| CSV | PapaParse |
| Charts | Recharts |
| Drag & drop | dnd-kit |
| Styling | Tailwind CSS (simple, no component library lock-in) |
| Tests | Vitest for derived calculations, CSV mapping and migrations; Playwright smoke test of the wizard |
| Deploy | GitHub Actions → GitHub Pages on push to `main` |

## 7. Roadmap

- **Polish:** a mobile layout pass, an accessibility pass, and lazy-loading screens to keep the first
  download small.
- **Exports:** place cards, seating-chart export and printable table lists.

## 8. Design decisions

- Balance attributes are optional and configurable (sex, age group, relationship, custom).
- Which guest types count toward the venue min/max is a setting (venues differ).
- Each table has its own capacity and a shape (round / long / custom). There's no VIP or head
  type; a roomier table is just one seated below capacity.
- No household-split warning on seating.
- Money is always shown as `$`.
- Forecast = everyone who said yes (planned or not) + planned guests still to reply. Before replies it equals the
  plan; once everyone has replied it equals attending.
- Default categories and groups are minimal (Partner 1 family / Partner 2 family / Friends; Bridal party /
  Needs accommodation). The demo uses a fuller set.
- Venues have packages; drinks are included / bar tab / BYO with a per-guest estimate; extras are added;
  choosing a package can copy its pricing into settings, which include a flat fee, discount and service charge.
