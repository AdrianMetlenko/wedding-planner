// Pure derived calculations shared by all screens. No React, no store access: pass data in.
import type {
  AppState, Expense, Gift, Guest, GuestType, LiquorItem, PriceTier, Settings, Table, VenuePackage,
} from './types'

export type CountBasis = 'planned' | 'attending'

export const isAttending = (g: Guest) => g.rsvp === 'yes'

/**
 * Guests confirmed attending, or in the forecast: everyone who said yes (planned or not) plus
 * planned guests still to reply. Before replies it is the plan; once everyone replies it equals attending.
 */
export function guestsFor(guests: Guest[], basis: CountBasis): Guest[] {
  return basis === 'attending'
    ? guests.filter(isAttending)
    : guests.filter((g) => g.rsvp === 'yes' || (g.planned && g.rsvp === 'pending'))
}

export function countByType(guests: Guest[]): Record<GuestType, number> {
  const counts: Record<GuestType, number> = { adult: 0, child: 0, staff: 0 }
  for (const g of guests) counts[g.type]++
  return counts
}

/** Headcount the venue counts toward its min/max and price tiers. */
export function countedHeadcount(counts: Record<GuestType, number>, settings: Settings): number {
  return settings.capacity.countsTypes.reduce((sum, t) => sum + counts[t], 0)
}

/** Price per head at a headcount: the first tier whose `below` exceeds it, else the base price. */
export function tieredPrice(tiers: PriceTier[], base: number, headcount: number): number {
  return [...tiers].sort((a, b) => a.below - b.below).find((t) => headcount < t.below)?.price ?? base
}

/** Adult price per head at a counted headcount. */
export const adultPriceAt = (headcount: number, settings: Settings) =>
  tieredPrice(settings.tiers, settings.pricePerHead.adult, headcount)

export interface Billing {
  /** Headcount the venue bills for. */
  billed: number
  price: number
  /** Why billed exceeds the real headcount: the venue minimum, or paying up to a cheaper tier. */
  reason?: 'minimum' | 'tier'
}

/**
 * Cheapest way to be billed for n guests with tiered per-head pricing. The venue bills at least
 * its minimum, and paying for extra places to reach a cheaper tier is allowed when that costs less
 * (e.g. 175 guests: 180 × $157 beats 175 × $179). Ties keep the smaller headcount.
 */
export function cheapestBilling(n: number, tiers: PriceTier[], base: number, min = 0): Billing {
  const floor = Math.max(n, min)
  const candidates = [floor, ...tiers.map((t) => t.below).filter((b) => b > floor)]
  let best: Billing = { billed: floor, price: tieredPrice(tiers, base, floor) }
  for (const c of candidates) {
    const price = tieredPrice(tiers, base, c)
    if (c * price < best.billed * best.price) best = { billed: c, price }
  }
  if (best.billed > n) best.reason = best.billed === floor && min > n ? 'minimum' : 'tier'
  return best
}

/**
 * The one venue pricing rule, shared by the planner settings and venue packages:
 * (flat fee + per-head charges × (1 − discount)) × (1 + service charge).
 */
export function applyVenueFees(perHeadCharges: number, fees: { flatFee?: number; discount?: number; serviceCharge?: number }) {
  const discount = perHeadCharges * (fees.discount ?? 0)
  const beforeService = (fees.flatFee ?? 0) + perHeadCharges - discount
  const service = beforeService * (fees.serviceCharge ?? 0)
  return { discount, service, total: beforeService + service }
}

export interface VenueCostBreakdown {
  counts: Record<GuestType, number>
  headcount: number
  /** Counted headcount the venue bills for (≥ headcount): its minimum, or a cheaper tier's threshold. */
  billedHeadcount: number
  /** Why billed exceeds the headcount. */
  billingReason?: 'minimum' | 'tier'
  /** Adults billed, including the extra places. */
  billedAdults: number
  adultPrice: number
  /** Per-head charges by type, before discount and service charge. Adult includes extra places. */
  byType: Record<GuestType, number>
  flatFee: number
  discount: number
  service: number
  total: number
  perHead: number
}

