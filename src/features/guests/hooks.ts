import { useStore } from '../../store/store'
import type { Guest, Rsvp } from '../../lib/types'
import { emptiedHouseholds } from './logic'

/** Set RSVP for several guests; declining also clears table and seat. */
export function useSetRsvp() {
  const patchMany = useStore((s) => s.patchMany)
  return (ids: string[], rsvp: Rsvp) => {
    if (ids.length === 0) return
    patchMany('guests', ids, rsvp === 'no' ? { rsvp, tableId: undefined, seat: undefined } : { rsvp })
  }
}

/** Delete guests, also removing households left with no members. */
export function useDeleteGuests() {
  return (ids: string[]) => {
    const { guests, setCollection, households } = useStore.getState()
    const del = new Set(ids)
    const emptied = new Set(emptiedHouseholds(guests, del))
    setCollection('guests', guests.filter((g: Guest) => !del.has(g.id)))
    if (emptied.size) setCollection('households', households.filter((h) => !emptied.has(h.id)))
  }
}
