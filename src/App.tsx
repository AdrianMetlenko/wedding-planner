import type { ReactNode } from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import BudgetPage from './features/budget/BudgetPage'
import DataPage from './features/data/DataPage'
import DashboardPage from './features/dashboard/DashboardPage'
import GiftsPage from './features/gifts/GiftsPage'
import GuestsPage from './features/guests/GuestsPage'
import LiquorPage from './features/liquor/LiquorPage'
import RsvpPage from './features/rsvp/RsvpPage'
import SeatingPage from './features/seating/SeatingPage'
import SetupPage from './features/setup/SetupPage'
import VenuesPage from './features/venues/VenuesPage'
import { useStore } from './store/store'

/** Until setup is finished, planner screens send the user back to the wizard. */
function RequireSetup({ children }: { children: ReactNode }) {
  const done = useStore((s) => s.setup.done)
  return done ? children : <Navigate to="/setup" replace />
}

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/setup" element={<SetupPage />} />
        <Route element={<Layout />}>
          <Route path="/data" element={<DataPage />} />
          <Route path="/dashboard" element={<RequireSetup><DashboardPage /></RequireSetup>} />
          <Route path="/guests" element={<RequireSetup><GuestsPage /></RequireSetup>} />
          <Route path="/rsvp" element={<RequireSetup><RsvpPage /></RequireSetup>} />
          <Route path="/seating" element={<RequireSetup><SeatingPage /></RequireSetup>} />
          <Route path="/gifts" element={<RequireSetup><GiftsPage /></RequireSetup>} />
          <Route path="/budget" element={<RequireSetup><BudgetPage /></RequireSetup>} />
          <Route path="/liquor" element={<RequireSetup><LiquorPage /></RequireSetup>} />
          <Route path="/venues" element={<RequireSetup><VenuesPage /></RequireSetup>} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </HashRouter>
  )
}