/** Catering/venue cost for a set of guests, using tiers, the venue minimum and venue fees. */
export function venueCost(counts: Record<GuestType, number>, settings: Settings): VenueCostBreakdown {
  const headcount = countedHeadcount(counts, settings)
  const billing = cheapestBilling(headcount, settings.tiers, settings.pricePerHead.adult, settings.capacity.min)
  const extra = billing.billed - headcount
  const billedAdults = counts.adult + extra
  const adultPrice = billing.price
  const byType = {
    adult: billedAdults * adultPrice,
    child: counts.child * settings.pricePerHead.child,
    staff: counts.staff * settings.pricePerHead.staff,
  }
  const fees = applyVenueFees(byType.adult + byType.child + byType.staff, settings)
  const people = counts.adult + counts.child + counts.staff
  return {
    counts, headcount, billedHeadcount: billing.billed, billingReason: billing.reason, billedAdults, adultPrice, byType,
    flatFee: settings.flatFee ?? 0, discount: fees.discount, service: fees.service,
    total: fees.total, perHead: people ? fees.total / people : 0,
  }
}

export interface OptimiserPoint {
  headcount: number
  /** Headcount billed (venue minimum, or a cheaper tier's threshold). */
  billed: number
  adultPrice: number
  cost: number
  gifts: number
  net: number
}

/**
 * The "guest list cost" what-if: cost of n counted guests (all priced as adults, with venue fees)
 * for every n in [from, to], minus n × expected average gift. Billing follows `cheapestBilling`:
 * at least the venue minimum, paying up to a cheaper tier when that costs less.
 */
export function optimiserCurve(settings: Settings, from?: number, to?: number): OptimiserPoint[] {
  const lo = Math.max(0, from ?? settings.capacity.min ?? Math.round(settings.capacity.max * 0.6))
  const hi = Math.max(lo, to ?? settings.capacity.max)
  const avg = settings.averageGift ?? 0
  const points: OptimiserPoint[] = []
  for (let n = lo; n <= hi; n++) {
    const { billed, price } = cheapestBilling(n, settings.tiers, settings.pricePerHead.adult, settings.capacity.min)
    const cost = applyVenueFees(billed * price, settings).total
    const gifts = n * avg
    points.push({ headcount: n, billed, adultPrice: price, cost, gifts, net: cost - gifts })
  }
  return points
}

/** Cheapest point by net cost (or cost when no average gift is set); ties go to the larger headcount. */
export function optimalPoint(points: OptimiserPoint[]): OptimiserPoint | undefined {
  return points.reduce<OptimiserPoint | undefined>(
    (best, p) => (!best || p.net <= best.net ? p : best),
    undefined,
  )
}

// ---- Households & gifts ----

export function membersOf(householdIds: string[], guests: Guest[]): Guest[] {
  const ids = new Set(householdIds)
  return guests.filter((g) => ids.has(g.householdId))
}

/** Gift value split across the attending members of its households (all members if none attend). */
export function giftPerHead(gift: Gift, guests: Guest[]): number | undefined {
  if (gift.amount === undefined) return undefined
  const members = membersOf(gift.householdIds, guests)
  const attending = members.filter(isAttending)
  const heads = attending.length || members.length
  return heads ? gift.amount / heads : gift.amount
}

export function giftFromNonAttendees(gift: Gift, guests: Guest[]): boolean {
  return !membersOf(gift.householdIds, guests).some(isAttending)
}

/** Does the couple's optional thank-you rule say this gift needs a card? */
export function thankYouRequired(gift: Gift, guests: Guest[], settings: Settings): boolean {
  const rule = settings.thankYouRule
  if (rule.nonAttendees && giftFromNonAttendees(gift, guests)) return true
  if (rule.perHeadOver !== undefined) {
    const perHead = giftPerHead(gift, guests)
    if (perHead !== undefined && perHead > rule.perHeadOver) return true
  }
  return false
}

export function giftTotals(gifts: Gift[], guests: Guest[]) {
  let attending = 0
  let nonAttending = 0
  for (const g of gifts) {
    const amount = g.amount ?? 0
    if (giftFromNonAttendees(g, guests)) nonAttending += amount
    else attending += amount
  }
  return { attending, nonAttending, total: attending + nonAttending }
}

// ---- Budget ----

export const remaining = (e: Expense) => e.estimate - e.paid

