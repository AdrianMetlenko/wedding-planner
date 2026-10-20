// Store mutations for venues. They read the latest state at call time, so event handlers never act on stale data.
import { newId } from '../../lib/id'
import type { Venue, VenuePackage } from '../../lib/types'
import { useStore } from '../../store/store'
import { moveItem, removeInclusionKey, renameInclusionKey, withInclusion } from './venueGrid'

export const blankPackage = (name = ''): VenuePackage => ({
  id: newId('pkg'), name, flatFee: 0, pricePerHead: 0, tiers: [], discount: 0, gratuity: 0, tax: 0,
  drinks: 'included', extras: [], inclusions: {}, chosen: false,
})

export const blankVenue = (): Venue => ({ id: newId('ven'), name: '', packages: [blankPackage('Standard')] })

const venues = () => useStore.getState().venues

export function addVenue(): string {
  const venue = blankVenue()
  useStore.getState().upsert('venues', venue)
  return venue.id
}

export const updateVenue = (id: string, patch: Partial<Venue>) => useStore.getState().patch('venues', id, patch)

export const deleteVenue = (id: string) => useStore.getState().remove('venues', id)

export function updatePackage(venueId: string, packageId: string, patch: Partial<VenuePackage>) {
  const venue = venues().find((v) => v.id === venueId)
  if (!venue) return
  updateVenue(venueId, { packages: venue.packages.map((p) => (p.id === packageId ? { ...p, ...patch } : p)) })
}

export function addPackage(venueId: string): string | undefined {
  const venue = venues().find((v) => v.id === venueId)
  if (!venue) return undefined
  const pkg = blankPackage()
  updateVenue(venueId, { packages: [...venue.packages, pkg] })
  return pkg.id
}

/** Copy a package right after the original; the copy is never the chosen one. */
export function duplicatePackage(venueId: string, packageId: string): string | undefined {
  const venue = venues().find((v) => v.id === venueId)
  const index = venue?.packages.findIndex((p) => p.id === packageId) ?? -1
  if (!venue || index === -1) return undefined
  const source = venue.packages[index]
  const copy: VenuePackage = {
    ...structuredClone(source),
    id: newId('pkg'),
    name: `${source.name || 'Package'} (copy)`,
    extras: source.extras.map((e) => ({ ...e, id: newId('x') })),
    chosen: false,
  }
  updateVenue(venueId, { packages: [...venue.packages.slice(0, index + 1), copy, ...venue.packages.slice(index + 1)] })
  return copy.id
}

export function deletePackage(venueId: string, packageId: string) {
  const venue = venues().find((v) => v.id === venueId)
  if (venue) updateVenue(venueId, { packages: venue.packages.filter((p) => p.id !== packageId) })
}

// ---- "What's included" rows. venueInclusions is a plain string list, so it is written with setState. ----

const setInclusions = (rows: string[]) => useStore.setState({ venueInclusions: rows })

export function setInclusion(venueId: string, packageId: string, key: string, value: string | undefined) {
  const pkg = venues().find((v) => v.id === venueId)?.packages.find((p) => p.id === packageId)
  if (pkg) updatePackage(venueId, packageId, { inclusions: withInclusion(pkg.inclusions, key, value) })
}

export function addInclusionRow(name: string): boolean {
  const rows = useStore.getState().venueInclusions
  const text = name.trim()
  if (!text || rows.some((r) => r.toLowerCase() === text.toLowerCase())) return false
  setInclusions([...rows, text])
  return true
}

/** Returns false (and changes nothing) when the new name is blank or already used by another row. */
export function renameInclusionRow(from: string, to: string): boolean {
  const rows = useStore.getState().venueInclusions
  const text = to.trim()
  if (!text || rows.some((r) => r !== from && r.toLowerCase() === text.toLowerCase())) return false
  if (text === from) return true
  useStore.getState().setCollection('venues', renameInclusionKey(venues(), from, text))
  setInclusions(rows.map((r) => (r === from ? text : r)))
  return true
}

export function deleteInclusionRow(name: string) {
  useStore.getState().setCollection('venues', removeInclusionKey(venues(), name))
  setInclusions(useStore.getState().venueInclusions.filter((r) => r !== name))
}

export function moveInclusionRow(index: number, delta: -1 | 1) {
  setInclusions(moveItem(useStore.getState().venueInclusions, index, delta))
}
