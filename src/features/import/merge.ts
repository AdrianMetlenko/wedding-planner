// Builds the final guest / household / category / tag collections from cleaned rows. Pure.
import { paletteColor } from '../../lib/defaults'
import { newId } from '../../lib/id'
import type { Category, Guest, Household, Tag } from '../../lib/types'
import type { CleanRow } from './clean'
import { cleanText, nameKey } from './normalise'

export type ImportMode = 'replace' | 'merge'
export type NameChoice = { kind: 'create' } | { kind: 'map'; id: string } | { kind: 'skip' }
export type RowAction = 'new' | 'updated' | 'unchanged'

export interface ExistingData {
  guests: Guest[]
  households: Household[]
  categories: Category[]
  tags: Tag[]
}

export interface PlanOptions {
  mode: ImportMode
  /** Category for rows with a blank category. */
  defaultCategoryId: string
  /** Keyed by lower-case name. Missing key = create. */
  categoryChoices?: Record<string, NameChoice>
  tagChoices?: Record<string, NameChoice>
}

export interface ImportPlan {
  guests: Guest[]
  households: Household[]
  newCategories: Category[]
  newTags: Tag[]
  /** CleanRow.index → what happens to it. */
  actions: Record<number, RowAction>
  counts: { added: number; updated: number; unchanged: number }
}

const fullName = (r: { firstName: string; lastName: string }) => `${r.firstName} ${r.lastName}`
const personKey = (r: { firstName: string; lastName: string }) => nameKey(fullName(r))

/**
 * Extra warnings about likely duplicates (same first + last name, case-insensitive), keyed by row index.
 * Within the file always; against existing guests only when merging into a different household
 * (a same-household match is the intended merge target, and replacing discards the old list).
 */
export function duplicateWarnings(rows: CleanRow[], existing: ExistingData, mode: ImportMode): Record<number, string[]> {
  const out: Record<number, string[]> = {}
  const add = (i: number, msg: string) => (out[i] ??= []).push(msg)
  const firstSeen = new Map<string, number>()
  for (const r of rows) {
    if (!r.firstName || !r.lastName) continue
    const k = personKey(r)
    const prev = firstSeen.get(k)
    if (prev === undefined) firstSeen.set(k, r.index)
    else add(r.index, `Possible duplicate of row ${prev} (${fullName(r)})`)
  }
  if (mode === 'merge') {
    const hhName = new Map(existing.households.map((h) => [h.id, nameKey(h.name)]))
    for (const r of rows) {
      if (!r.firstName || !r.lastName) continue
      const label = nameKey(r.household || fullName(r))
      const same = existing.guests.filter((g) => personKey(g) === personKey(r))
      if (same.length && !same.some((g) => hhName.get(g.householdId) === label)) {
        add(r.index, `${fullName(r)} already exists in another household`)
      }
    }
  }
  return out
}

