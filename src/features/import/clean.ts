// Turns raw CSV rows into cleaned rows with per-row errors and warnings. Pure; no store access.
import type { BalanceAttribute, GuestType, Rsvp } from '../../lib/types'
import { attrKey, type FieldKey, type Mapping, fieldDefs } from './mapping'
import {
  cleanText, isFormulaJunk, matchAttrValue, nameKey, normaliseState, normaliseTitle, parseBool,
  parseGuestType, parseRsvp, splitList,
} from './normalise'

export interface CleanRow {
  /** 1-based position among the data rows of the file. */
  index: number
  household: string
  title?: string
  firstName: string
  lastName: string
  /** Undefined when blank or unrecognised (callers default to adult / merge leaves it alone). */
  type?: GuestType
  categoryName: string
  tagNames: string[]
  planned?: boolean
  rsvp?: Rsvp
  email?: string
  phone?: string
  line1?: string
  city?: string
  state?: string
  postcode?: string
  country?: string
  notes?: string
  attributes: Record<string, string>
  errors: string[]
  warnings: string[]
}

export function cleanRows(rows: string[][], mapping: Mapping, attributes: BalanceAttribute[]): CleanRow[] {
  const defs = fieldDefs(attributes)
  const label = (k: FieldKey) => defs.find((d) => d.key === k)?.label ?? k

  return rows.map((cells, i) => {
    const warnings: string[] = []
    const errors: string[] = []
    /** Cleaned cell for a field; formula junk becomes blank with a warning. */
    const get = (key: FieldKey): string => {
      const col = mapping[key]
      if (col == null) return ''
      const raw = cleanText(cells[col])
      if (isFormulaJunk(raw)) {
        warnings.push(`${label(key)}: ${raw} treated as blank`)
        return ''
      }
      return raw
    }
    const opt = (key: FieldKey): string | undefined => get(key) || undefined

    const type = parseGuestType(get('type'))
    if (type.warning) warnings.push(type.warning)
    const planned = parseBool(get('planned'), 'Planned')
    if (planned.warning) warnings.push(planned.warning)
    const rsvp = parseRsvp(get('rsvp'))
    if (rsvp.warning) warnings.push(rsvp.warning)

    const firstName = get('firstName')
    const lastName = get('lastName')
    if (!firstName) errors.push('First name is required')
    if (!lastName) errors.push('Last name is required')

    const title = opt('title')
    const state = opt('state')
    const email = opt('email')
    if (email && !/^\S+@\S+$/.test(email)) warnings.push(`Email "${email}" does not look valid`)

    const row: CleanRow = {
      index: i + 1,
      household: get('household'),
      title: title && normaliseTitle(title),
      firstName,
      lastName,
      type: type.value,
      categoryName: get('category'),
      tagNames: splitList(get('tags')),
      planned: planned.value,
      rsvp: rsvp.value,
      email,
      phone: opt('phone'),
      line1: opt('address'),
      city: opt('city'),
      state: state && normaliseState(state),
      postcode: opt('postcode'),
      country: opt('country'),
      notes: opt('notes'),
      attributes: {},
      errors,
      warnings,
    }

    for (const a of attributes.filter((x) => x.enabled)) {
      const raw = get(attrKey(a.id))
      if (!raw) continue
      const match = matchAttrValue(raw, a.values)
      if (match) row.attributes[a.id] = match
      else warnings.push(`${a.name}: "${raw}" is not one of ${a.values.join(', ')}; left unset`)
    }
    return row
  })
}

export interface UnknownName {
  /** Lower-case key. */
  key: string
  /** First spelling seen. */
  name: string
  count: number
}

/** Names used by `rows` that are not in `known`, each listed once. */
export function unknownNames(
  rows: CleanRow[], pick: (r: CleanRow) => string[], known: { name: string }[],
): UnknownName[] {
  const knownKeys = new Set(known.map((k) => nameKey(k.name)))
  const out = new Map<string, UnknownName>()
  for (const r of rows) {
    for (const name of pick(r)) {
      const key = nameKey(name)
      if (!key || knownKeys.has(key)) continue
      const e = out.get(key)
      if (e) e.count++
      else out.set(key, { key, name, count: 1 })
    }
  }
  return [...out.values()]
}

export const unknownCategories = (rows: CleanRow[], known: { name: string }[]) =>
  unknownNames(rows, (r) => (r.categoryName ? [r.categoryName] : []), known)

export const unknownTags = (rows: CleanRow[], known: { name: string }[]) =>
  unknownNames(rows, (r) => r.tagNames, known)
