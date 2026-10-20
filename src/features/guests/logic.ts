// Pure helpers for the Guests and RSVP screens (filtering, grouping, RSVP patches, cascades).
import type { Guest, GuestType, Household, Rsvp } from '../../lib/types'

export interface GuestFilters {
  search: string
  categoryId: string
  tagId: string
  rsvp: Rsvp | ''
  planned: '' | 'yes' | 'no'
  type: GuestType | ''
}

export const EMPTY_FILTERS: GuestFilters = { search: '', categoryId: '', tagId: '', rsvp: '', planned: '', type: '' }

export const hasActiveFilters = (f: GuestFilters) => Object.values(f).some((v) => v !== '')

export function filterGuests(guests: Guest[], f: GuestFilters): Guest[] {
  const q = f.search.trim().toLowerCase()
  return guests.filter((g) => {
    if (q) {
      const hay = [g.title, g.firstName, g.lastName, g.email].filter(Boolean).join(' ').toLowerCase()
      if (!hay.includes(q)) return false
    }
    if (f.categoryId && g.categoryId !== f.categoryId) return false
    if (f.tagId && !g.tagIds.includes(f.tagId)) return false
    if (f.rsvp && g.rsvp !== f.rsvp) return false
    if (f.planned === 'yes' && !g.planned) return false
    if (f.planned === 'no' && g.planned) return false
    if (f.type && g.type !== f.type) return false
    return true
  })
}

const TYPE_ORDER: Record<GuestType, number> = { adult: 0, child: 1, staff: 2 }

const cmp = (a: string, b: string) => a.localeCompare(b, undefined, { sensitivity: 'base' })

/** Adults first, then children, then staff; then by last and first name. */
export function compareMembers(a: Guest, b: Guest): number {
  return TYPE_ORDER[a.type] - TYPE_ORDER[b.type] || cmp(a.lastName, b.lastName) || cmp(a.firstName, b.firstName)
}

export interface HouseholdGroup {
  /** Undefined for guests whose household record is missing. */
  household: Household | undefined
  key: string
  name: string
  members: Guest[]
}

/** Group guests by household, sorted by household name; members sorted adults first. */
export function groupByHousehold(guests: Guest[], households: Household[]): HouseholdGroup[] {
  const byId = new Map(households.map((h) => [h.id, h]))
  const groups = new Map<string, HouseholdGroup>()
  for (const g of guests) {
    const household = byId.get(g.householdId)
    const key = household?.id ?? '__none__'
    let grp = groups.get(key)
    if (!grp) {
      grp = { household, key, name: household?.name ?? 'No household', members: [] }
      groups.set(key, grp)
    }
    grp.members.push(g)
  }
  const out = [...groups.values()]
  for (const grp of out) grp.members.sort(compareMembers)
  return out.sort((a, b) => cmp(a.name, b.name))
}

/** Patch for changing a guest's RSVP; declining clears any seat. */
export function rsvpPatch(guest: Guest, rsvp: Rsvp): Partial<Guest> {
  if (rsvp === 'no' && (guest.tableId !== undefined || guest.seat !== undefined)) {
    return { rsvp, tableId: undefined, seat: undefined }
  }
  return { rsvp }
}

/** How many of these guests would lose a seat if set to `rsvp`. */
export function seatsLost(guests: Guest[], rsvp: Rsvp): number {
  return rsvp === 'no' ? guests.filter((g) => g.tableId !== undefined).length : 0
}

/** Households that would be left with no members after deleting the given guests. */
export function emptiedHouseholds(guests: Guest[], deleteIds: Set<string>): string[] {
  const all = new Set(guests.map((g) => g.householdId))
  const remaining = new Set(guests.filter((g) => !deleteIds.has(g.id)).map((g) => g.householdId))
  return [...all].filter((id) => !remaining.has(id))
}

export interface ChaseHousehold extends HouseholdGroup {
  pending: Guest[]
  emails: string[]
  phones: string[]
}

const uniq = (xs: (string | undefined)[]) => [...new Set(xs.map((x) => x?.trim()).filter((x): x is string => !!x))]

/** Households with at least one pending member, optionally limited to a category. */
export function chaseList(guests: Guest[], households: Household[], categoryId = ''): ChaseHousehold[] {
  const scoped = categoryId ? guests.filter((g) => g.categoryId === categoryId) : guests
  return groupByHousehold(scoped, households)
    .map((grp) => {
      const pending = grp.members.filter((g) => g.rsvp === 'pending')
      // Contact details come from any member of the household, not just pending ones.
      const all = guests.filter((g) => g.householdId === grp.household?.id)
      return { ...grp, pending, emails: uniq(all.map((g) => g.email)), phones: uniq(all.map((g) => g.phone)) }
    })
    .filter((h) => h.pending.length > 0)
}

export const emailList = (list: ChaseHousehold[]) => [...new Set(list.flatMap((h) => h.emails))].join('; ')

export const sortByLastName = (guests: Guest[]) =>
  [...guests].sort((a, b) => cmp(a.lastName, b.lastName) || cmp(a.firstName, b.firstName))
