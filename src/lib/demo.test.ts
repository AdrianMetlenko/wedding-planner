import { describe, expect, it } from 'vitest'
import { appStateSchema } from '../store/schema'
import { createDemoState } from './demo'

const state = createDemoState()
const ids = <T extends { id: string }>(records: T[]) => new Set(records.map((r) => r.id))

describe('createDemoState', () => {
  it('passes the app state schema', () => {
    const result = appStateSchema.safeParse(state)
    expect(result.success).toBe(true)
  })

  it('references only records that exist', () => {
    const households = ids(state.households)
    const categories = ids(state.categories)
    const tags = ids(state.tags)
    const tables = ids(state.tables)
    for (const g of state.guests) {
      expect(households.has(g.householdId), `${g.id} householdId`).toBe(true)
      expect(categories.has(g.categoryId), `${g.id} categoryId`).toBe(true)
      for (const t of g.tagIds) expect(tags.has(t), `${g.id} tag ${t}`).toBe(true)
      if (g.tableId !== undefined) expect(tables.has(g.tableId), `${g.id} tableId`).toBe(true)
    }
    for (const gift of state.gifts) {
      for (const h of gift.householdIds) expect(households.has(h), `${gift.id} household ${h}`).toBe(true)
    }
    const expenseCategories = ids(state.expenseCategories)
    for (const e of state.expenses) expect(expenseCategories.has(e.categoryId), `${e.id} category`).toBe(true)
  })

  it('never seats a guest over table capacity', () => {
    for (const table of state.tables) {
      const seated = state.guests.filter((g) => g.tableId === table.id)
      expect(seated.length, table.name).toBeLessThanOrEqual(table.capacity)
    }
  })

  it('seats only guests who said yes', () => {
    for (const g of state.guests) {
      if (g.tableId !== undefined) expect(g.rsvp, g.id).toBe('yes')
    }
  })

  it('numbers seats 1..n uniquely within each table', () => {
    for (const table of state.tables) {
      const seats = state.guests
        .filter((g) => g.tableId === table.id)
        .map((g) => g.seat)
        .sort((a, b) => (a ?? 0) - (b ?? 0))
      const n = seats.length
      expect(seats, table.name).toEqual(Array.from({ length: n }, (_, i) => i + 1))
    }
  })

  it('is deterministic', () => {
    expect(createDemoState()).toEqual(state)
  })

  it('has a believable mid-planning shape', () => {
    const count = (f: (g: (typeof state.guests)[number]) => boolean) => state.guests.filter(f).length
    expect(state.guests.length).toBeGreaterThanOrEqual(155)
    expect(state.guests.length).toBeLessThanOrEqual(175)
    expect(state.households.length).toBe(70)
    expect(count((g) => g.rsvp === 'yes')).toBeGreaterThanOrEqual(100)
    expect(count((g) => g.rsvp === 'yes')).toBeLessThanOrEqual(120)
    expect(count((g) => g.planned)).toBeGreaterThanOrEqual(140)
    expect(state.tables.length).toBe(14)
    expect(state.gifts.length).toBe(30)
    expect(state.gifts.filter((g) => g.householdIds.length === 0).length).toBe(2)
  })
})
