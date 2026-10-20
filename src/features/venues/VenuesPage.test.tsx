import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createDemoState } from '../../lib/demo'
import { useStore } from '../../store/store'
import VenuesPage from './VenuesPage'

const renderPage = () => render(<MemoryRouter><VenuesPage /></MemoryRouter>)

describe('VenuesPage', () => {
  beforeEach(() => useStore.getState().reset())
  afterEach(cleanup)

  it('shows the off state, then the empty state', () => {
    renderPage()
    expect(screen.getByText('Venue scouting is turned off')).toBeInTheDocument()
    cleanup()
    useStore.getState().updateSettings({ modules: { venues: true } })
    renderPage()
    expect(screen.getByText('No venues yet')).toBeInTheDocument()
  })

  it('adds a venue with one package', () => {
    useStore.getState().updateSettings({ modules: { venues: true } })
    renderPage()
    fireEvent.click(screen.getAllByRole('button', { name: 'Add a venue' })[0])
    expect(useStore.getState().venues).toHaveLength(1)
    expect(useStore.getState().venues[0].packages).toHaveLength(1)
  })

  it('chooses one package, updating the planner only when the box is ticked', () => {
    useStore.getState().replaceState(createDemoState())
    const { venues } = useStore.getState()
    const target = venues[1].packages[0]
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: new RegExp(`^Choose package ${target.name}`) }))
    const panel = screen.getByRole('region', { name: 'Choose package confirmation' })
    fireEvent.click(within(panel).getByLabelText(/Also update my planner/))
    fireEvent.click(within(panel).getByRole('button', { name: 'Confirm' }))
    const after = useStore.getState()
    expect(after.venues.flatMap((v) => v.packages).filter((p) => p.chosen).map((p) => p.id)).toEqual([target.id])
    expect(after.settings.flatFee).toBe(createDemoState().settings.flatFee)
  })

  it('deleting an inclusion row removes its key from every package', () => {
    useStore.getState().replaceState(createDemoState())
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: 'Delete row Dessert' }))
    const s = useStore.getState()
    expect(s.venueInclusions).not.toContain('Dessert')
    expect(s.venues.every((v) => v.packages.every((p) => !('Dessert' in p.inclusions)))).toBe(true)
  })
})
