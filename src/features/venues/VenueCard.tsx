import { useState } from 'react'
import { useConfirm } from '../../components/ConfirmDialog'
import { Badge, Button, Card, Field, Input } from '../../components/ui'
import { packageCostAt } from '../../lib/calc'
import { formatMoney } from '../../lib/format'
import type { Venue, VenueDrinks, VenuePackage } from '../../lib/types'
import { PackageEditor } from './PackageEditor'
import {
  addPackage, deletePackage, deleteVenue, duplicatePackage, updateVenue,
} from './venueActions'
import { packageLabel, venueLabel } from './venueGrid'

const DRINKS_TEXT: Record<VenueDrinks, string> = {
  included: 'Drinks included', 'bar-tab': 'Bar tab', byo: 'Bring your own drinks',
}

function packageSummary(p: VenuePackage) {
  const parts = [
    p.flatFee ? `${formatMoney(p.flatFee)} hire` : undefined,
    `${formatMoney(p.pricePerHead)} per adult`,
    p.minGuests || p.maxGuests ? `${p.minGuests ?? 0}–${p.maxGuests ?? 'any'} guests` : undefined,
    DRINKS_TEXT[p.drinks],
    p.extras.length ? `${p.extras.length} extra${p.extras.length === 1 ? '' : 's'}` : undefined,
    p.hours ? `${p.hours} h` : undefined,
  ]
  return parts.filter(Boolean).join(' · ')
}

export function VenueCard({ venue, headcount, startOpen, onChoose }: {
  venue: Venue; headcount: number; startOpen?: boolean; onChoose: (packageId: string) => void
}) {
  const confirm = useConfirm()
  const [editing, setEditing] = useState(!!startOpen)
  const [open, setOpen] = useState<string[]>(() => (startOpen ? venue.packages.map((p) => p.id) : []))
  const toggle = (id: string) => setOpen((o) => (o.includes(id) ? o.filter((x) => x !== id) : [...o, id]))
  const name = venueLabel(venue)

  return (
    <Card
      title={name}
      actions={(
        <>
          <Button size="sm" aria-expanded={editing} onClick={() => setEditing((e) => !e)}>
            {editing ? 'Done' : 'Edit venue'}
          </Button>
          <Button size="sm" variant="ghost" aria-label={`Delete venue ${name}`}
            onClick={async () => { if (await confirm({ title: `Delete ${name}?`, message: 'This also deletes all its packages.', confirmLabel: 'Delete venue', tone: 'danger' })) deleteVenue(venue.id) }}>
            Delete
          </Button>
        </>
      )}
    >
      {editing ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Venue name"><Input value={venue.name} onChange={(e) => updateVenue(venue.id, { name: e.target.value })} /></Field>
          <Field label="Location"><Input value={venue.location ?? ''} onChange={(e) => updateVenue(venue.id, { location: e.target.value || undefined })} /></Field>
          <Field label="Link"><Input type="url" placeholder="https://" value={venue.url ?? ''} onChange={(e) => updateVenue(venue.id, { url: e.target.value || undefined })} /></Field>
          <Field label="Notes">
            <textarea rows={2} value={venue.notes ?? ''} onChange={(e) => updateVenue(venue.id, { notes: e.target.value || undefined })}
              className="w-full rounded-md border border-stone-300 bg-white px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500" />
          </Field>
        </div>
      ) : (
        <div className="space-y-1 text-sm text-stone-600">
          {venue.location && <p>{venue.location}</p>}
          {venue.url && (
            <p><a href={venue.url} target="_blank" rel="noreferrer noopener" className="text-brand-700 underline">Venue website</a></p>
          )}
          {venue.notes && <p>{venue.notes}</p>}
        </div>
      )}

      <ul className="mt-4 space-y-3">
        {venue.packages.map((p) => {
          const label = packageLabel(p)
          const isOpen = open.includes(p.id)
          const cost = packageCostAt(p, headcount)
          return (
            <li key={p.id} className="rounded-md border border-stone-200 p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="flex flex-wrap items-center gap-2 font-medium text-stone-900">
                    {label}
                    {p.chosen && <Badge color="#15803d">Chosen</Badge>}
                  </h3>
                  <p className="text-sm text-stone-600">{packageSummary(p)}</p>
                  <p className="mt-1 text-sm tabular-nums text-stone-700">
                    {cost.overCapacity
                      ? <span className="text-stone-500">Over capacity at {headcount} guests (max {p.maxGuests}).</span>
                      : <>At {headcount} guests: <strong>{formatMoney(cost.total)}</strong> ({formatMoney(cost.perHead)} per guest)</>}
                  </p>
                  {p.notes && !isOpen && <p className="mt-1 text-sm text-stone-500">{p.notes}</p>}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" aria-expanded={isOpen} aria-label={`${isOpen ? 'Close' : 'Edit'} package ${label}`}
                    onClick={() => toggle(p.id)}>{isOpen ? 'Done' : 'Edit'}</Button>
                  <Button size="sm" aria-label={`Duplicate package ${label}`}
                    onClick={() => { const id = duplicatePackage(venue.id, p.id); if (id) setOpen((o) => [...o, id]) }}>
                    Duplicate
                  </Button>
                  <Button size="sm" variant="ghost" aria-label={`Delete package ${label}`}
                    onClick={async () => { if (await confirm({ title: `Delete package ${label}?`, confirmLabel: 'Delete package', tone: 'danger' })) deletePackage(venue.id, p.id) }}>
                    Delete
                  </Button>
                  <Button size="sm" variant={p.chosen ? 'secondary' : 'primary'} disabled={p.chosen}
                    aria-label={`Choose package ${label}`} onClick={() => onChoose(p.id)}>
                    {p.chosen ? 'Chosen' : 'Choose this package'}
                  </Button>
                </div>
              </div>
              {isOpen && <div className="mt-4 border-t border-stone-100 pt-4"><PackageEditor venueId={venue.id} pkg={p} /></div>}
            </li>
          )
        })}
      </ul>
      <div className="mt-3">
        <Button size="sm" onClick={() => { const id = addPackage(venue.id); if (id) setOpen((o) => [...o, id]) }}>
          Add a package
        </Button>
      </div>
    </Card>
  )
}
