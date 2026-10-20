import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { useStore } from '../../store/store'
import SetupPage from './SetupPage'

const renderPage = () => render(<MemoryRouter><SetupPage /></MemoryRouter>)

describe('SetupPage', () => {
  beforeEach(() => useStore.getState().reset())
  afterEach(cleanup)

  it('walks from welcome through basics with validation gating', () => {
    renderPage()
    fireEvent.click(screen.getByText('Start setup'))
    const next = screen.getByRole('button', { name: 'Next' })
    expect(next).toBeDisabled()
    fireEvent.change(screen.getByLabelText(/^First partner's name/), { target: { value: 'Sam' } })
    fireEvent.change(screen.getByLabelText(/^Second partner's name/), { target: { value: 'Alex' } })
    fireEvent.change(screen.getByLabelText(/^Wedding date/), { target: { value: '2027-06-12' } })
    expect(next).toBeEnabled()
    fireEvent.click(next)
    expect(useStore.getState().setup.completedStep).toBe(1)
    expect(screen.getByText(/At your maximum of 150 guests/)).toBeInTheDocument()
  })

  it('blocks forward jumps past the first incomplete step', () => {
    renderPage()
    fireEvent.click(screen.getByText('Start setup'))
    expect(screen.getByRole('button', { name: /^3\. Categories/ })).toBeDisabled()
  })
})
