import { useState } from 'react'
import { Button, Card, Input } from '../../components/ui'
import type { Venue } from '../../lib/types'
import {
  addInclusionRow, deleteInclusionRow, moveInclusionRow, renameInclusionRow, setInclusion,
} from './venueActions'
import { nextInclusion, packageLabel, venueLabel } from './venueGrid'

const SYMBOL: Record<string, string> = { yes: '✓', no: '✗' }

/** Row name that commits on blur or Enter; blank or duplicate names revert. */
function RowName({ name }: { name: string }) {
  const [draft, setDraft] = useState(name)
  const [prev, setPrev] = useState(name)
  if (prev !== name) { setPrev(name); setDraft(name) }
  const commit = () => { if (!renameInclusionRow(name, draft)) setDraft(name) }
  return (
    <Input aria-label={`Rename row ${name}`} className="min-w-36" value={draft}
      onChange={(e) => setDraft(e.target.value)} onBlur={commit}
      onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }} />
  )
}

function Cell({ venueId, packageId, row, value, label }: {
  venueId: string; packageId: string; row: string; value: string | undefined; label: string
}) {
  const isNote = !!value && value !== 'yes' && value !== 'no'
  const state = !value ? 'blank' : isNote ? `note: ${value}` : value
  return (
    <div className="flex items-center gap-1">
      <button type="button"
        aria-label={`${row}, ${label}: ${state}. Activate to change.`}
        className={`h-8 w-8 shrink-0 rounded-md border text-base font-semibold ${
          value === 'yes' ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
            : value === 'no' ? 'border-stone-300 bg-stone-100 text-stone-500'
              : isNote ? 'border-sky-300 bg-sky-50 text-sky-700' : 'border-dashed border-stone-300 text-stone-300'}`}
        onClick={() => setInclusion(venueId, packageId, row, nextInclusion(value))}>
        {value ? (SYMBOL[value] ?? 'i') : '·'}
      </button>
      <Input aria-label={`Note for ${row}, ${label}`} className="w-24 px-2 py-1 text-xs" placeholder="note"
        value={isNote ? value : ''}
        onChange={(e) => setInclusion(venueId, packageId, row, e.target.value || undefined)} />
    </div>
  )
}

export function InclusionsMatrix({ venues, rows }: { venues: Venue[]; rows: string[] }) {
  const [newRow, setNewRow] = useState('')
  const columns = venues.filter((v) => v.packages.length > 0)
  const add = () => { if (addInclusionRow(newRow)) setNewRow('') }

  return (
    <Card title="What's included">
      <p className="mb-3 text-sm text-stone-600">
        Click a cell to cycle yes, no and blank, or type a short note such as &ldquo;Courtyard&rdquo;.
        Deleting a row removes it from every package.
      </p>
      {columns.length === 0 ? (
        <p className="text-sm text-stone-500">Add a venue with a package to start comparing.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th rowSpan={2} scope="col" className="sticky left-0 bg-white p-2 text-left align-bottom font-medium text-stone-700">Included</th>
                {columns.map((v) => (
                  <th key={v.id} scope="colgroup" colSpan={v.packages.length}
                    className="border-l border-stone-200 p-2 text-left font-semibold text-stone-900">{venueLabel(v)}</th>
                ))}
              </tr>
              <tr>
                {columns.flatMap((v) => v.packages.map((p, i) => (
                  <th key={p.id} scope="col"
                    className={`p-2 text-left font-medium text-stone-700 ${i === 0 ? 'border-l border-stone-200' : ''}`}>
                    {packageLabel(p)}
                  </th>
                )))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={row} className="border-t border-stone-100">
                  <th scope="row" className="sticky left-0 bg-white p-2 text-left">
                    <div className="flex items-center gap-1">
                      <RowName name={row} />
                      <Button size="sm" variant="ghost" aria-label={`Move ${row} up`} disabled={i === 0}
                        onClick={() => moveInclusionRow(i, -1)}>&uarr;</Button>
                      <Button size="sm" variant="ghost" aria-label={`Move ${row} down`} disabled={i === rows.length - 1}
                        onClick={() => moveInclusionRow(i, 1)}>&darr;</Button>
                      <Button size="sm" variant="ghost" aria-label={`Delete row ${row}`}
                        onClick={() => deleteInclusionRow(row)}>Delete</Button>
                    </div>
                  </th>
                  {columns.flatMap((v) => v.packages.map((p, j) => (
                    <td key={p.id} className={`p-2 ${j === 0 ? 'border-l border-stone-200' : ''}`}>
                      <Cell venueId={v.id} packageId={p.id} row={row} value={p.inclusions[row]}
                        label={`${venueLabel(v)} ${packageLabel(p)}`} />
                    </td>
                  )))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <form className="mt-3 flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); add() }}>
        <Input aria-label="New row name" className="max-w-xs" placeholder="New row, e.g. Photo booth" value={newRow}
          onChange={(e) => setNewRow(e.target.value)} />
        <Button type="submit" disabled={!newRow.trim()}>Add row</Button>
      </form>
    </Card>
  )
}
