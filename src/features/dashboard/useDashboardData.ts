import { useMemo } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { countByType, countedHeadcount, guestsFor, venueCost } from '../../lib/calc'
import type { CountBasis } from '../../lib/calc'
import type { Guest } from '../../lib/types'
import { useStore } from '../../store/store'

export interface RsvpTally { coming: number; declined: number; pending: number }

export function rsvpTally(guests: Guest[]): RsvpTally {
  const t = { coming: 0, declined: 0, pending: 0 }
  for (const g of guests) {
    if (g.rsvp === 'yes') t.coming++
    else if (g.rsvp === 'no') t.declined++
    else t.pending++
  }
  return t
}

/** One pass over the store: everything the dashboard sections need, derived from stable slices. */
export function useDashboardData() {
  const s = useStore(useShallow((st) => ({
    settings: st.settings,
    guests: st.guests,
    categories: st.categories,
    gifts: st.gifts,
    expenses: st.expenses,
  })))

  return useMemo(() => {
    const { settings, guests } = s
    const bases: CountBasis[] = ['planned', 'attending']
    const [planned, attending] = bases.map((basis) => {
      const list = guestsFor(guests, basis)
      const counts = countByType(list)
      return { basis, guests: list, counts, headcount: countedHeadcount(counts, settings), cost: venueCost(counts, settings) }
    })
    // Everyone flagged planned (the A-list), split by RSVP status.
    const plannedAll = guests.filter((g) => g.planned)
    return { ...s, planned, attending, plannedTally: rsvpTally(plannedAll), plannedAll }
  }, [s])
}

export type DashboardData = ReturnType<typeof useDashboardData>
export type BasisData = DashboardData['planned']
