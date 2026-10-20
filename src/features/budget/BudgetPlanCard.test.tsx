import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createDemoState } from '../../lib/demo'
import { useStore } from '../../store/store'
import { BudgetPlanCard } from './BudgetPlanCard'

const total = () => useStore.getState().budgetPlan.lines.filter((l) => l.mode === 'percent').reduce((s, l) => s + l.percent, 0)

describe('BudgetPlanCard', () => {
  beforeEach(() => useStore.getState().reset())
  afterEach(cleanup)

  it('asks for an overall budget first, and persists synced lines', () => {
    render(<BudgetPlanCard />)
    expect(screen.getByText('Set an overall budget')).toBeInTheDocument()
    expect(useStore.getState().budgetPlan.lines.length).toBe(useStore.getState().expenseCategories.length)
    fireEvent.change(screen.getByLabelText(/Overall budget/), { target: { value: '50000' } })
    expect(useStore.getState().budgetPlan.total).toBe(50000)
    expect(screen.getByText('Left to allocate')).toBeInTheDocument()
  })

  it('keeps shares at 100% when a slider moves and when a category is turned off', () => {
    useStore.getState().replaceState(createDemoState())
    render(<BudgetPlanCard />)
    fireEvent.change(screen.getByLabelText('Share of remainder for Photo & video'), { target: { value: '30' } })
    expect(total()).toBeCloseTo(100, 1)
    expect(useStore.getState().budgetPlan.lines.find((l) => l.categoryId === 'exp-3')!.percent).toBe(30)
    const group = screen.getByRole('radiogroup', { name: 'Mode for Flowers' })
    fireEvent.click(group.querySelector('[role=radio]:last-child')!)
    expect(useStore.getState().budgetPlan.lines.find((l) => l.categoryId === 'exp-6')!.mode).toBe('off')
    expect(total()).toBeCloseTo(100, 1)
    expect(screen.getByTestId('share-total')).toHaveTextContent('100%')
  })
})
