import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS } from './defaults'
import {
  adultPriceAt, cheapestBilling, giftPerHead, guestsFor, optimalPoint, optimiserCurve, packageCostAt, packageToSettings,
  thankYouRequired, venueCost,
} from './calc'
import type { Gift, Guest, Settings, VenuePackage } from './types'

// Worked-example pricing (see docs/methodology.md): <180 → 179, <220 → 157, else 139; average gift 110.
const example: Settings = {
  ...DEFAULT_SETTINGS,
  capacity: { min: 180, goal: 220, max: 240, countsTypes: ['adult', 'child', 'staff'] },
  pricePerHead: { adult: 139, child: 75, staff: 95 },
  tiers: [{ below: 180, price: 179 }, { below: 220, price: 157 }],
  averageGift: 110,
}

const guest = (p: Partial<Guest>): Guest => ({
  id: crypto.randomUUID(), firstName: 'A', lastName: 'B', householdId: 'h1', categoryId: 'c',
  tagIds: [], attributes: {}, type: 'adult', planned: true, rsvp: 'pending', ...p,
})

describe('tiered pricing', () => {
  it('matches the worked-example thresholds', () => {
    expect(adultPriceAt(179, example)).toBe(179)
    expect(adultPriceAt(180, example)).toBe(157)
    expect(adultPriceAt(219, example)).toBe(157)
    expect(adultPriceAt(220, example)).toBe(139)
  })

  it('uses the flat price without tiers', () => {
    expect(adultPriceAt(50, { ...example, tiers: [] })).toBe(139)
  })
})

describe('cheapestBilling', () => {
  const tiers = [{ below: 180, price: 179 }, { below: 220, price: 157 }]
  it('staggers costs for the 150 / 180 / 220 packages', () => {
    expect(cheapestBilling(150, tiers, 139, 150)).toEqual({ billed: 150, price: 179 })
    expect(cheapestBilling(157, tiers, 139, 150)).toEqual({ billed: 157, price: 179 }) // 157 × 179 = 28,103 < 28,260
    expect(cheapestBilling(158, tiers, 139, 150)).toEqual({ billed: 180, price: 157, reason: 'tier' })
    expect(cheapestBilling(194, tiers, 139, 150)).toEqual({ billed: 194, price: 157 }) // 30,458 < 30,580
    expect(cheapestBilling(195, tiers, 139, 150)).toEqual({ billed: 220, price: 139, reason: 'tier' })
    expect(cheapestBilling(100, tiers, 139, 150)).toEqual({ billed: 150, price: 179, reason: 'minimum' })
  })
})

describe('optimiser', () => {
  it('reproduces the 180 vs 220 net cost from the worked example', () => {
    const curve = optimiserCurve(example, 180, 220)
    expect(curve[0]).toMatchObject({ headcount: 180, cost: 28_260, net: 8_460 })
    expect(curve.at(-1)).toMatchObject({ headcount: 220, cost: 30_580, net: 6_380 })
  })

  it('bills the venue minimum below it', () => {
    const [p] = optimiserCurve(example, 150, 150) // the example minimum is 180
    expect(p.cost).toBe(180 * 157)
    expect(p.net).toBe(180 * 157 - 150 * 110)
  })

  it('finds the cheapest net headcount', () => {
    expect(optimalPoint(optimiserCurve(example, 180, 240))?.headcount).toBe(220)
    expect(optimalPoint(optimiserCurve({ ...example, averageGift: 0 }, 180, 240))?.headcount).toBe(180)
  })
})

describe('venueCost', () => {
  it('prices children and staff flat and bills up to the venue minimum', () => {
    const r = venueCost({ adult: 170, child: 2, staff: 7 }, example)
    expect(r.headcount).toBe(179)
    expect(r.billedAdults).toBe(171) // one short of the 180 minimum
    expect(r.adultPrice).toBe(157)
    expect(r.total).toBe(171 * 157 + 2 * 75 + 7 * 95)
  })

  it('only counts configured guest types toward tiers', () => {
    const adultsOnly = { ...example, capacity: { ...example.capacity, min: undefined, countsTypes: ['adult' as const] } }
    expect(venueCost({ adult: 190, child: 40, staff: 0 }, adultsOnly).adultPrice).toBe(157)
  })

  it('pays up to a cheaper tier when that costs less', () => {
    const noMin = { ...example, capacity: { ...example.capacity, min: 150 } }
    const r = venueCost({ adult: 210, child: 0, staff: 0 }, noMin) // 210 × 157 = 32,970 > 220 × 139 = 30,580
    expect(r).toMatchObject({ billedHeadcount: 220, billingReason: 'tier', adultPrice: 139, total: 30_580 })
    const atMin = venueCost({ adult: 140, child: 0, staff: 0 }, noMin)
    expect(atMin).toMatchObject({ billedHeadcount: 150, billingReason: 'minimum', adultPrice: 179 })
  })
})

