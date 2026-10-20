// Pure helpers for the dashboard (kept out of src/lib to stay inside this feature's folder).
import { optimiserCurve, optimalPoint } from '../../lib/calc'
import type { OptimiserPoint } from '../../lib/calc'
import { formatMoney } from '../../lib/format'
import type { Settings } from '../../lib/types'

export function countdownLabel(days: number | undefined): string | undefined {
  if (days === undefined) return undefined
  if (days === 0) return 'Today is the day!'
  if (days === 1) return '1 day to go'
  if (days > 1) return `${days} days to go`
  const ago = -days
  return ago === 1 ? 'Married 1 day ago' : `Married ${ago} days ago`
}

export interface CapacityWarning { tone: 'warn' | 'error'; text: string }

export function capacityWarnings(settings: Settings, planned: number, attending: number): CapacityWarning[] {
  const { min, max } = settings.capacity
  const out: CapacityWarning[] = []
  if (planned > max) out.push({ tone: 'error', text: `The plan has ${planned} counted guests, ${planned - max} over the venue maximum of ${max}.` })
  if (attending > max) out.push({ tone: 'error', text: `${attending} confirmed guests is ${attending - max} over the venue maximum of ${max}.` })
  if (min !== undefined && attending < min) {
    out.push({ tone: 'warn', text: `Venue minimum is ${min}; with ${attending} attending you will be billed for the shortfall of ${min - attending}.` })
  }
  return out
}

/** Adult-priced cost, gifts and net at n counted guests (the optimiser's model). */
export function pointAt(settings: Settings, n: number): OptimiserPoint {
  // Delegate to the shared curve so venue fees (flat fee, discount, service charge) are included.
  return optimiserCurve(settings, n, n)[0]
}

/** Change in net cost from adding one guest at n. Positive = costs more, negative = saves. */
export function marginalNet(settings: Settings, n: number): number {
  return pointAt(settings, n + 1).net - pointAt(settings, n).net
}

/** Whether the next guest crosses a price tier threshold. */
/** Whether the next guest changes the per-head price actually billed (after paying up to cheaper tiers). */
export function crossesTier(settings: Settings, n: number): boolean {
  return pointAt(settings, n + 1).adultPrice !== pointAt(settings, n).adultPrice
}

/** Curve from 0 guests to the venue max, widened to include the given counts. */
export function optimiserRange(settings: Settings, include: number[]): OptimiserPoint[] {
  const marks = include.filter((n) => n > 0)
  const to = Math.min(5000, Math.max(settings.capacity.max, ...marks))
  return optimiserCurve(settings, 0, to)
}

export function optimiserSummary(settings: Settings, curve: OptimiserPoint[]) {
  const best = optimalPoint(curve)
  const goal = settings.capacity.goal
  const goalPoint = goal !== undefined ? pointAt(settings, goal) : undefined
  const hasGift = (settings.averageGift ?? 0) > 0
  const label = hasGift ? 'net cost' : 'cost'
  const lines: string[] = []
  if (best) lines.push(`Cheapest ${label} is at ${best.headcount} guests (${formatMoney(best.net)}).`)
  if (goalPoint) lines.push(`Your goal of ${goalPoint.headcount} costs ${formatMoney(goalPoint.net)}${hasGift ? ' net' : ''}.`)
  return { best, goalPoint, hasGift, text: lines.join(' ') }
}

export function marginalText(settings: Settings, n: number): string {
  const delta = marginalNet(settings, n)
  const net = (settings.averageGift ?? 0) > 0 ? ' net' : ''
  const here = pointAt(settings, n)
  const spare = here.billed - n
  const tier = crossesTier(settings, n) ? ' This crosses a price tier, so the cost steps at this point.'
    : spare > 0 ? ` You're billed for ${here.billed} places, so up to ${spare} more guest${spare === 1 ? '' : 's'} add no venue cost.` : ''
  if (Math.round(delta) === 0) return `Adding one guest at your current count of ${n} changes the cost by about nothing.${tier}`
  const verb = delta > 0 ? 'costs' : 'saves'
  return `Adding one guest at your current count of ${n} ${verb} ${formatMoney(Math.abs(delta))}${net}.${tier}`
}

export interface BandLabel {
  keys: string[]
  text: string
  value: number
  /** 0 = closest to the bar; higher lanes sit further away so labels don't collide. */
  lane: number
}

/**
 * Lay out capacity-band labels: markers with the same value share one label ("Min & goal 220"),
 * and labels closer than `minGap` (as a fraction of the scale) are pushed to the next lane.
 */
export function layoutBandLabels(
  markers: { key: string; label: string; value: number }[],
  scale: number,
  minGap = 0.14,
): BandLabel[] {
  const groups = new Map<number, { keys: string[]; labels: string[] }>()
  for (const m of markers) {
    const g = groups.get(m.value) ?? { keys: [], labels: [] }
    g.keys.push(m.key)
    g.labels.push(m.label)
    groups.set(m.value, g)
  }
  const sorted = [...groups.entries()].sort((a, b) => a[0] - b[0])
  const laneEnds: number[] = [] // last value placed in each lane
  return sorted.map(([value, g]) => {
    let lane = laneEnds.findIndex((end) => (value - end) / scale >= minGap)
    if (lane === -1) lane = laneEnds.length
    laneEnds[lane] = value
    const joined = g.labels.map((l, i) => (i === 0 ? l : l.toLowerCase())).join(' & ')
    return { keys: g.keys, text: `${joined} ${value}`, value, lane }
  })
}
