import { useMemo, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { Alert, Badge, Button, Card, Checkbox, Select, StatTile } from '../../components/ui'
import { useStore } from '../../store/store'
import { cleanRows, unknownCategories, unknownTags } from './clean'
import type { Mapping } from './mapping'
import {
  buildPlan, duplicateWarnings, type ImportMode, type NameChoice, type RowAction,
} from './merge'
import type { ParsedCsv } from './parse'

export interface ImportSummary {
  mode: ImportMode
  added: number
  updated: number
  unchanged: number
  newCategories: number
  newTags: number
  excluded: number
}

interface Props {
  data: ParsedCsv
  mapping: Mapping
  onBack: () => void
  onImported: (s: ImportSummary) => void
}

const ACTION_LABEL: Record<RowAction, string> = { new: 'New', updated: 'Updated', unchanged: 'Unchanged' }

export function ReviewPanel({ data, mapping, onBack, onImported }: Props) {
  const guests = useStore((s) => s.guests)
  const households = useStore((s) => s.households)
  const categories = useStore((s) => s.categories)
  const tags = useStore((s) => s.tags)
  const attributes = useStore((s) => s.balanceAttributes)
  const store = useStore(useShallow((s) => ({ setCollection: s.setCollection, upsert: s.upsert })))

  const hasExisting = guests.length > 0
  const [mode, setMode] = useState<ImportMode>(hasExisting ? 'merge' : 'replace')
  const [confirmReplace, setConfirmReplace] = useState(false)
  const [defaultCategoryId, setDefaultCategoryId] = useState(categories[0]?.id ?? '')
  const [categoryChoices, setCategoryChoices] = useState<Record<string, NameChoice>>({})
  const [tagChoices, setTagChoices] = useState<Record<string, NameChoice>>({})
  const [override, setOverride] = useState<Record<number, boolean>>({})

  const rows = useMemo(() => cleanRows(data.rows, mapping, attributes), [data, mapping, attributes])
  const existing = useMemo(() => ({ guests, households, categories, tags }), [guests, households, categories, tags])
  const dupes = useMemo(() => duplicateWarnings(rows, existing, mode), [rows, existing, mode])

  const isIncluded = (r: { index: number; errors: string[] }) => override[r.index] ?? r.errors.length === 0
  const included = rows.filter(isIncluded)
  const blocking = included.filter((r) => r.errors.length > 0)

  const unkCats = useMemo(() => unknownCategories(included, categories), [included, categories])
  const unkTags = useMemo(() => unknownTags(included, tags), [included, tags])
  const needsDefaultCat = included.some((r) => !r.categoryName)

  const plan = useMemo(
    () => buildPlan(included, existing, { mode, defaultCategoryId, categoryChoices, tagChoices }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, override, existing, mode, defaultCategoryId, categoryChoices, tagChoices],
  )

  const excluded = rows.length - included.length
  const replaceBlocked = mode === 'replace' && hasExisting && !confirmReplace
  const canImport = included.length > 0 && blocking.length === 0 && !replaceBlocked
    && (!needsDefaultCat || !!defaultCategoryId)

  function confirm() {
    for (const c of plan.newCategories) store.upsert('categories', c)
    for (const t of plan.newTags) store.upsert('tags', t)
    store.setCollection('guests', plan.guests)
    store.setCollection('households', plan.households)
    onImported({
      mode, ...plan.counts, newCategories: plan.newCategories.length, newTags: plan.newTags.length, excluded,
    })
  }

  const choiceSelect = (
    name: string, key: string, choices: Record<string, NameChoice>,
    set: (c: Record<string, NameChoice>) => void, options: { id: string; name: string }[], allowSkip: boolean,
  ) => {
    const c = choices[key] ?? { kind: 'create' }
    const value = c.kind === 'map' ? `map:${c.id}` : c.kind
    return (
      <Select
        aria-label={`What to do with "${name}"`}
        value={value}
        onChange={(e) => {
          const v = e.target.value
          set({ ...choices, [key]: v.startsWith('map:') ? { kind: 'map', id: v.slice(4) } : { kind: v as 'create' | 'skip' } })
        }}
      >
        <option value="create">Create new</option>
        {allowSkip && <option value="skip">Leave out</option>}
        {options.map((o) => <option key={o.id} value={`map:${o.id}`}>Map to existing: {o.name}</option>)}
      </Select>
    )
  }

  return (
    <div className="space-y-4">
      <Card title="4. Review">
        <div className="grid gap-3 sm:grid-cols-4">
          <StatTile label="Rows in file" value={rows.length} />
          <StatTile label="Will import" value={included.length} />
          <StatTile label="With errors" value={rows.filter((r) => r.errors.length).length}
            tone={blocking.length ? 'bad' : 'default'} />
          <StatTile label="With warnings" value={rows.filter((r) => r.warnings.length || dupes[r.index]).length} tone="warn" />
        </div>
        {blocking.length > 0 && (
          <div className="mt-3">
            <Alert tone="error">
              {blocking.length} included row{blocking.length === 1 ? ' has' : 's have'} errors. Untick them to leave
              them out; fix the CSV and upload again to include them.
            </Alert>
          </div>
        )}
      </Card>

      {hasExisting && (
        <Card title="You already have guests">
          <fieldset className="space-y-2 text-sm">
            <legend className="sr-only">Import mode</legend>
            <label className="flex items-start gap-2">
              <input type="radio" name="import-mode" className="mt-1 accent-brand-600" checked={mode === 'merge'}
                onChange={() => setMode('merge')} />
              <span><b>Merge</b>: match existing guests by name within the same household and update the fields
                that are filled in; add the rest.</span>
            </label>
            <label className="flex items-start gap-2">
              <input type="radio" name="import-mode" className="mt-1 accent-brand-600" checked={mode === 'replace'}
                onChange={() => setMode('replace')} />
              <span><b>Replace all guests</b>: delete the {guests.length} current guests and use this file instead.</span>
            </label>
          </fieldset>
          {mode === 'replace' && (
            <div className="mt-3 space-y-2">
              <Alert tone="warn">
                Seating assignments and gift links for the current guests will be lost, because the imported guests
                are new.
              </Alert>
              <Checkbox label="I understand, replace everything" checked={confirmReplace} onChange={setConfirmReplace} />
            </div>
          )}
        </Card>
      )}

      {(needsDefaultCat || unkCats.length > 0 || unkTags.length > 0) && (
        <Card title="Categories and groups">
          <div className="space-y-4 text-sm">
            {needsDefaultCat && (
              <label className="flex flex-wrap items-center gap-2">
                <span className="font-medium">Category for rows with none:</span>
                <Select className="max-w-xs" value={defaultCategoryId} onChange={(e) => setDefaultCategoryId(e.target.value)}>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
              </label>
            )}
            {unkCats.length > 0 && (
              <div>
                <h3 className="mb-1 font-medium">Categories not in your list</h3>
                <ul className="space-y-1">
                  {unkCats.map((u) => (
                    <li key={u.key} className="grid items-center gap-2 sm:grid-cols-[1fr_18rem]">
                      <span>{u.name} <span className="text-stone-500">({u.count} guest{u.count === 1 ? '' : 's'})</span></span>
                      {choiceSelect(u.name, u.key, categoryChoices, setCategoryChoices, categories, false)}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {unkTags.length > 0 && (
              <div>
                <h3 className="mb-1 font-medium">Groups not in your list</h3>
                <ul className="space-y-1">
                  {unkTags.map((u) => (
                    <li key={u.key} className="grid items-center gap-2 sm:grid-cols-[1fr_18rem]">
                      <span>{u.name} <span className="text-stone-500">({u.count} guest{u.count === 1 ? '' : 's'})</span></span>
                      {choiceSelect(u.name, u.key, tagChoices, setTagChoices, tags, true)}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Card>
      )}

      <Card title={mode === 'merge' && hasExisting ? 'Changes' : 'Preview'}>
        <p className="mb-3 text-sm text-stone-700" aria-live="polite">
          {mode === 'merge' && hasExisting
            ? `${plan.counts.added} new, ${plan.counts.updated} updated, ${plan.counts.unchanged} unchanged.`
            : `${plan.counts.added} guests in ${plan.households.length} households will be imported.`}
          {plan.newCategories.length > 0 && ` ${plan.newCategories.length} new categories.`}
          {plan.newTags.length > 0 && ` ${plan.newTags.length} new groups.`}
        </p>
        <div className="max-h-[28rem] overflow-auto rounded-md border border-stone-200">
          <table className="min-w-full text-left text-sm">
            <thead className="sticky top-0 bg-stone-50 text-xs text-stone-500">
              <tr>
                <th className="px-2 py-1.5 font-medium">Include</th>
                <th className="px-2 py-1.5 font-medium">#</th>
                <th className="px-2 py-1.5 font-medium">Name</th>
                <th className="px-2 py-1.5 font-medium">Household</th>
                <th className="px-2 py-1.5 font-medium">Category</th>
                <th className="px-2 py-1.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const inc = isIncluded(r)
                const notes = [...r.warnings, ...(dupes[r.index] ?? [])]
                const action = plan.actions[r.index]
                return (
                  <tr key={r.index} className={`border-t border-stone-100 align-top ${inc ? '' : 'text-stone-400'}`}>
                    <td className="px-2 py-1.5">
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-brand-600"
                        aria-label={`Include row ${r.index}`}
                        checked={inc}
                        onChange={(e) => setOverride({ ...override, [r.index]: e.target.checked })}
                      />
                    </td>
                    <td className="px-2 py-1.5 tabular-nums">{r.index}</td>
                    <td className="px-2 py-1.5">{[r.title, r.firstName, r.lastName].filter(Boolean).join(' ') || '(blank)'}</td>
                    <td className="px-2 py-1.5">{r.household || <span className="text-stone-400">own</span>}</td>
                    <td className="px-2 py-1.5">{r.categoryName || <span className="text-stone-400">default</span>}</td>
                    <td className="px-2 py-1.5">
                      <div className="flex flex-wrap items-center gap-1">
                        {r.errors.length > 0 && <Badge color="#dc2626">Error</Badge>}
                        {r.errors.length === 0 && notes.length > 0 && <Badge color="#d97706">Warning</Badge>}
                        {r.errors.length === 0 && notes.length === 0 && inc && action && hasExisting && mode === 'merge' && (
                          <Badge color="#059669">{ACTION_LABEL[action]}</Badge>
                        )}
                        {r.errors.length === 0 && notes.length === 0 && !(inc && action && hasExisting && mode === 'merge') && (
                          <Badge color="#059669">OK</Badge>
                        )}
                      </div>
                      {[...r.errors, ...notes].length > 0 && (
                        <ul className="mt-1 list-disc pl-4 text-xs text-stone-600">
                          {r.errors.map((m) => <li key={m} className="text-red-700">{m}</li>)}
                          {notes.map((m) => <li key={m}>{m}</li>)}
                        </ul>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="flex justify-between">
        <Button onClick={onBack}>Back</Button>
        <Button variant="primary" disabled={!canImport} onClick={confirm}>
          {mode === 'replace' && hasExisting ? 'Replace guests' : `Import ${included.length} guest${included.length === 1 ? '' : 's'}`}
        </Button>
      </div>
    </div>
  )
}