export function buildPlan(rows: CleanRow[], existing: ExistingData, opts: PlanOptions): ImportPlan {
  const merge = opts.mode === 'merge'
  const baseGuests = merge ? existing.guests : []
  const guests: Guest[] = [...baseGuests]
  const households: Household[] = merge ? [...existing.households] : []
  const hhById = new Map(households.map((h) => [h.id, h]))
  const hhByName = new Map<string, Household>()
  for (const h of households) if (!hhByName.has(nameKey(h.name))) hhByName.set(nameKey(h.name), h)

  const categories = [...existing.categories]
  const tags = [...existing.tags]
  const newCategories: Category[] = []
  const newTags: Tag[] = []
  const catByKey = new Map(categories.map((c) => [nameKey(c.name), c.id]))
  const tagByKey = new Map(tags.map((t) => [nameKey(t.name), t.id]))

  const resolveCategory = (name: string): string => {
    const key = nameKey(name)
    const hit = catByKey.get(key)
    if (hit) return hit
    const choice = opts.categoryChoices?.[key]
    if (choice?.kind === 'map') return choice.id
    const cat: Category = { id: newId('cat'), name: cleanText(name), color: paletteColor(categories.length) }
    categories.push(cat)
    newCategories.push(cat)
    catByKey.set(key, cat.id)
    return cat.id
  }
  const resolveTag = (name: string): string | undefined => {
    const key = nameKey(name)
    const hit = tagByKey.get(key)
    if (hit) return hit
    const choice = opts.tagChoices?.[key]
    if (choice?.kind === 'skip') return undefined
    if (choice?.kind === 'map') return choice.id
    const tag: Tag = { id: newId('tag'), name: cleanText(name), color: paletteColor(tags.length + 3) }
    tags.push(tag)
    newTags.push(tag)
    tagByKey.set(key, tag.id)
    return tag.id
  }

  const used = new Set<string>()
  const actions: Record<number, RowAction> = {}
  const counts = { added: 0, updated: 0, unchanged: 0 }

  for (const r of rows) {
    const label = r.household || fullName(r)
    const hhKey = nameKey(label)

    // Merge: find the existing guest with the same name in a household with the same name.
    let matchIdx = -1
    if (merge) {
      matchIdx = guests.findIndex((g, i) =>
        i < baseGuests.length && !used.has(g.id) && personKey(g) === personKey(r)
        && nameKey(hhById.get(g.householdId)?.name) === hhKey)
    }

    const categoryId = r.categoryName ? resolveCategory(r.categoryName) : undefined
    const tagIds = r.tagNames.map(resolveTag).filter((x): x is string => !!x)
    const hasAddress = r.line1 || r.city || r.state || r.postcode || r.country

    if (matchIdx !== -1) {
      const g = guests[matchIdx]
      used.add(g.id)
      const next: Guest = { ...g, attributes: { ...g.attributes, ...r.attributes } }
      if (r.title) next.title = r.title
      if (r.type) next.type = r.type
      if (categoryId) next.categoryId = categoryId
      if (r.tagNames.length) next.tagIds = tagIds
      if (r.planned !== undefined) next.planned = r.planned
      if (r.rsvp) next.rsvp = r.rsvp
      if (r.email) next.email = r.email
      if (r.phone) next.phone = r.phone
      if (r.notes) next.notes = r.notes
      if (hasAddress) {
        const a = { ...g.address }
        if (r.line1) a.line1 = r.line1
        if (r.city) a.city = r.city
        if (r.state) a.state = r.state
        if (r.postcode) a.postcode = r.postcode
        if (r.country) a.country = r.country
        next.address = a
      }
      const changed = JSON.stringify(next) !== JSON.stringify(g)
      if (changed) guests[matchIdx] = next
      actions[r.index] = changed ? 'updated' : 'unchanged'
      counts[changed ? 'updated' : 'unchanged']++
      continue
    }

    // New guest: a labelled household is shared (and reused if it already exists); blank gets its own.
    let hh: Household | undefined = r.household ? hhByName.get(hhKey) : undefined
    if (!hh) {
      hh = { id: newId('hh'), name: label }
      households.push(hh)
      hhById.set(hh.id, hh)
      if (r.household) hhByName.set(hhKey, hh)
    }
    const guest: Guest = {
      id: newId('guest'),
      firstName: r.firstName,
      lastName: r.lastName,
      householdId: hh.id,
      categoryId: categoryId ?? opts.defaultCategoryId,
      tagIds,
      attributes: { ...r.attributes },
      type: r.type ?? 'adult',
      planned: r.planned ?? true,
      rsvp: r.rsvp ?? 'pending',
    }
    if (r.title) guest.title = r.title
    if (r.email) guest.email = r.email
    if (r.phone) guest.phone = r.phone
    if (r.notes) guest.notes = r.notes
    if (hasAddress) {
      guest.address = {
        ...(r.line1 && { line1: r.line1 }), ...(r.city && { city: r.city }), ...(r.state && { state: r.state }),
        ...(r.postcode && { postcode: r.postcode }), ...(r.country && { country: r.country }),
      }
    }
    guests.push(guest)
    actions[r.index] = 'new'
    counts.added++
  }

  return { guests, households, newCategories, newTags, actions, counts }
}
