// Validation and migration for JSON backups and the persisted localStorage blob.
import { z } from 'zod'
import { SCHEMA_VERSION, createInitialState } from '../lib/defaults'
import type { AppState } from '../lib/types'

const guestType = z.enum(['adult', 'child', 'staff'])
const withId = z.object({ id: z.string() })
const named = withId.extend({ name: z.string(), color: z.string() })
const tier = z.object({ below: z.number(), price: z.number() })

const guest = z.object({
  id: z.string(),
  title: z.string().optional(),
  firstName: z.string(),
  lastName: z.string(),
  householdId: z.string(),
  categoryId: z.string(),
  tagIds: z.array(z.string()),
  attributes: z.record(z.string(), z.string()),
  type: guestType,
  planned: z.boolean(),
  rsvp: z.enum(['pending', 'yes', 'no']),
  tableId: z.string().optional(),
  seat: z.number().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  address: z.object({
    line1: z.string().optional(), city: z.string().optional(), state: z.string().optional(),
    postcode: z.string().optional(), country: z.string().optional(),
  }).optional(),
  notes: z.string().optional(),
})

const settings = z.object({
  coupleNames: z.tuple([z.string(), z.string()]),
  date: z.string(),
  capacity: z.object({
    min: z.number().optional(), goal: z.number().optional(), max: z.number(),
    countsTypes: z.array(guestType),
  }),
  pricePerHead: z.object({ adult: z.number(), child: z.number(), staff: z.number() }),
  tiers: z.array(tier),
  flatFee: z.number().optional(),
  discount: z.number().optional(),
  serviceCharge: z.number().optional(),
  averageGift: z.number().optional(),
  defaultTableCapacity: z.number(),
  modules: z.object({
    gifts: z.boolean(), thankYous: z.boolean(), expenses: z.boolean(), liquor: z.boolean(),
    venues: z.boolean(), honeymoon: z.enum(['in-budget', 'separate', 'off']),
  }),
  thankYouRule: z.object({ nonAttendees: z.boolean(), perHeadOver: z.number().optional() }),
})

export const appStateSchema = z.object({
  schemaVersion: z.number(),
  setup: z.object({ completedStep: z.number(), done: z.boolean() }),
  settings,
  guests: z.array(guest),
  households: z.array(withId.extend({ name: z.string() })),
  categories: z.array(named),
  tags: z.array(named),
  balanceAttributes: z.array(withId.extend({ name: z.string(), values: z.array(z.string()), enabled: z.boolean() })),
  tables: z.array(withId.extend({
    name: z.string(), theme: z.string().optional(), capacity: z.number(), order: z.number(),
    shape: z.enum(['round', 'long', 'custom']),
  })),
  gifts: z.array(withId.extend({
    from: z.string(), householdIds: z.array(z.string()), kind: z.enum(['money', 'item', 'experience']),
    amount: z.number().optional(), description: z.string().optional(), thankYouSent: z.boolean(),
  })),
  expenseCategories: z.array(named),
  expenses: z.array(withId.extend({
    item: z.string(), categoryId: z.string(), estimate: z.number(), paid: z.number(),
    module: z.enum(['wedding', 'honeymoon']), notes: z.string().optional(),
  })),
  liquorEvents: z.array(withId.extend({ name: z.string() })),
  liquorVendors: z.array(withId.extend({ name: z.string() })),
  liquor: z.array(withId.extend({
    name: z.string(), kind: z.string(),
    bottles: z.record(z.string(), z.number()), prices: z.record(z.string(), z.number()),
  })),
  venues: z.array(withId.extend({
    name: z.string(), location: z.string().optional(), url: z.string().optional(), notes: z.string().optional(),
    packages: z.array(withId.extend({
      name: z.string(), flatFee: z.number(), pricePerHead: z.number(), tiers: z.array(tier),
      childPrice: z.number().optional(), staffPrice: z.number().optional(),
      minGuests: z.number().optional(), maxGuests: z.number().optional(),
      discount: z.number(), gratuity: z.number(), tax: z.number(),
      drinks: z.enum(['included', 'bar-tab', 'byo']), drinksPerHead: z.number().optional(),
      extras: z.array(withId.extend({ name: z.string(), cost: z.number(), per: z.enum(['flat', 'head']) })),
      inclusions: z.record(z.string(), z.string()),
      hours: z.number().optional(), notes: z.string().optional(), chosen: z.boolean(),
    })),
  })),
  venueInclusions: z.array(z.string()),
  budgetPlan: z.object({
    total: z.number().optional(),
    lines: z.array(z.object({
      categoryId: z.string(), mode: z.enum(['percent', 'fixed', 'off']), percent: z.number(), locked: z.boolean(),
    })),
  }),
}) satisfies z.ZodType<AppState>

type Raw = Record<string, unknown>

/** v1 venues were flat (one price per venue); v2 nests a priced package per venue. */
function migrateV1Venues(venues: unknown): unknown {
  if (!Array.isArray(venues)) return venues
  return venues.map((v: Raw) => {
    if (Array.isArray(v.packages)) return v
    const { fixedCost, pricePerHead, discount, gratuity, tax, minGuests, maxGuests, chosen, ...rest } = v
    return {
      ...rest,
      packages: [{
        id: `${String(v.id)}-pkg`, name: 'Standard', flatFee: fixedCost ?? 0, pricePerHead: pricePerHead ?? 0, tiers: [],
        minGuests, maxGuests, discount: discount ?? 0, gratuity: gratuity ?? 0, tax: tax ?? 0,
        drinks: 'included', extras: [], inclusions: {}, chosen: chosen ?? false,
      }],
    }
  })
}

/**
 * Bring older saved data up to the current schema. Missing top-level keys are filled from the
 * initial state; add a step per version bump for anything that changed shape.
 */
export function migrate(raw: unknown): unknown {
  if (typeof raw !== 'object' || raw === null) return raw
  const data: Raw = { ...createInitialState(), ...(raw as Raw) }
  const version = typeof data.schemaVersion === 'number' ? data.schemaVersion : 0
  if (version > SCHEMA_VERSION) {
    throw new Error(`This file was saved by a newer version of the planner (v${version}). Please refresh the page.`)
  }
  if (version < 2) data.venues = migrateV1Venues(data.venues)
  return { ...data, schemaVersion: SCHEMA_VERSION }
}

export type ParseResult = { ok: true; state: AppState } | { ok: false; error: string }

export function parseBackup(json: string): ParseResult {
  let raw: unknown
  try {
    raw = JSON.parse(json)
  } catch {
    return { ok: false, error: 'That file is not valid JSON.' }
  }
  try {
    const result = appStateSchema.safeParse(migrate(raw))
    if (!result.success) {
      const issue = result.error.issues[0]
      return { ok: false, error: `That file doesn't look like a planner backup (${issue.path.join('.') || 'root'}: ${issue.message}).` }
    }
    return { ok: true, state: result.data }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}