export function expenseTotals(expenses: Expense[]) {
  return expenses.reduce(
    (t, e) => ({ estimate: t.estimate + e.estimate, paid: t.paid + e.paid, remaining: t.remaining + remaining(e) }),
    { estimate: 0, paid: 0, remaining: 0 },
  )
}

/** Expenses that count toward the wedding budget, honouring the honeymoon setting. */
export function budgetExpenses(state: Pick<AppState, 'expenses' | 'settings'>): Expense[] {
  const mode = state.settings.modules.honeymoon
  return state.expenses.filter((e) => e.module === 'wedding' || (e.module === 'honeymoon' && mode === 'in-budget'))
}

// ---- Seating ----

export function tableGuests(table: Table, guests: Guest[]): Guest[] {
  return guests
    .filter((g) => g.tableId === table.id)
    .sort((a, b) => (a.seat ?? Infinity) - (b.seat ?? Infinity))
}

export function seatingSummary(tables: Table[], guests: Guest[]) {
  const seats = tables.reduce((s, t) => s + t.capacity, 0)
  const attending = guests.filter(isAttending)
  const seated = attending.filter((g) => g.tableId && tables.some((t) => t.id === g.tableId)).length
  return { seats, attending: attending.length, seated, unseated: attending.length - seated, spare: seats - attending.length }
}

/** Count of guests per value of a balance attribute (unset values counted under ''). */
export function attributeMix(guests: Guest[], attributeId: string): Record<string, number> {
  const mix: Record<string, number> = {}
  for (const g of guests) {
    const v = g.attributes[attributeId] ?? ''
    mix[v] = (mix[v] ?? 0) + 1
  }
  return mix
}

// ---- Liquor ----

export function liquorLine(item: LiquorItem) {
  const bottles = Object.values(item.bottles).reduce((s, n) => s + (n || 0), 0)
  const offers = Object.entries(item.prices).filter(([, p]) => p > 0)
  const best = offers.reduce<[string, number] | undefined>((b, o) => (!b || o[1] < b[1] ? o : b), undefined)
  return { bottles, cheapestVendorId: best?.[0], unitPrice: best?.[1], total: best ? best[1] * bottles : 0 }
}

// ---- Venues ----

export interface PackageCost {
  headcount: number
  /** Headcount billed: the package minimum, or a cheaper tier's threshold. */
  billed: number
  pricePerHead: number
  venue: number
  /** Estimated drinks for bar-tab / bring-your-own packages (0 when included). */
  drinks: number
  /** Things not included that are bought separately. */
  extras: number
  total: number
  perHead: number
  overCapacity: boolean
}

/** Like-for-like cost of a venue package at a headcount (everyone priced as an adult). */
export function packageCostAt(pkg: VenuePackage, headcount: number): PackageCost {
  const { billed, price: pricePerHead } = cheapestBilling(headcount, pkg.tiers, pkg.pricePerHead, pkg.minGuests)
  const venue = applyVenueFees(billed * pricePerHead, {
    flatFee: pkg.flatFee, discount: pkg.discount, serviceCharge: pkg.gratuity + pkg.tax,
  }).total
  const drinks = pkg.drinks === 'included' ? 0 : (pkg.drinksPerHead ?? 0) * headcount
  const extras = pkg.extras.reduce((sum, e) => sum + (e.per === 'flat' ? e.cost : e.cost * headcount), 0)
  const total = venue + drinks + extras
  return {
    headcount, billed, pricePerHead, venue, drinks, extras, total,
    perHead: headcount ? total / headcount : 0,
    overCapacity: pkg.maxGuests !== undefined && headcount > pkg.maxGuests,
  }
}

/** Settings patch that makes the planner's cost model match a chosen package. */
export function packageToSettings(pkg: VenuePackage, current: Settings) {
  return {
    capacity: { min: pkg.minGuests, max: pkg.maxGuests ?? current.capacity.max },
    pricePerHead: {
      adult: pkg.pricePerHead,
      child: pkg.childPrice ?? current.pricePerHead.child,
      staff: pkg.staffPrice ?? current.pricePerHead.staff,
    },
    tiers: pkg.tiers.map((t) => ({ ...t })),
    flatFee: pkg.flatFee || undefined,
    discount: pkg.discount || undefined,
    serviceCharge: pkg.gratuity + pkg.tax || undefined,
  }
}
