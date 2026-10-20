import { describe, expect, it } from 'vitest'
import type { Guest, Table } from '../../lib/types'
import {
  buildTables, householdElsewhere, mixSegments, moveGuest, moveTable, renumber, reorderTables,
  seatedAt, unseatTable, unseatWhere,
} from './seating'

const g = (id: string, tableId?: string, seat?: number, extra: Partial<Guest> = {}): Guest => ({
  id, firstName: id, lastName: '', householdId: 'h1', categoryId: 'c1', tagIds: [], attributes: {},
  type: 'adult', planned: true, rsvp: 'yes', tableId, seat, ...extra,
})
const t = (id: string, order: number, name = id): Table => ({ id, name, capacity: 4, order, shape: 'round' })
const ids = (guests: Guest[], tableId: string) => seatedAt(guests, tableId).map((x) => `${x.id}:${x.seat}`)

describe('moveGuest', () => {
  const base = [g('a', 't1', 1), g('b', 't1', 2), g('c', 't1', 3), g('d', 't2', 1), g('e')]

  it('seats from the pool at an index and renumbers', () => {
    expect(ids(moveGuest(base, 'e', 't1', 1), 't1')).toEqual(['a:1', 'e:2', 'b:3', 'c:4'])
  })
  it('appends when no index is given', () => {
    expect(ids(moveGuest(base, 'e', 't2'), 't2')).toEqual(['d:1', 'e:2'])
  })
  it('moves across tables and renumbers the source', () => {
    const next = moveGuest(base, 'a', 't2', 0)
    expect(ids(next, 't1')).toEqual(['b:1', 'c:2'])
    expect(ids(next, 't2')).toEqual(['a:1', 'd:2'])
  })
  it('reorders within a table', () => {
    expect(ids(moveGuest(base, 'a', 't1', 2), 't1')).toEqual(['b:1', 'c:2', 'a:3'])
    expect(ids(moveGuest(base, 'c', 't1', 0), 't1')).toEqual(['c:1', 'a:2', 'b:3'])
  })
  it('unseats and renumbers', () => {
    const next = moveGuest(base, 'b', undefined)
    expect(next.find((x) => x.id === 'b')).toMatchObject({ tableId: undefined, seat: undefined })
    expect(ids(next, 't1')).toEqual(['a:1', 'c:2'])
  })
  it('allows over-capacity and does not mutate', () => {
    const copy = structuredClone(base)
    const next = moveGuest(base, 'e', 't1')
    expect(seatedAt(next, 't1')).toHaveLength(4)
    expect(base).toEqual(copy)
  })
  it('ignores unknown guests and clamps the index', () => {
    expect(moveGuest(base, 'zzz', 't1')).toBe(base)
    expect(ids(moveGuest(base, 'e', 't2', 99), 't2')).toEqual(['d:1', 'e:2'])
  })
})

describe('renumber / unseat', () => {
  it('closes gaps keeping order', () => {
    expect(ids(renumber([g('a', 't1', 5), g('b', 't1', 2)]), 't1')).toEqual(['b:1', 'a:2'])
  })
  it('unseatTable frees its guests only', () => {
    const next = unseatTable([g('a', 't1', 1), g('b', 't2', 1)], 't1')
    expect(next[0].tableId).toBeUndefined()
    expect(next[1].tableId).toBe('t2')
  })
  it('unseatWhere renumbers the remaining guests', () => {
    const next = unseatWhere([g('a', 't1', 1, { rsvp: 'no' }), g('b', 't1', 2)], (x) => x.rsvp !== 'yes')
    expect(ids(next, 't1')).toEqual(['b:1'])
  })
})

describe('tables', () => {
  it('buildTables continues numbering and order', () => {
    const existing = [t('x', 0, 'Table 3'), t('y', 1, 'Parents')]
    const made = buildTables(existing, 2, 8, 'long')
    expect(made.map((m) => [m.name, m.order, m.capacity, m.shape])).toEqual([
      ['Table 4', 2, 8, 'long'], ['Table 5', 3, 8, 'long'],
    ])
  })
  it('moveTable swaps and normalises order', () => {
    const out = moveTable([t('a', 0), t('b', 5), t('c', 9)], 'b', -1)
    expect(out.map((x) => [x.id, x.order])).toEqual([['b', 0], ['a', 1], ['c', 2]])
  })
  it('moveTable at the edge keeps the sequence', () => {
    expect(moveTable([t('a', 0), t('b', 1)], 'a', -1).map((x) => x.id)).toEqual(['a', 'b'])
  })
  it('reorderTables drags one onto another', () => {
    expect(reorderTables([t('a', 0), t('b', 1), t('c', 2)], 'a', 'c').map((x) => x.id)).toEqual(['b', 'c', 'a'])
  })
})

describe('mixes and households', () => {
  it('mixSegments drops zeros and keeps unknown keys', () => {
    const segs = mixSegments(
      [g('a', undefined, undefined, { categoryId: 'c2' }), g('b', undefined, undefined, { categoryId: 'zz' })],
      (x) => x.categoryId, [{ key: 'c1', label: 'One' }, { key: 'c2', label: 'Two' }],
    )
    expect(segs.map((s) => [s.key, s.count])).toEqual([['c2', 1], ['zz', 1]])
  })
  it('householdElsewhere lists other attending members tables once', () => {
    const guests = [g('a', 't1', 1), g('b', 't2', 1), g('c', 't2', 2), g('d', 't1', 2, { rsvp: 'no' }), g('e', 't3', 1, { householdId: 'h2' })]
    const tables = [t('t1', 0, 'Table 1'), t('t2', 1, 'Table 2'), t('t3', 2, 'Table 3')]
    expect(householdElsewhere(guests[0], guests, tables)).toEqual(['Table 2'])
  })
})