describe('guests and gifts', () => {
  const guests = [
    guest({ householdId: 'h1', rsvp: 'yes' }),
    guest({ householdId: 'h1', rsvp: 'yes' }),
    guest({ householdId: 'h2', rsvp: 'no' }),
    guest({ householdId: 'h3', planned: false }),
  ]

  it('forecast is confirmed guests plus planned guests still to reply', () => {
    expect(guestsFor(guests, 'planned')).toHaveLength(2)
    expect(guestsFor(guests, 'attending')).toHaveLength(2)
    const more = [...guests, guest({ planned: false, rsvp: 'yes' }), guest({ planned: true, rsvp: 'pending' })]
    expect(guestsFor(more, 'planned')).toHaveLength(4) // an unplanned yes counts; a planned pending counts
  })

  const gift = (p: Partial<Gift>): Gift => ({ id: 'g', from: 'x', householdIds: [], kind: 'money', thankYouSent: false, ...p })

  it('splits gift value across attending household members', () => {
    expect(giftPerHead(gift({ householdIds: ['h1'], amount: 300 }), guests)).toBe(150)
    expect(giftPerHead(gift({ householdIds: ['h2'], amount: 80 }), guests)).toBe(80)
  })

  it('applies the optional thank-you rule', () => {
    const rule = { ...example, thankYouRule: { nonAttendees: true, perHeadOver: 120 } }
    expect(thankYouRequired(gift({ householdIds: ['h2'], amount: 10 }), guests, rule)).toBe(true)
    expect(thankYouRequired(gift({ householdIds: ['h1'], amount: 200 }), guests, rule)).toBe(false)
    expect(thankYouRequired(gift({ householdIds: ['h1'], amount: 300 }), guests, rule)).toBe(true)
    expect(thankYouRequired(gift({ householdIds: ['h2'], amount: 10 }), guests, { ...rule, thankYouRule: { nonAttendees: false } })).toBe(false)
  })
})

describe('venue fees in the planner settings', () => {
  it('adds the flat fee, discounts per-head charges, then applies the service charge', () => {
    const s = { ...example, capacity: { ...example.capacity, min: undefined }, flatFee: 2000, discount: 0.1, serviceCharge: 0.2 }
    const r = venueCost({ adult: 100, child: 0, staff: 0 }, s)
    expect(r.discount).toBeCloseTo(100 * 179 * 0.1)
    expect(r.total).toBeCloseTo((2000 + 100 * 179 * 0.9) * 1.2)
    expect(optimiserCurve(s, 100, 100)[0].cost).toBeCloseTo(r.total)
  })
})

describe('packageCostAt', () => {
  const pkg: VenuePackage = {
    id: 'p', name: 'Standard', flatFee: 5000, pricePerHead: 100, tiers: [{ below: 120, price: 120 }],
    minGuests: 100, maxGuests: 150, discount: 0, gratuity: 0.1, tax: 0.1,
    drinks: 'byo', drinksPerHead: 20, extras: [{ id: 'e', name: 'DJ', cost: 1500, per: 'flat' }, { id: 'f', name: 'Cake', cost: 5, per: 'head' }],
    inclusions: {}, chosen: false,
  }

  it('adds drinks and extras outside the venue service charge', () => {
    const r = packageCostAt(pkg, 130)
    expect(r.venue).toBeCloseTo((5000 + 130 * 100) * 1.2)
    expect(r.drinks).toBe(130 * 20)
    expect(r.extras).toBe(1500 + 130 * 5)
    expect(r.total).toBeCloseTo(r.venue + r.drinks + r.extras)
    expect(r.overCapacity).toBe(false)
  })

  it('bills the minimum, uses tiers, flags over capacity, ignores drinks when included', () => {
    const r = packageCostAt({ ...pkg, drinks: 'included' }, 90)
    expect(r.billed).toBe(100)
    expect(r.pricePerHead).toBe(120)
    expect(r.drinks).toBe(0)
    expect(packageCostAt(pkg, 160).overCapacity).toBe(true)
  })

  it('maps a chosen package onto planner settings', () => {
    const patch = packageToSettings(pkg, example)
    expect(patch).toMatchObject({
      capacity: { min: 100, max: 150 }, pricePerHead: { adult: 100, child: 75, staff: 95 },
      tiers: [{ below: 120, price: 120 }], flatFee: 5000, serviceCharge: 0.2,
    })
    expect(patch.discount).toBeUndefined()
  })
})
