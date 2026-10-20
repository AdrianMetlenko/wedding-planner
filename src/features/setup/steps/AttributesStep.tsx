import { useState } from 'react'
import { Button, Checkbox, Input } from '../../../components/ui'
import { DEFAULT_BALANCE_ATTRIBUTES } from '../../../lib/defaults'
import { newId } from '../../../lib/id'
import { useStore } from '../../../store/store'
import { validateAttributes } from '../validation'

const BUILT_IN = new Set(DEFAULT_BALANCE_ATTRIBUTES.map((a) => a.id))

/** Chip editor: Enter or comma adds a value; pasted comma-separated lists are split. */
function ChipInput({ label, values, onChange }: { label: string; values: string[]; onChange: (v: string[]) => void }) {
  const [draft, setDraft] = useState('')

  const commit = (text: string) => {
    const parts = text.split(',').map((p) => p.trim()).filter(Boolean)
    if (parts.length) onChange([...values, ...parts])
    setDraft('')
  }

  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-1.5">
        {values.map((v, i) => (
          <span key={`${v}-${i}`} className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2.5 py-0.5 text-sm">
            {v}
            <button type="button" aria-label={`Remove value ${v}`} className="text-stone-500 hover:text-red-600"
              onClick={() => onChange(values.filter((_, j) => j !== i))}>&times;</button>
          </span>
        ))}
      </div>
      <Input
        aria-label={label}
        value={draft}
        placeholder="Type a value, press Enter or comma"
        onChange={(e) => (e.target.value.includes(',') ? commit(e.target.value) : setDraft(e.target.value))}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commit(draft) } }}
        onBlur={() => commit(draft)}
      />
    </div>
  )
}

export function AttributesStep() {
  const attrs = useStore((s) => s.balanceAttributes)
  const patch = useStore((s) => s.patch)
  const errors = validateAttributes(attrs)

  const add = () =>
    useStore.getState().upsert('balanceAttributes', { id: newId('attr'), name: '', values: [], enabled: true })

  const remove = (id: string) => {
    const s = useStore.getState()
    s.setCollection('guests', s.guests.map((g) => {
      if (!(id in g.attributes)) return g
      const { [id]: _drop, ...rest } = g.attributes
      return { ...g, attributes: rest }
    }))
    s.remove('balanceAttributes', id)
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-stone-600">
        Balance attributes are optional. They are only used on the seating screen, to see whether each table has a good mix
        (for example of sexes or age groups). Leave them all off if you do not need that. Each enabled attribute needs at
        least two values.
      </p>
      <ul className="space-y-3">
        {attrs.map((a) => (
          <li key={a.id} className="rounded-md border border-stone-200 bg-white p-3">
            <div className="flex flex-wrap items-center gap-3">
              <Checkbox label="Use" checked={a.enabled} onChange={(v) => patch('balanceAttributes', a.id, { enabled: v })} />
              <Input aria-label="Attribute name" className="max-w-56" value={a.name} placeholder="Attribute name"
                onChange={(e) => patch('balanceAttributes', a.id, { name: e.target.value })} />
              {!BUILT_IN.has(a.id) && (
                <Button size="sm" variant="ghost" aria-label={`Delete ${a.name || 'new attribute'}`} onClick={() => remove(a.id)}>
                  Delete
                </Button>
              )}
            </div>
            {errors[`name-${a.id}`] && <p className="mt-1 text-xs text-red-600">{errors[`name-${a.id}`]}</p>}
            <div className="mt-3">
              <ChipInput label={`Values for ${a.name || 'new attribute'}`} values={a.values}
                onChange={(values) => patch('balanceAttributes', a.id, { values })} />
              {errors[`values-${a.id}`] && <p className="mt-1 text-xs text-red-600">{errors[`values-${a.id}`]}</p>}
            </div>
          </li>
        ))}
      </ul>
      <Button onClick={add}>Add custom attribute</Button>
    </div>
  )
}
