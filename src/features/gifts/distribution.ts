// Gift distribution across attending households, for the box-and-whisker plot.
import type { Gift, Guest, Household } from '../../lib/types'

export type GiftBasis = 'perGuest' | 'perHousehold'

export interface GiftPoint {
  householdId: string
  name: string
  /** Attending members of the household. */
  attending: number
  /** Sum of valued gifts linked to the household. */
  total: number
  value: number
  /** Gave nothing at all (no gift linked). */
  none: boolean
}

export interface GiftDistribution {
  points: GiftPoint[]
  /** Attending households whose only gifts have no dollar value (items without an amount): left out of the plot. */
  unvalued: { householdId: string; name: string }[]
  stats?: BoxStats
}

export interface BoxStats {
  min: number
  q1: number
  median: number
  q3: number
  max: number
  mean: number
  /** Whisker ends: furthest points within 1.5 × IQR of the box. */
  lowWhisker: number
  highWhisker: number
  /** Points beyond the whiskers. */
  outliers: number[]
}

/** Quantile with linear interpolation between closest ranks (same as numpy's default). */
export function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return NaN
  const pos = (sorted.length - 1) * q
  const lo = Math.floor(pos)
  const hi = Math.ceil(pos)
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo)
}

export function boxStats(values: number[]): BoxStats | undefined {
  if (values.length === 0) return undefined
  const v = [...values].sort((a, b) => a - b)
  const q1 = quantile(v, 0.25)
  const q3 = quantile(v, 0.75)
  const iqr = q3 - q1
  const lowFence = q1 - 1.5 * iqr
  const highFence = q3 + 1.5 * iqr
  const inside = v.filter((x) => x >= lowFence && x <= highFence)
  return {
    min: v[0], q1, median: quantile(v, 0.5), q3, max: v[v.length - 1],
    mean: v.reduce((s, x) => s + x, 0) / v.length,
    lowWhisker: inside[0] ?? q1,
    highWhisker: inside[inside.length - 1] ?? q3,
    outliers: v.filter((x) => x < lowFence || x > highFence),
  }
}

/**
 * One point per household with someone attending: its valued gifts, per attending guest or per
 * household. Households that gave nothing are $0 ("non-gifts"); gifts linked to several households
 * are split across them by attending headcount.
 */
export function giftDistribution(gifts: Gift[], guests: Guest[], households: Household[], basis: GiftBasis): GiftDistribution {
  const attendingBy = new Map<string, number>()
  for (const g of guests) if (g.rsvp === 'yes') attendingBy.set(g.householdId, (attendingBy.get(g.householdId) ?? 0) + 1)
  const name = new Map(households.map((h) => [h.id, h.name]))

  const total = new Map<string, number>()
  const anyGift = new Set<string>()
  const valuedGift = new Set<string>()
  for (const gift of gifts) {
    const linked = gift.householdIds.filter((h) => attendingBy.has(h))
    if (linked.length === 0) continue
    const heads = linked.reduce((s, h) => s + attendingBy.get(h)!, 0)
    for (const h of linked) {
      anyGift.add(h)
      if (gift.amount === undefined) continue
      valuedGift.add(h)
      total.set(h, (total.get(h) ?? 0) + (gift.amount * attendingBy.get(h)!) / heads)
    }
  }

  const points: GiftPoint[] = []
  const unvalued: GiftDistribution['unvalued'] = []
  for (const [householdId, attending] of attendingBy) {
    const label = name.get(householdId) ?? 'Unknown household'
    if (anyGift.has(householdId) && !valuedGift.has(householdId)) {
      unvalued.push({ householdId, name: label })
      continue
    }
    const t = total.get(householdId) ?? 0
    points.push({
      householdId, name: label, attending, total: t,
      value: basis === 'perGuest' ? t / attending : t,
      none: !anyGift.has(householdId),
    })
  }
  points.sort((a, b) => a.value - b.value)
  return { points, unvalued, stats: boxStats(points.map((p) => p.value)) }
}
