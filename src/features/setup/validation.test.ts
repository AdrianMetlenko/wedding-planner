import { describe, expect, it } from 'vitest'
import { createInitialState } from '../../lib/defaults'
import {
  maxReachableStep, resumeStep, stepErrors, validateAttributes, validateBasics, validateCapacity,
  validateNamedList, validateTiers,
} from './validation'

const base = () => createInitialState()

describe('validateBasics', () => {
  it('requires names and date', () => {
    expect(Object.keys(validateBasics(base().settings)).sort()).toEqual(['date', 'name1', 'name2'])
  })
  it('accepts complete basics', () => {
    const s = base().settings
    s.coupleNames = ['A', 'B']
    s.date = '2027-06-12'
    expect(validateBasics(s)).toEqual({})
  })
})

describe('validateCapacity', () => {
  it('defaults are valid', () => expect(validateCapacity(base().settings)).toEqual({}))
  it('enforces min <= goal <= max', () => {
    const s = base().settings
    s.capacity = { ...s.capacity, min: 120, goal: 100, max: 150 }
    expect(validateCapacity(s).goal).toBeDefined()
    s.capacity = { ...s.capacity, min: 100, goal: 200, max: 150 }
    expect(validateCapacity(s).goal).toBeDefined()
    s.capacity = { ...s.capacity, min: 200, goal: undefined, max: 150 }
    expect(validateCapacity(s).min).toBeDefined()
    s.capacity = { ...s.capacity, min: 100, goal: 120, max: 150 }
    expect(validateCapacity(s)).toEqual({})
  })
  it('requires a max and at least one counted type', () => {
    const s = base().settings
    s.capacity = { ...s.capacity, max: 0, countsTypes: [] }
    const e = validateCapacity(s)
    expect(e.max).toBeDefined()
    expect(e.countsTypes).toBeDefined()
  })
  it('validates the venue fees, which are optional', () => {
    const s = base().settings
    s.flatFee = 9000
    s.discount = 0.1
    s.serviceCharge = 0.175
    expect(validateCapacity(s)).toEqual({})
    s.flatFee = -1
    s.discount = 1.5
    s.serviceCharge = -0.1
    const e = validateCapacity(s)
    expect([e.flatFee, e.discount, e.serviceCharge].every(Boolean)).toBe(true)
  })
  it('validates tiers inside capacity', () => {
    const s = base().settings
    s.tiers = [{ below: 0, price: 10 }]
    expect(validateCapacity(s)['tier-0-below']).toBeDefined()
  })
})

describe('validateTiers', () => {
  it('requires ascending thresholds and positive prices', () => {
    expect(validateTiers([{ below: 180, price: 179 }, { below: 220, price: 157 }])).toEqual({})
    expect(validateTiers([{ below: 220, price: 157 }, { below: 180, price: 179 }])['tier-1-below']).toBeDefined()
    expect(validateTiers([{ below: 180, price: 0 }])['tier-0-price']).toBeDefined()
    expect(validateTiers([{ below: 180, price: 1 }, { below: 180, price: 1 }])['tier-1-below']).toBeDefined()
  })
})

describe('validateNamedList', () => {
  it('needs the minimum count, names and uniqueness', () => {
    expect(validateNamedList([], 'category', 1).list).toBeDefined()
    expect(validateNamedList([], 'group', 0)).toEqual({})
    const e = validateNamedList([{ id: 'a', name: ' ' }, { id: 'b', name: 'X' }, { id: 'c', name: 'x' }], 'group', 0)
    expect(e['name-a']).toBeDefined()
    expect(e['name-c']).toBeDefined()
    expect(e['name-b']).toBeUndefined()
  })
})

describe('validateAttributes', () => {
  it('only checks values of enabled attributes', () => {
    const a = { id: 'x', name: 'Mood', values: ['Happy'], enabled: false }
    expect(validateAttributes([a])).toEqual({})
    expect(validateAttributes([{ ...a, enabled: true }])['values-x']).toBeDefined()
    expect(validateAttributes([{ ...a, enabled: true, values: ['A', 'a'] }])['values-x']).toBeDefined()
    expect(validateAttributes([{ ...a, enabled: true, values: ['A', 'B'] }])).toEqual({})
  })
})

describe('progress', () => {
  it('starts on welcome, then resumes at the first incomplete step', () => {
    const s = base()
    expect(resumeStep(s)).toBe(0)
    s.settings.coupleNames = ['A', 'B']
    s.settings.date = '2027-06-12'
    s.setup.completedStep = 1
    expect(resumeStep(s)).toBe(2)
    expect(maxReachableStep(s)).toBe(2)
  })
  it('does not go past an invalid step', () => {
    const s = base()
    s.setup.completedStep = 4
    expect(maxReachableStep(s)).toBe(1) // basics empty
  })
  it('opens everything once done', () => {
    const s = base()
    s.setup = { completedStep: 7, done: true }
    expect(maxReachableStep(s)).toBe(7)
    expect(resumeStep(s)).toBe(1)
  })
  it('stepErrors is empty for welcome and import', () => {
    expect(stepErrors(0, base())).toEqual({})
    expect(stepErrors(7, base())).toEqual({})
  })
})
