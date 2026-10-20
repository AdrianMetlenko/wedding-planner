// Editor for lists of { id, name, color }: used for both guest categories and guest groups (tags).
import { useState } from 'react'
import { Alert, Button, Input, Select } from '../../components/ui'
import { PALETTE, paletteColor } from '../../lib/defaults'
import { newId } from '../../lib/id'
import type { Errors } from './validation'

export interface NamedItem { id: string; name: string; color: string }

interface Props {
  items: NamedItem[]
  /** Singular noun, e.g. "category" or "group". */
  noun: string
  idPrefix: string
  /** Guests using each item. */
  usage: Record<string, number>
  /** Fewest items allowed; the last ones cannot be deleted. */
  minItems: number
  /** When true, a used item can only be deleted after moving its guests to another item. */
  reassignOnDelete: boolean
  errors: Errors
  onChange: (items: NamedItem[]) => void
  /** Remove an item; `reassignTo` is set when its guests move to another item. */
  onRemove: (id: string, reassignTo?: string) => void
}

export function NamedListEditor({
  items, noun, idPrefix, usage, minItems, reassignOnDelete, errors, onChange, onRemove,
}: Props) {
  const [colorOpen, setColorOpen] = useState<string>()
  const [pending, setPending] = useState<string>()
  const [target, setTarget] = useState('')

  const patch = (id: string, p: Partial<NamedItem>) =>
    onChange(items.map((x) => (x.id === id ? { ...x, ...p } : x)))

  const add = () => {
    onChange([...items, { id: newId(idPrefix), name: '', color: paletteColor(items.length) }])
  }

  const askDelete = (id: string) => {
    if (!usage[id]) {
      onRemove(id)
      return
    }
    setPending(id)
    setTarget(items.find((x) => x.id !== id)?.id ?? '')
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-stone-500">
        Click a name to rename it, or the colour dot to recolour it. Changes save as you type and apply to every guest.
      </p>
      {errors.list && <Alert tone="error">{errors.list}</Alert>}
      <ul className="space-y-2">
        {items.map((it) => {
          const used = usage[it.id] ?? 0
          const locked = items.length <= minItems
          const others = items.filter((x) => x.id !== it.id)
          return (
            <li key={it.id} className="rounded-md border border-stone-200 bg-white p-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label={`Change colour of ${it.name || `new ${noun}`}`}
                  aria-expanded={colorOpen === it.id}
                  onClick={() => setColorOpen(colorOpen === it.id ? undefined : it.id)}
                  className="h-7 w-7 shrink-0 rounded-full border border-stone-300"
                  style={{ backgroundColor: it.color }}
                />
                <Input
                  aria-label={`${noun} name`}
                  aria-invalid={!!errors[`name-${it.id}`]}
                  value={it.name}
                  placeholder={`${noun[0].toUpperCase()}${noun.slice(1)} name`}
                  onChange={(e) => patch(it.id, { name: e.target.value })}
                />
                <span className="hidden shrink-0 text-xs text-stone-500 sm:inline">
                  {used} guest{used === 1 ? '' : 's'}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={locked}
                  title={locked ? `Keep at least ${minItems} ${noun}` : undefined}
                  aria-label={`Delete ${it.name || `new ${noun}`}`}
                  onClick={() => askDelete(it.id)}
                >
                  Delete
                </Button>
              </div>
              {errors[`name-${it.id}`] && (
                <p className="mt-1 text-xs text-red-600">{errors[`name-${it.id}`]}</p>
              )}
              {colorOpen === it.id && (
                <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label="Choose a colour">
                  {PALETTE.map((c) => (
                    <button
                      key={c}
                      type="button"
                      aria-label={`Colour ${c}`}
                      aria-pressed={it.color === c}
                      onClick={() => { patch(it.id, { color: c }); setColorOpen(undefined) }}
                      className={`h-6 w-6 rounded-full border-2 ${it.color === c ? 'border-stone-900' : 'border-transparent'}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              )}
              {pending === it.id && (
                <div className="mt-2">
                  {reassignOnDelete && others.length === 0 ? (
                    <Alert tone="warn">
                      {used} guest{used === 1 ? ' uses' : 's use'} this {noun} and there is no other {noun} to move them to.
                    </Alert>
                  ) : (
                    <Alert tone="warn">
                      <p>
                        {used} guest{used === 1 ? ' uses' : 's use'} &ldquo;{it.name}&rdquo;.{' '}
                        {reassignOnDelete ? `Move them to another ${noun} to delete it.` : `Deleting it removes it from ${used === 1 ? 'that guest' : 'those guests'}.`}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        {reassignOnDelete && (
                          <Select
                            aria-label={`Move guests to`}
                            className="max-w-56"
                            value={target}
                            onChange={(e) => setTarget(e.target.value)}
                          >
                            {others.map((o) => <option key={o.id} value={o.id}>{o.name || `(unnamed ${noun})`}</option>)}
                          </Select>
                        )}
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => { onRemove(it.id, reassignOnDelete ? target : undefined); setPending(undefined) }}
                        >
                          {reassignOnDelete ? 'Move guests and delete' : 'Delete'}
                        </Button>
                        <Button size="sm" onClick={() => setPending(undefined)}>Cancel</Button>
                      </div>
                    </Alert>
                  )}
                  {reassignOnDelete && others.length === 0 && (
                    <div className="mt-2"><Button size="sm" onClick={() => setPending(undefined)}>OK</Button></div>
                  )}
                </div>
              )}
            </li>
          )
        })}
      </ul>
      <Button onClick={add}>Add {noun}</Button>
    </div>
  )
}
