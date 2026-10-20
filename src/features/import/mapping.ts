// Column mapping: which CSV column feeds which app field.
import type { BalanceAttribute } from '../../lib/types'

export type BaseField =
  | 'household' | 'title' | 'firstName' | 'lastName' | 'type' | 'category' | 'tags' | 'planned' | 'rsvp'
  | 'email' | 'phone' | 'address' | 'city' | 'state' | 'postcode' | 'country' | 'notes'

/** `attr:<attribute id>` for balance attributes. */
export type FieldKey = BaseField | `attr:${string}`

export interface FieldDef {
  key: FieldKey
  label: string
  required?: boolean
  /** Normalised header names (lower case, letters and digits only) that auto-match. */
  synonyms: string[]
}

export const normaliseHeader = (h: string): string => h.toLowerCase().replace(/[^a-z0-9]/g, '')

export const BASE_FIELDS: FieldDef[] = [
  { key: 'household', label: 'Household', synonyms: ['household', 'householdname', 'family', 'party', 'invitation', 'invite'] },
  { key: 'title', label: 'Title', synonyms: ['title', 'salutation', 'prefix', 'honorific'] },
  { key: 'firstName', label: 'First name', required: true, synonyms: ['firstname', 'first', 'givenname', 'given', 'forename', 'fname'] },
  { key: 'lastName', label: 'Last name', required: true, synonyms: ['lastname', 'last', 'surname', 'familyname', 'lname'] },
  { key: 'type', label: 'Guest type', synonyms: ['guesttype', 'type', 'agetype'] },
  { key: 'category', label: 'Category', synonyms: ['category', 'side', 'group', 'circle', 'list'] },
  { key: 'tags', label: 'Groups (tags)', synonyms: ['groups', 'tags', 'tag', 'labels', 'guestgroups'] },
  { key: 'planned', label: 'Planned', synonyms: ['planned', 'alist', 'plan', 'invited'] },
  { key: 'rsvp', label: 'RSVP', synonyms: ['rsvp', 'attending', 'response', 'status', 'replied'] },
  { key: 'email', label: 'Email', synonyms: ['email', 'emailaddress', 'mail'] },
  { key: 'phone', label: 'Phone', synonyms: ['phone', 'phonenumber', 'mobile', 'telephone', 'tel', 'cell'] },
  { key: 'address', label: 'Address', synonyms: ['address', 'address1', 'addressline1', 'street', 'streetaddress'] },
  { key: 'city', label: 'City', synonyms: ['city', 'town', 'suburb'] },
  { key: 'state', label: 'State', synonyms: ['state', 'province', 'region'] },
  { key: 'postcode', label: 'Postcode', synonyms: ['postcode', 'zip', 'zipcode', 'postalcode', 'postal'] },
  { key: 'country', label: 'Country', synonyms: ['country'] },
  { key: 'notes', label: 'Notes', synonyms: ['notes', 'note', 'comments', 'comment', 'remarks'] },
]

export const attrKey = (id: string): FieldKey => `attr:${id}`

export function fieldDefs(attributes: BalanceAttribute[]): FieldDef[] {
  const attrs = attributes.filter((a) => a.enabled).map((a): FieldDef => ({
    key: attrKey(a.id), label: a.name, synonyms: [normaliseHeader(a.name)],
  }))
  return [...BASE_FIELDS, ...attrs]
}

/** field key → CSV column index, or null when not imported. */
export type Mapping = Partial<Record<FieldKey, number | null>>

/** Auto-match: exact field-name matches first, then synonyms in order. Each column is used at most once. */
export function autoMap(headers: string[], attributes: BalanceAttribute[]): Mapping {
  const defs = fieldDefs(attributes)
  const norm = headers.map(normaliseHeader)
  const used = new Set<number>()
  const mapping: Mapping = {}
  const take = (def: FieldDef, names: string[]) => {
    for (const name of names) {
      const i = norm.findIndex((h, idx) => h === name && !used.has(idx))
      if (i !== -1) {
        used.add(i)
        mapping[def.key] = i
        return
      }
    }
  }
  // Pass 1: the field's own label, so a balance attribute called "Age group" is claimed by name first.
  for (const def of defs) take(def, [normaliseHeader(def.label)])
  // Pass 2: synonyms, in each field's priority order.
  for (const def of defs) if (mapping[def.key] == null) take(def, def.synonyms)
  for (const def of defs) if (mapping[def.key] == null) mapping[def.key] = null
  return mapping
}

export function missingRequired(mapping: Mapping): FieldDef[] {
  return BASE_FIELDS.filter((f) => f.required && mapping[f.key] == null)
}
