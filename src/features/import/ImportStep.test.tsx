import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createInitialState } from '../../lib/defaults'
import { useStore } from '../../store/store'
import { ImportStep } from './ImportStep'

describe('ImportStep', () => {
  beforeEach(() => useStore.getState().replaceState(createInitialState()))

  it('imports an uploaded CSV end to end and calls onDone', async () => {
    const onDone = vi.fn()
    const { container } = render(<ImportStep onDone={onDone} />)
    fireEvent.click(screen.getByText('Next: upload'))
    const csv = 'First name,Surname,Side,Tags\nAda,Example,Cousins,Choir\nBo,Example,Work,\n,Broken,,\n'
    const file = new File([csv], 'g.csv', { type: 'text/csv' })
    fireEvent.change(container.querySelector('input[type=file]')!, { target: { files: [file] } })
    await waitFor(() => screen.getByText('Next: review'))
    fireEvent.click(screen.getByText('Next: review'))
    fireEvent.click(await screen.findByText('Import 2 guests'))
    await screen.findByText('Import complete')
    const s = useStore.getState()
    expect(s.guests.map((g) => g.firstName)).toEqual(['Ada', 'Bo'])
    expect(s.categories.some((c) => c.name === 'Cousins')).toBe(true)
    expect(s.households.length).toBe(2)
    fireEvent.click(screen.getByText('Continue'))
    expect(onDone).toHaveBeenCalledOnce()
  })

  it('skip calls onDone', () => {
    const onDone = vi.fn()
    render(<ImportStep onDone={onDone} />)
    fireEvent.click(screen.getByText(/Skip for now/))
    expect(onDone).toHaveBeenCalledOnce()
  })
})
