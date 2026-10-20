// Pure seating helpers: no React, no store. Pass data in, get new arrays out.
import { guestName } from '../../lib/format'
import { newId } from '../../lib/id'
import type { Guest, Household, Table, TableShape } from '../../lib/types'

const bySeat = (a: Guest, b: Guest) => (a.seat ?? Infinity) - (b.seat ?? Infinity)

/** Guests at a table, ordered by seat. */
export function seatedAt(guests: Guest[], tableId: string): Guest[] {
  return guests.filter((g) => g.tableId === tableId).sort(bySeat)
}

/** Renumber seats 1..n at the given tables (all tables when omitted), keeping current seat order. */
export function renumber(guests: Guest[], tableIds?: string[]): Guest[] {
  const ids = tableIds ? new Set(tableIds) : undefined
  const seatOf = new Map<string, number>()
  const groups = new Map<string, Guest[]>()
  for (const g of guests) {
    if (!g.tableId || (ids && !ids.has(g.tableId))) continue
    groups.set(g.tableId, [...(groups.get(g.tableId) ?? []), g])
  }
  for (const list of groups.values()) list.sort(bySeat).forEach((g, i) => seatOf.set(g.id, i + 1))
  return guests.map((g) => {
    const seat = seatOf.get(g.id)
    return seat !== undefined && g.seat !== seat ? { ...g, seat } : g
  })
}

/**
 * Move a guest to a table at a position (index within the destination's final order; appended
 * when omitted), or unseat them (`toTableId` undefined). Seats are renumbered 1..n at the source
 * and destination tables. Never mutates the input.
 */
export function moveGuest(guests: Guest[], guestId: string, toTableId: string | undefined, index?: number): Guest[] {
  const moving = guests.find((g) => g.id === guestId)
  if (!moving) return guests
  const fromTableId = moving.tableId
  if (toTableId === undefined) {
    const next = guests.map((g) => (g.id === guestId ? { ...g, tableId: undefined, seat: undefined } : g))
    return fromTableId ? renumber(next, [fromTableId]) : next
  }
  const dest = seatedAt(guests, toTableId).filter((g) => g.id !== guestId)
  const at = Math.max(0, Math.min(index ?? dest.length, dest.length))
  dest.splice(at, 0, { ...moving, tableId: toTableId })
  const seat = new Map(dest.map((g, i) => [g.id, i + 1]))
  const next = guests.map((g) => (seat.has(g.id) ? { ...g, tableId: toTableId, seat: seat.get(g.id) } : g))
  return fromTableId && fromTableId !== toTableId ? renumber(next, [fromTableId]) : next
}

/** Unseat every guest matching the predicate, renumbering the tables they left. */
export function unseatWhere(guests: Guest[], pred: (g: Guest) => boolean): Guest[] {
  const touched = new Set<string>()
  const next = guests.map((g) => {
    if (!g.tableId || !pred(g)) return g
    touched.add(g.tableId)
    return { ...g, tableId: undefined, seat: undefined }
  })
  return renumber(next, [...touched])
}

/** Unseat everyone at a table (used when the table is deleted). */
export const unseatTable = (guests: Guest[], tableId: string) => unseatWhere(guests, (g) => g.tableId === tableId)

export const sortTables = (tables: Table[]) => [...tables].sort((a, b) => a.order - b.order)

/** Move a table one place up (-1) or down (+1); `order` becomes 0..n-1. */
export function moveTable(tables: Table[], tableId: string, delta: -1 | 1): Table[] {
  const sorted = sortTables(tables)
  const i = sorted.findIndex((t) => t.id === tableId)
  const j = i + delta
  if (i !== -1 && j >= 0 && j < sorted.length) [sorted[i], sorted[j]] = [sorted[j], sorted[i]]
  return sorted.map((t, k) => ({ ...t, order: k }))
}

/** Move a table to the position of another (drag reorder). */
export function reorderTables(tables: Table[], activeId: string, overId: string): Table[] {
  const sorted = sortTables(tables)
  const from = sorted.findIndex((t) => t.id === activeId)
  const to = sorted.findIndex((t) => t.id === overId)
  if (from !== -1 && to !== -1) {
    const [t] = sorted.splice(from, 1)
    sorted.splice(to, 0, t)
  }
  return sorted.map((x, k) => ({ ...x, order: k }))
}

/** Highest N among names like "Table N"; used to continue numbering. */
export function lastTableNumber(tables: Table[]): number {
  return tables.reduce((max, t) => {
    const m = /^Table (\d+)$/.exec(t.name.trim())
    return m ? Math.max(max, Number(m[1])) : max
  }, 0)
}

/** Build `count` new tables named "Table N", continuing numbering and order. */
export function buildTables(existing: Table[], count: number, capacity: number, shape: TableShape): Table[] {
  const start = lastTableNumber(existing)
  const order = existing.reduce((m, t) => Math.max(m, t.order + 1), 0)
  return Array.from({ length: Math.max(0, Math.floor(count)) }, (_, i) => ({
    id: newId('tbl'),
    name: `Table ${start + i + 1}`,
    capacity: Math.max(1, Math.floor(capacity)),
    order: order + i,
    shape,
  }))
}

export interface MixSegment {
  key: string
  label: string
  count: number
}

/** Counts per key, in the order of `labels`, then any unknown keys; zero counts dropped. */
export function mixSegments(
  guests: Guest[], keyOf: (g: Guest) => string, labels: { key: string; label: string }[],
): MixSegment[] {
  const counts = new Map<string, number>()
  for (const g of guests) counts.set(keyOf(g), (counts.get(keyOf(g)) ?? 0) + 1)
  const known = new Set(labels.map((l) => l.key))
  const out = labels.map((l) => ({ ...l, count: counts.get(l.key) ?? 0 }))
  for (const [key, count] of counts) if (!known.has(key)) out.push({ key, label: key === '' ? 'Not set' : key, count })
  return out.filter((s) => s.count > 0)
}

/** Tables (by name, in table order) where other attending members of the guest's household sit. */
export function householdElsewhere(guest: Guest, guests: Guest[], tables: Table[]): string[] {
  return sortTables(tables)
    .filter((t) => guests.some((g) => g.id !== guest.id && g.householdId === guest.householdId && g.rsvp === 'yes' && g.tableId === t.id))
    .map((t) => t.name)
}

export interface HouseholdGroup {
  household?: Household
  guests: Guest[]
}

/** Group guests by household, groups ordered by household name, guests by name. */
export function groupByHousehold(guests: Guest[], households: Household[]): HouseholdGroup[] {
  const byId = new Map(households.map((h) => [h.id, h]))
  const groups = new Map<string, Guest[]>()
  for (const g of guests) groups.set(g.householdId, [...(groups.get(g.householdId) ?? []), g])
  return [...groups.entries()]
    .map(([id, list]) => ({ household: byId.get(id), guests: list.sort((a, b) => guestName(a).localeCompare(guestName(b))) }))
    .sort((a, b) => (a.household?.name ?? '￿').localeCompare(b.household?.name ?? '￿'))
}

export const SHAPES: { value: TableShape; label: string }[] = [
  { value: 'round', label: 'Round' },
  { value: 'long', label: 'Long' },
  { value: 'custom', label: 'Custom' },
]
