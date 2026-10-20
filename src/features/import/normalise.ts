// Pure cell-level cleaning helpers for the guest import.
import type { GuestType, Rsvp } from '../../lib/types'

/** Trim, turn non-breaking spaces into spaces and collapse runs of spaces/tabs. */
export const cleanText = (s: string | undefined | null): string =>
  (s ?? '').replace(/[ \t ]+/g, ' ').replace(/^\s+|\s+$/g, '')

/** Case-insensitive comparison key. */
export const nameKey = (s: string | undefined | null): string => cleanText(s).toLowerCase()

const FORMULA_JUNK = /^#(REF!|N\/A|VALUE!|NAME\?|DIV\/0!|NULL!|NUM!)$/i
export const isFormulaJunk = (s: string): boolean => FORMULA_JUNK.test(s.trim())

const TITLES: Record<string, string> = {
  mr: 'Mr.', mrs: 'Mrs.', ms: 'Ms.', dr: 'Dr.', prof: 'Prof.',
}

export function normaliseTitle(raw: string): string {
  const t = cleanText(raw)
  return TITLES[t.replace(/\.+$/, '').toLowerCase()] ?? t
}

/** Trimmed; upper-cased when it is up to 3 letters (e.g. `vic ` becomes `VIC`). */
export function normaliseState(raw: string): string {
  const s = cleanText(raw)
  return /^[A-Za-z]{1,3}$/.test(s) ? s.toUpperCase() : s
}

const TYPE_WORDS: Record<string, GuestType> = {
  adult: 'adult', adults: 'adult',
  child: 'child', children: 'child', kid: 'child', kids: 'child',
  staff: 'staff', vendor: 'staff', vendors: 'staff', crew: 'staff',
}

/** Blank gives `{}` (caller defaults); unknown gives a warning. */
export function parseGuestType(raw: string): { value?: GuestType; warning?: string } {
  const s = nameKey(raw)
  if (!s) return {}
  const value = TYPE_WORDS[s]
  return value ? { value } : { warning: `Unknown guest type "${cleanText(raw)}", using Adult` }
}

const TRUE_WORDS = new Set(['yes', 'y', '1', 'true', 't'])
const FALSE_WORDS = new Set(['no', 'n', '0', 'false', 'f'])

/** Blank gives `{}`; unrecognised gives a warning. */
export function parseBool(raw: string, label: string): { value?: boolean; warning?: string } {
  const s = nameKey(raw)
  if (!s) return {}
  if (TRUE_WORDS.has(s)) return { value: true }
  if (FALSE_WORDS.has(s)) return { value: false }
  return { warning: `Unrecognised ${label} value "${cleanText(raw)}", ignored` }
}

const PENDING_WORDS = new Set(['pending', 'maybe', 'tbc', 'unknown', '?'])

export function parseRsvp(raw: string): { value?: Rsvp; warning?: string } {
  if (PENDING_WORDS.has(nameKey(raw))) return { value: 'pending' }
  const b = parseBool(raw, 'RSVP')
  if (b.warning) return { warning: b.warning }
  return b.value === undefined ? {} : { value: b.value ? 'yes' : 'no' }
}

/** Split a Groups cell on `;` or `,`: cleaned, empties dropped, case-insensitive duplicates removed. */
export function splitList(raw: string): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const part of raw.split(/[;,]/)) {
    const t = cleanText(part)
    if (t && !seen.has(t.toLowerCase())) {
      seen.add(t.toLowerCase())
      out.push(t)
    }
  }
  return out
}

const attrCmp = (s: string) => cleanText(s).replace(/\.+$/, '').trim().toLowerCase()

/** Case-insensitive match to an attribute's values, tolerating trailing dots (`m.` matches `M`). */
export function matchAttrValue(raw: string, values: string[]): string | undefined {
  const k = attrCmp(raw)
  if (!k) return undefined
  return values.find((v) => attrCmp(v) === k)
}
