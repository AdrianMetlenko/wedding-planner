import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS } from '../../lib/defaults'
import type { Settings } from '../../lib/types'
import {
  capacityWarnings, countdownLabel, crossesTier, layoutBandLabels, marginalNet, marginalText, optimiserRange, optimiserSummary, pointAt,
} from './helpers'

const example: Settings = {
  ...DEFAULT_SETTINGS,
  capacity: { min: 180, goal: 220, max: 240, countsTypes: ['adult', 'child', 'staff'] },
  pricePerHead: { adult: 139, child: 75, staff: 95 },
  tiers: [{ below: 180, price: 179 }, { below: 220, price: 157 }],
  averageGift: 110,
}

describe('countdownLabel', () => {
  it('handles future, today and past', () => {
    expect(countdownLabel(123)).toBe('123 days to go')
    expect(countdownLabel(1)).toBe('1 day to go')
    expect(countdownLabel(0)).toBe('Today is the day!')
    expect(countdownLabel(-5)).toBe('Married 5 days ago')
    expect(countdownLabel(undefined)).toBeUndefined()
  })
})

describe('capacityWarnings', () => {
  it('warns about shortfall and overflow', () => {
    expect(capacityWarnings(example, 200, 150)[0].text).toContain('Venue minimum is 180')
    expect(capacityWarnings(example, 250, 200)[0].tone).toBe('error')
    expect(capacityWarnings(example, 200, 200)).toEqual([])
  })
})

describe('marginal cost', () => {
  it('follows staggered billing around the tiers', () => {
    // 219 guests already pay for 220 places at $139 (cheaper than 219 × $157), so guest 220 only adds a gift.
    expect(marginalNet(example, 219)).toBe(-110)
    expect(crossesTier(example, 219)).toBe(false)
    // 194 × 157 = 30,458 < 30,580, but 195 pays up to 220: the billed price steps from 157 to 139.
    expect(crossesTier(example, 194)).toBe(true)
    expect(marginalNet(example, 190)).toBe(157 - 110)
  })
  it('words savings, costs and spare billed places', () => {
    expect(marginalText(example, 219)).toContain('saves $110 net')
    expect(marginalText(example, 219)).toContain('billed for 220 places, so up to 1 more guest add')
    expect(marginalText(example, 230)).toContain('costs $29 net')
  })
})

describe('optimiser', () => {
  it('finds the cheapest net headcount and goal cost', () => {
    const s = optimiserSummary(example, optimiserRange(example, []))
    expect(s.best?.headcount).toBe(220)
    expect(s.goalPoint?.net).toBe(6380)
    expect(s.text).toContain('Your goal of 220 costs $6,380 net.')
  })
  it('starts at 0 and widens to include current counts', () => {
    const curve = optimiserRange(example, [150, 260])
    expect(curve[0].headcount).toBe(0)
    expect(curve[curve.length - 1].headcount).toBe(260)
  })
})

describe('pointAt with venue fees', () => {
  it('matches the shared optimiser curve, including flat fee and service charge', () => {
    const s = { ...DEFAULT_SETTINGS, pricePerHead: { adult: 82, child: 70, staff: 90 }, tiers: [], flatFee: 9000, serviceCharge: 0.1, averageGift: 105 }
    expect(pointAt(s, 150).net).toBeCloseTo((9000 + 150 * 82) * 1.1 - 150 * 105)
    expect(marginalNet(s, 128)).toBeCloseTo(82 * 1.1 - 105)
  })
})

describe('layoutBandLabels', () => {
  it('merges markers with the same value into one label', () => {
    const labels = layoutBandLabels(
      [{ key: 'min', label: 'Min', value: 220 }, { key: 'goal', label: 'Goal', value: 220 }, { key: 'max', label: 'Max', value: 240 }],
      250,
    )
    expect(labels.map((l) => l.text)).toEqual(['Min & goal 220', 'Max 240'])
    expect(labels[0].keys).toEqual(['min', 'goal'])
  })

  it('puts labels that would collide on separate lanes and reuses lanes once clear', () => {
    const labels = layoutBandLabels(
      [{ key: 'a', label: 'A', value: 100 }, { key: 'b', label: 'B', value: 105 }, { key: 'c', label: 'C', value: 200 }],
      250,
    )
    expect(labels.map((l) => l.lane)).toEqual([0, 1, 0])
  })
})
