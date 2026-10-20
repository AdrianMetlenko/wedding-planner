import { NavLink, Outlet } from 'react-router-dom'
import { useStore } from '../store/store'
import type { Modules } from '../lib/types'
import { Copyright } from './Copyright'
import { cx } from './ui'

interface NavItem {
  to: string
  label: string
  /** Shown only when this module is enabled. */
  module?: keyof Omit<Modules, 'honeymoon'>
}

const NAV: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/guests', label: 'Guests' },
  { to: '/rsvp', label: 'RSVP' },
  { to: '/seating', label: 'Seating' },
  { to: '/gifts', label: 'Gifts', module: 'gifts' },
  { to: '/budget', label: 'Budget', module: 'expenses' },
  { to: '/liquor', label: 'Drinks', module: 'liquor' },
  { to: '/venues', label: 'Venues', module: 'venues' },
  { to: '/data', label: 'Settings & data' },
]

export function Layout() {
  const modules = useStore((s) => s.settings.modules)
  const names = useStore((s) => s.settings.coupleNames)
  const items = NAV.filter((n) => !n.module || modules[n.module])
  const title = names.filter(Boolean).join(' & ')

  return (
    <div className="min-h-screen">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <div className="font-semibold text-brand-700">
            Wedding Planner{title && <span className="font-normal text-stone-500"> · {title}</span>}
          </div>
          <nav className="flex flex-wrap gap-1">
            {items.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                className={({ isActive }) => cx(
                  'rounded-md px-3 py-1.5 text-sm font-medium',
                  isActive ? 'bg-brand-50 text-brand-700' : 'text-stone-600 hover:bg-stone-100',
                )}
              >
                {n.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">
        <Outlet />
      </main>
      <footer className="mx-auto max-w-7xl px-4 pb-8 text-xs text-stone-500">
        Your data is saved only in this browser. Download a backup from Settings &amp; data to keep it safe or move it to another device.
        <Copyright />
      </footer>
    </div>
  )
}
