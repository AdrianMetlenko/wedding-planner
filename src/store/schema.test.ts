import { describe, expect, it } from 'vitest'
import { createInitialState } from '../lib/defaults'
import { parseBackup } from './schema'

describe('parseBackup', () => {
  it('round-trips the initial state', () => {
    const state = createInitialState()
    const result = parseBackup(JSON.stringify(state))
    expect(result).toEqual({ ok: true, state })
  })

  it('rejects non-JSON and foreign JSON', () => {
    expect(parseBackup('nope').ok).toBe(false)
    expect(parseBackup(JSON.stringify({ guests: [{ name: 'x' }] })).ok).toBe(false)
  })

  it('rejects files from a newer version', () => {
    const result = parseBackup(JSON.stringify({ ...createInitialState(), schemaVersion: 99 }))
    expect(result.ok).toBe(false)
  })
})

describe('migrate v1 → v2', () => {
  it('nests flat v1 venues into a single package', () => {
    const v1 = {
      ...createInitialState(), schemaVersion: 1, venueInclusions: undefined,
      venues: [{ id: 'v1', name: 'Hall', fixedCost: 1000, pricePerHead: 139, discount: 0, gratuity: 0.1, tax: 0, maxGuests: 220, chosen: true }],
    }
    const result = parseBackup(JSON.stringify(v1))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.state.schemaVersion).toBe(2)
    expect(result.state.venueInclusions.length).toBeGreaterThan(0)
    expect(result.state.venues[0]).toMatchObject({
      name: 'Hall',
      packages: [{ flatFee: 1000, pricePerHead: 139, gratuity: 0.1, maxGuests: 220, drinks: 'included', chosen: true }],
    })
  })
})
