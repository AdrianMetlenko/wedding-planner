import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS } from '../../lib/defaults'
import type { Gift, Guest } from '../../lib/types'
import { averagePerAttendingGuest, describeRule, sortGifts, thankYouStats } from './giftHelpers'

const guest = (id: string, householdId: string, rsvp: Guest['rsvp']): Guest => ({
  id, firstName: id, lastName: 'T', householdId, categoryId: 'c', tagIds: [], attributes: {},
  type: 'adult', planned: true, rsvp,
})
const gift = (id: string, from: string, amount: number | undefined, householdIds: string[], sent = false): Gift =>
  ({ id, from, householdIds, kind: 'money', amount, thankYouSent: sent })

describe('giftHelpers', () => {
  it('sorts by amount and from', () => {
    const gs = [gift('1', 'b', 10, []), gift('2', 'a', 50, []), gift('3', 'c', undefined, [])]
    expect(sortGifts(gs, 'amount', 'desc').map((g) => g.id)).toEqual(['2', '1', '3'])
    expect(sortGifts(gs, 'from', 'asc').map((g) => g.id)).toEqual(['2', '1', '3'])
  })

  it('describes the rule', () => {
    expect(describeRule({ nonAttendees: false })).toBeUndefined()
    expect(describeRule({ nonAttendees: true, perHeadOver: 100 })).toContain('$100')
  })

  it('counts thank-you stats under the rule', () => {
    const guests = [guest('a', 'h1', 'yes'), guest('b', 'h2', 'no')]
    const gs = [gift('1', 'x', 20, ['h1']), gift('2', 'y', 20, ['h2']), gift('3', 'z', 20, [], true)]
    expect(thankYouStats(gs, guests, DEFAULT_SETTINGS)).toEqual({ total: 3, sent: 1, needsCard: 2, needsCardUnsent: 1 })
    const none = thankYouStats(gs, guests, { ...DEFAULT_SETTINGS, thankYouRule: { nonAttendees: false } })
    expect(none.needsCard).toBe(0)
  })

  it('averages over attending guests', () => {
    const guests = [guest('a', 'h1', 'yes'), guest('b', 'h1', 'yes'), guest('c', 'h2', 'no')]
    const gs = [gift('1', 'x', 100, ['h1']), gift('2', 'y', 50, ['h2'])]
    expect(averagePerAttendingGuest(gs, guests)).toBe(50)
    expect(averagePerAttendingGuest(gs, [])).toBeUndefined()
  })
})
