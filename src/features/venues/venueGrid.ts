import { packageCostAt, type PackageCost } from '../../lib/calc'
import type { Venue, VenuePackage } from '../../lib/types'

/** Headcounts for the cost grid: 6 even steps from min to max (7 values, endpoints included, rounded). */
export function headcountSteps(min: number, max: number): number[] {
  if (max <= min) return [min]
  const steps = 6
  const values = Array.from({ length: steps + 1 }, (_, i) => Math.round(min + (i * (max - min)) / steps))
  return [...new Set(values)]
}

/**
 * Headcounts for the line chart: from 0 to the largest capacity of any package (or the planner max),
 * one point per guest up to 400 points, so tier steps and minimum-guest billing show as they are.
 */
export function chartHeadcounts(packages: VenuePackage[], plannerMax: number): number[] {
  const upper = Math.max(plannerMax, ...packages.map((p) => p.maxGuests ?? 0), 1)
  const step = Math.max(1, Math.ceil(upper / 400))
  const values: number[] = []
  for (let n = 0; n < upper; n += step) values.push(n)
  values.push(upper)
  return values
}

export interface PackageRef {
  venue: Venue
  pkg: VenuePackage
  /** "Venue — Package", for tables and chart legends. */
  label: string
}

export const venueLabel = (v: Venue) => v.name.trim() || 'Untitled venue'
export const packageLabel = (p: VenuePackage) => p.name.trim() || 'Untitled package'

export function flattenPackages(venues: Venue[]): PackageRef[] {
  return venues.flatMap((venue) =>
    venue.packages.map((pkg) => ({ venue, pkg, label: `${venueLabel(venue)} — ${packageLabel(pkg)}` })))
}

/** Index of the cheapest package that can take the headcount (ties go to the first), or -1. */
export function cheapestIndex(costs: PackageCost[]): number {
  let best = -1
  costs.forEach((c, i) => {
    if (c.overCapacity) return
    if (best === -1 || c.total < costs[best].total) best = i
  })
  return best
}

/** For each headcount column, the index of the cheapest package that can take that headcount (or -1). */
export function cheapestPerColumn(packages: VenuePackage[], headcounts: number[]): number[] {
  return headcounts.map((n) => cheapestIndex(packages.map((p) => packageCostAt(p, n))))
}

/** Rows for the line chart: one key per package id; null past the package's maximum so its line stops. */
export function chartRows(packages: VenuePackage[], headcounts: number[]): Record<string, number | null>[] {
  return headcounts.map((n) => {
    const row: Record<string, number | null> = { headcount: n }
    for (const p of packages) {
      const c = packageCostAt(p, n)
      row[p.id] = c.overCapacity ? null : c.total
    }
    return row
  })
}

// ---- Percent and drinks inputs ----

/** Fractions are stored; people type percentages. */
export const toPercent = (fraction: number) => +(fraction * 100).toFixed(2)
export const fromPercent = (percent: number) => +(percent / 100).toFixed(6)

/** Drinks are often quoted per 100 guests; the model stores a cost per guest. */
export const perGuestFromPer100 = (per100: number) => +(per100 / 100).toFixed(4)
export const per100FromPerGuest = (perGuest: number) => +(perGuest * 100).toFixed(2)

// ---- "What's included" matrix ----

/** Cell cycle: blank → yes → no → blank. A note clears back to blank. */
export function nextInclusion(current: string | undefined): string | undefined {
  if (!current) return 'yes'
  if (current === 'yes') return 'no'
  return undefined
}

/** Copy of an inclusions record with one key set, or removed when the value is blank. */
export function withInclusion(
  inclusions: Record<string, string>, key: string, value: string | undefined,
): Record<string, string> {
  const { [key]: _old, ...rest } = inclusions
  const text = value?.trim()
  return text ? { ...rest, [key]: text } : rest
}

function mapPackages(venues: Venue[], fn: (p: VenuePackage) => VenuePackage): Venue[] {
  return venues.map((v) => ({ ...v, packages: v.packages.map(fn) }))
}

/** Remove an inclusion row's key from every package. */
export const removeInclusionKey = (venues: Venue[], key: string): Venue[] =>
  mapPackages(venues, (p) => ({ ...p, inclusions: withInclusion(p.inclusions, key, undefined) }))

/** Rename an inclusion row's key in every package, keeping the cell values. */
export const renameInclusionKey = (venues: Venue[], from: string, to: string): Venue[] =>
  mapPackages(venues, (p) => {
    if (!(from in p.inclusions)) return p
    const { [from]: value, ...rest } = p.inclusions
    return { ...p, inclusions: { ...rest, [to]: value } }
  })

/** Copy of a list with the item at `index` moved by `delta` (no-op at the ends). */
export function moveItem<T>(list: T[], index: number, delta: -1 | 1): T[] {
  const to = index + delta
  if (to < 0 || to >= list.length) return list
  const next = [...list]
  ;[next[index], next[to]] = [next[to], next[index]]
  return next
}

/** Set `chosen` on one package and clear it everywhere else. */
export const chooseOnly = (venues: Venue[], packageId: string): Venue[] =>
  mapPackages(venues, (p) => ({ ...p, chosen: p.id === packageId }))
