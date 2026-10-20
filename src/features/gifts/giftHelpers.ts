import { thankYouRequired } from '../../lib/calc'
import type { Gift, Guest, Settings, ThankYouRule } from '../../lib/types'
import { formatMoney } from '../../lib/format'

export type GiftSortKey = 'from' | 'amount'
export type SortDir = 'asc' | 'desc'

/** Sorted copy. Gifts without an amount sort as 0. */
export function sortGifts(gifts: Gift[], key: GiftSortKey, dir: SortDir): Gift[] {
  const sign = dir === 'asc' ? 1 : -1
  return [...gifts].sort((a, b) => {
    const diff = key === 'amount'
      ? (a.amount ?? 0) - (b.amount ?? 0)
      : a.from.localeCompare(b.from, undefined, { sensitivity: 'base' })
    return diff * sign || a.from.localeCompare(b.from)
  })
}

export const ruleIsActive = (rule: ThankYouRule) => rule.nonAttendees || rule.perHeadOver !== undefined

/** The thank-you rule in words, or undefined when neither condition is set. */
export function describeRule(rule: ThankYouRule): string | undefined {
  const parts: string[] = []
  if (rule.nonAttendees) parts.push('the giver’s household is not attending')
  if (rule.perHeadOver !== undefined) parts.push(`the gift is worth more than ${formatMoney(rule.perHeadOver)} per head`)
  if (!parts.length) return undefined
  return `A card is needed when ${parts.join(' or ')}.`
}

export interface ThankYouStats {
  total: number
  sent: number
  /** Gifts the rule says need a card (0 when no rule is active). */
  needsCard: number
  needsCardUnsent: number
}

export function thankYouStats(gifts: Gift[], guests: Guest[], settings: Settings): ThankYouStats {
  const active = ruleIsActive(settings.thankYouRule)
  let sent = 0
  let needsCard = 0
  let needsCardUnsent = 0
  for (const g of gifts) {
    if (g.thankYouSent) sent++
    if (active && thankYouRequired(g, guests, settings)) {
      needsCard++
      if (!g.thankYouSent) needsCardUnsent++
    }
  }
  return { total: gifts.length, sent, needsCard, needsCardUnsent }
}

/** Gift value from attending households divided by the attending headcount. */
export function averagePerAttendingGuest(gifts: Gift[], guests: Guest[]): number | undefined {
  const attendingGuests = guests.filter((g) => g.rsvp === 'yes').length
  if (!attendingGuests) return undefined
  const attendingHouseholds = new Set(guests.filter((g) => g.rsvp === 'yes').map((g) => g.householdId))
  const sum = gifts.reduce(
    (s, g) => (g.householdIds.some((h) => attendingHouseholds.has(h)) ? s + (g.amount ?? 0) : s),
    0,
  )
  return sum / attendingGuests
}
