import { describe, expect, it } from 'vitest'
import type { Guest, Household } from '../../lib/types'
import {
  EMPTY_FILTERS, chaseList, emailList, emptiedHouseholds, filterGuests, groupByHousehold, rsvpPatch, sortByLastName,
} from './logic'

const g = (id: string, over: Partial<Guest> = {}): Guest => ({
  id, firstName: id, lastName: 'Smith', householdId: 'h1', categoryId: 'c1', tagIds: [], attributes: {},
  type: 'adult', planned: true, rsvp: 'pending', ...over,
})
const hs: Household[] = [{ id: 'h1', name: 'Smith' }, { id: 'h2', name: 'Adams' }]

describe('filterGuests', () => {
  const guests = [
    g('a', { email: 'x@y.com', tagIds: ['t1'] }),
    g('b', { rsvp: 'yes', planned: false, categoryId: 'c2', type: 'child' }),
  ]
  it('returns all with empty filters', () => expect(filterGuests(guests, EMPTY_FILTERS)).toHaveLength(2))
  it('searches name and email', () => {
    expect(filterGuests(guests, { ...EMPTY_FILTERS, search: 'X@Y' }).map((x) => x.id)).toEqual(['a'])
  })
  it('combines filters', () => {
    expect(filterGuests(guests, { ...EMPTY_FILTERS, rsvp: 'yes', planned: 'no', type: 'child', categoryId: 'c2' })).toHaveLength(1)
    expect(filterGuests(guests, { ...EMPTY_FILTERS, tagId: 't1', rsvp: 'yes' })).toHaveLength(0)
  })
})

describe('groupByHousehold', () => {
  it('sorts households by name and adults before children', () => {
    const groups = groupByHousehold(
      [g('kid', { type: 'child' }), g('z', { householdId: 'h2' }), g('ad', { firstName: 'Zed' })], hs)
    expect(groups.map((x) => x.name)).toEqual(['Adams', 'Smith'])
    expect(groups[1].members.map((m) => m.id)).toEqual(['ad', 'kid'])
  })
  it('groups missing households together', () => {
    expect(groupByHousehold([g('q', { householdId: 'gone' })], hs)[0].name).toBe('No household')
  })
})

describe('rsvpPatch', () => {
  it('clears seat when declining', () => {
    expect(rsvpPatch(g('a', { tableId: 't', seat: 2 }), 'no')).toEqual({ rsvp: 'no', tableId: undefined, seat: undefined })
  })
  it('keeps seat otherwise', () => expect(rsvpPatch(g('a', { tableId: 't' }), 'yes')).toEqual({ rsvp: 'yes' }))
})

describe('emptiedHouseholds', () => {
  it('finds households losing all members', () => {
    const all = [g('a'), g('b'), g('c', { householdId: 'h2' })]
    expect(emptiedHouseholds(all, new Set(['a', 'c']))).toEqual(['h2'])
  })
})

describe('chaseList', () => {
  const all = [
    g('a', { email: 'a@x.com' }), g('b', { rsvp: 'yes', email: 'b@x.com', phone: '1' }),
    g('c', { householdId: 'h2', rsvp: 'yes' }),
  ]
  it('lists households with pending members and household contacts', () => {
    const list = chaseList(all, hs)
    expect(list).toHaveLength(1)
    expect(list[0].pending.map((p) => p.id)).toEqual(['a'])
    expect(emailList(list)).toBe('a@x.com; b@x.com')
    expect(list[0].phones).toEqual(['1'])
  })
  it('filters by category', () => expect(chaseList(all, hs, 'nope')).toHaveLength(0))
})

describe('sortByLastName', () => {
  it('sorts by last then first', () => {
    expect(sortByLastName([g('b', { lastName: 'Z' }), g('a', { lastName: 'A' })]).map((x) => x.id)).toEqual(['a', 'b'])
  })
})
