import { describe, expect, it } from 'vitest'
import type { Gift, Guest } from '../../lib/types'
import { boxStats, giftDistribution, quantile } from './distribution'

const guest = (householdId: string, rsvp: Guest['rsvp'] = 'yes'): Guest => ({
  id: crypto.randomUUID(), firstName: 'A', lastName: 'B', householdId, categoryId: 'c', tagIds: [],
  attributes: {}, type: 'adult', planned: true, rsvp,
})
const gift = (householdIds: string[], amount?: number): Gift =>
  ({ id: crypto.randomUUID(), from: 'x', householdIds, kind: amount === undefined ? 'item' : 'money', amount, thankYouSent: false })

describe('boxStats', () => {
  it('computes quartiles and flags outliers beyond 1.5 × IQR', () => {
    expect(quantile([1, 2, 3, 4], 0.5)).toBe(2.5)
    const s = boxStats([0, 100, 100, 110, 120, 150, 1000])!
    expect(s.median).toBe(110)
    expect(s.q1).toBe(100)
    expect(s.q3).toBe(135)
    expect(s.outliers).toEqual([0, 1000]) // fences 47.5 and 187.5
    expect(s.lowWhisker).toBe(100)
    expect(s.highWhisker).toBe(150)
  })

  it('is undefined for no data', () => {
    expect(boxStats([])).toBeUndefined()
  })
})

describe('giftDistribution', () => {
  const guests = [guest('h1'), guest('h1'), guest('h2'), guest('h3'), guest('h4'), guest('h5', 'no')]
  const households = ['h1', 'h2', 'h3', 'h4', 'h5'].map((id) => ({ id, name: id }))
  const gifts = [gift(['h1'], 300), gift(['h3']), gift(['h4', 'h1'], 90), gift(['h5'], 500), gift([], 50)]

  it('has one point per attending household, with non-gifts at $0 and unvalued items left out', () => {
    const d = giftDistribution(gifts, guests, households, 'perGuest')
    const by = Object.fromEntries(d.points.map((p) => [p.householdId, p]))
    expect(Object.keys(by).sort()).toEqual(['h1', 'h2', 'h4'])
    expect(by.h2).toMatchObject({ value: 0, none: true })
    // shared 90 split by attending heads: h1 gets 60, h4 gets 30
    expect(by.h1).toMatchObject({ total: 360, value: 180, none: false })
    expect(by.h4).toMatchObject({ total: 30, value: 30 })
    expect(d.unvalued.map((u) => u.householdId)).toEqual(['h3'])
  })

  it('can measure per household instead of per guest', () => {
    const d = giftDistribution(gifts, guests, households, 'perHousehold')
    expect(d.points.find((p) => p.householdId === 'h1')?.value).toBe(360)
  })
})
