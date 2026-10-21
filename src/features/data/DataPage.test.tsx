import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ConfirmProvider } from '../../components/ConfirmDialog'
import { createDemoState } from '../../lib/demo'
import { useStore } from '../../store/store'
import DataPage from './DataPage'

const renderPage = () => render(
  <ConfirmProvider>
    <MemoryRouter initialEntries={['/data']}>
      <Routes>
        <Route path="/data" element={<DataPage />} />
        <Route path="/setup" element={<p>Setup screen</p>} />
      </Routes>
    </MemoryRouter>
  </ConfirmProvider>,
)

describe('DataPage reset', () => {
  beforeEach(() => useStore.getState().replaceState(createDemoState()))
  afterEach(() => { cleanup(); vi.restoreAllMocks() })

  it('resets through the in-app dialog, never the browser confirm()', async () => {
    // iOS can suppress window.confirm (it returns false); the app must not depend on it.
    const browserConfirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: 'Reset everything' }))

    const dialog = await screen.findByRole('alertdialog', { name: 'Delete all planner data?' })
    expect(useStore.getState().guests.length).toBeGreaterThan(0)
    fireEvent.click(screen.getAllByRole('button', { name: 'Reset everything' }).find((b) => dialog.contains(b))!)

    expect(await screen.findByText('Setup screen')).toBeInTheDocument()
    expect(useStore.getState().guests).toHaveLength(0)
    expect(useStore.getState().setup.done).toBe(false)
    expect(browserConfirm).not.toHaveBeenCalled()
  })

  it('cancelling keeps the data', async () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: 'Reset everything' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(useStore.getState().guests.length).toBeGreaterThan(0)
  })
})
