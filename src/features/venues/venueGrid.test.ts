import { describe, expect, it } from 'vitest'
import { packageCostAt } from '../../lib/calc'
import type { Venue, VenuePackage } from '../../lib/types'
import {
  chartHeadcounts, cheapestIndex, cheapestPerColumn, chartRows, chooseOnly, fromPercent, headcountSteps, moveItem, nextInclusion,
  per100FromPerGuest, perGuestFromPer100, removeInclusionKey, renameInclusionKey, toPercent, withInclusion,
} from './venueGrid'

const pkg = (over: Partial<VenuePackage>): VenuePackage => ({
  id: 'p', name: 'P', flatFee: 0, pricePerHead: 100, tiers: [], discount: 0, gratuity: 0, tax: 0,
  drinks: 'included', extras: [], inclusions: {}, chosen: false, ...over,
})
const venue = (id: string, packages: VenuePackage[]): Venue => ({ id, name: id, packages })

describe('headcountSteps', () => {
  it('gives 7 evenly spaced headcounts from min to max', () => {
    expect(headcountSteps(100, 175)).toEqual([100, 113, 125, 138, 150, 163, 175])
  })

  it('collapses to one value when max is not above min', () => {
    expect(headcountSteps(80, 80)).toEqual([80])
  })
})

describe('cheapestPerColumn', () => {
  it('picks the cheapest package per column and ignores packages over capacity', () => {
    const cheap = pkg({ id: 'a', pricePerHead: 50, maxGuests: 120 })
    const dear = pkg({ id: 'b', flatFee: 1000, pricePerHead: 40 })
    expect(cheapestPerColumn([cheap, dear], [100, 150])).toEqual([0, 1])
  })

  it('returns -1 when every package is over capacity', () => {
    expect(cheapestPerColumn([pkg({ maxGuests: 50 })], [100])).toEqual([-1])
  })

  it('counts drinks, so a bar tab can lose to an all-inclusive price', () => {
    const tab = pkg({ id: 'tab', pricePerHead: 80, drinks: 'bar-tab', drinksPerHead: 40 })
    const all = pkg({ id: 'all', pricePerHead: 110 })
    expect(cheapestPerColumn([tab, all], [100])).toEqual([1])
  })
})

describe('cheapestIndex', () => {
  it('gives ties to the first', () => {
    const a = packageCostAt(pkg({}), 10)
    expect(cheapestIndex([a, a])).toBe(0)
  })
})

describe('chartRows', () => {
  it('uses null past a package maximum', () => {
    const rows = chartRows([pkg({ id: 'a', maxGuests: 100 })], [90, 110])
    expect(rows).toEqual([{ headcount: 90, a: 9000 }, { headcount: 110, a: null }])
  })
})

describe('percent and drinks conversion', () => {
  it('round-trips percentages without float noise', () => {
    expect(fromPercent(7.1)).toBe(0.071)
    expect(toPercent(0.071)).toBe(7.1)
    expect(toPercent(fromPercent(8.25))).toBe(8.25)
  })

  it('converts drinks per 100 guests to per guest and back', () => {
    expect(perGuestFromPer100(2800)).toBe(28)
    expect(per100FromPerGuest(28)).toBe(2800)
  })
})

describe('inclusions', () => {
  it('cycles blank, yes, no, blank', () => {
    expect(nextInclusion(undefined)).toBe('yes')
    expect(nextInclusion('yes')).toBe('no')
    expect(nextInclusion('no')).toBeUndefined()
    expect(nextInclusion('Courtyard')).toBeUndefined()
  })

  it('sets and clears a cell', () => {
    expect(withInclusion({ a: 'yes' }, 'b', ' Courtyard ')).toEqual({ a: 'yes', b: 'Courtyard' })
    expect(withInclusion({ a: 'yes' }, 'a', '')).toEqual({})
  })

  it('removes and renames a row key in every package', () => {
    const venues = [venue('v', [pkg({ inclusions: { Cake: 'yes', Bar: 'no' } }), pkg({ id: 'q', inclusions: {} })])]
    expect(removeInclusionKey(venues, 'Cake')[0].packages.map((p) => p.inclusions)).toEqual([{ Bar: 'no' }, {}])
    expect(renameInclusionKey(venues, 'Cake', 'Wedding cake')[0].packages.map((p) => p.inclusions))
      .toEqual([{ Bar: 'no', 'Wedding cake': 'yes' }, {}])
  })

  it('moves rows and stops at the ends', () => {
    expect(moveItem(['a', 'b', 'c'], 1, -1)).toEqual(['b', 'a', 'c'])
    expect(moveItem(['a', 'b', 'c'], 0, -1)).toEqual(['a', 'b', 'c'])
    expect(moveItem(['a', 'b', 'c'], 2, 1)).toEqual(['a', 'b', 'c'])
  })
})

describe('chooseOnly', () => {
  it('marks one package chosen across all venues', () => {
    const venues = [
      venue('v1', [pkg({ id: 'a', chosen: true }), pkg({ id: 'b' })]),
      venue('v2', [pkg({ id: 'c' })]),
    ]
    const out = chooseOnly(venues, 'c').flatMap((v) => v.packages.map((p) => [p.id, p.chosen]))
    expect(out).toEqual([['a', false], ['b', false], ['c', true]])
  })
})

describe('chartHeadcounts', () => {
  it('runs from 0 to the largest package capacity or planner max', () => {
    const pkgs = [{ maxGuests: 150 }, { maxGuests: 300 }, {}] as unknown as VenuePackage[]
    const hc = chartHeadcounts(pkgs, 240)
    expect(hc[0]).toBe(0)
    expect(hc.at(-1)).toBe(300)
    expect(hc).toHaveLength(301)
    expect(chartHeadcounts([], 2000).length).toBeLessThanOrEqual(401)
  })
})
