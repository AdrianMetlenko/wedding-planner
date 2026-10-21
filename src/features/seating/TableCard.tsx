import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useState } from 'react'
import { useConfirm } from '../../components/ConfirmDialog'
import { Button, Field, Input, NumberInput, Select, cx } from '../../components/ui'
import type { Category, Guest, Table, TableShape } from '../../lib/types'
import { MixBar, SeatedChip, ShapeIcon, type ColoredSegment } from './parts'
import { SHAPES } from './seating'

const tableDropId = (id: string) => `table:${id}`

interface Props {
  table: Table
  tables: Table[]
  guests: Guest[]
  seated: Guest[]
  categories: Category[]
  segments: ColoredSegment[]
  mixLabel: string
  isFirst: boolean
  isLast: boolean
  onMoveGuest: (guestId: string, tableId: string | undefined) => void
  onEdit: (patch: Partial<Table>) => void
  onDelete: () => void
  onShift: (delta: -1 | 1) => void
}

export function TableCard({
  table, tables, guests, seated, categories, segments, mixLabel, isFirst, isLast,
  onMoveGuest, onEdit, onDelete, onShift,
}: Props) {
  const confirm = useConfirm()
  const { setNodeRef, isOver } = useDroppable({ id: tableDropId(table.id) })
  const [editing, setEditing] = useState(false)
  const over = seated.length > table.capacity
  const catById = new Map(categories.map((c) => [c.id, c]))

  return (
    <section
      ref={setNodeRef}
      aria-label={table.name}
      className={cx(
        'flex flex-col gap-3 rounded-lg border bg-white p-3 shadow-sm',
        isOver ? 'border-brand-500 ring-2 ring-brand-200' : over ? 'border-red-300' : 'border-stone-200',
      )}
    >
      <header className="flex items-start gap-2">
        <ShapeIcon shape={table.shape} />
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold text-stone-900">{table.name}</h3>
          {table.theme && <p className="truncate text-xs text-stone-500">{table.theme}</p>}
        </div>
        <span
          className={cx('shrink-0 text-sm font-semibold tabular-nums', over ? 'text-red-600' : 'text-stone-700')}
          title={over ? `Over capacity by ${seated.length - table.capacity}` : `${table.capacity - seated.length} seats free`}
        >
          {seated.length}/{table.capacity}
          {over && <span className="sr-only"> over capacity</span>}
        </span>
      </header>

      <MixBar segments={segments} label={`${table.name} ${mixLabel} mix`} />

      <SortableContext items={seated.map((g) => g.id)} strategy={verticalListSortingStrategy}>
        <ul className="flex min-h-12 flex-col gap-1">
          {seated.map((g) => (
            <SeatedChip
              key={g.id}
              guest={g}
              guests={guests}
              tables={tables}
              categoryColor={catById.get(g.categoryId)?.color ?? '#a8a29e'}
              categoryName={catById.get(g.categoryId)?.name ?? 'No category'}
              seat={g.seat}
              onMove={(tid) => onMoveGuest(g.id, tid)}
            />
          ))}
          {seated.length === 0 && (
            <li className="rounded-md border border-dashed border-stone-300 px-2 py-3 text-center text-xs text-stone-400">
              Drop guests here
            </li>
          )}
        </ul>
      </SortableContext>

      {editing ? (
        <EditForm
          table={table}
          onCancel={() => setEditing(false)}
          onSave={(p) => { onEdit(p); setEditing(false) }}
        />
      ) : (
        <footer className="mt-auto flex flex-wrap gap-1 border-t border-stone-100 pt-2">
          <Button size="sm" variant="ghost" onClick={() => setEditing(true)} aria-label={`Edit ${table.name}`}>Edit</Button>
          <Button size="sm" variant="ghost" disabled={isFirst} onClick={() => onShift(-1)} aria-label={`Move ${table.name} earlier`}>↑ Earlier</Button>
          <Button size="sm" variant="ghost" disabled={isLast} onClick={() => onShift(1)} aria-label={`Move ${table.name} later`}>↓ Later</Button>
          <Button
            size="sm"
            variant="ghost"
            className="ml-auto text-red-600"
            aria-label={`Delete ${table.name}`}
            onClick={async () => {
              if (seated.length === 0 || await confirm({
                title: `Delete ${table.name}?`,
                message: `Its ${seated.length} guest${seated.length === 1 ? '' : 's'} will become unassigned.`,
                confirmLabel: 'Delete table', tone: 'danger',
              })) onDelete()
            }}
          >
            Delete
          </Button>
        </footer>
      )}
    </section>
  )
}

function EditForm({ table, onSave, onCancel }: {
  table: Table
  onSave: (p: Partial<Table>) => void
  onCancel: () => void
}) {
  const [name, setName] = useState(table.name)
  const [theme, setTheme] = useState(table.theme ?? '')
  const [capacity, setCapacity] = useState<number | undefined>(table.capacity)
  const [shape, setShape] = useState<TableShape>(table.shape)
  const valid = name.trim() !== '' && (capacity ?? 0) >= 1
  return (
    <form
      className="grid grid-cols-2 gap-2 border-t border-stone-100 pt-2"
      onSubmit={(e) => {
        e.preventDefault()
        if (valid) onSave({ name: name.trim(), theme: theme.trim() || undefined, capacity: Math.floor(capacity!), shape })
      }}
    >
      <div className="col-span-2">
        <Field label="Name"><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
      </div>
      <div className="col-span-2">
        <Field label="Theme"><Input value={theme} placeholder="e.g. Parents" onChange={(e) => setTheme(e.target.value)} /></Field>
      </div>
      <Field label="Seats"><NumberInput min={1} value={capacity} onValueChange={setCapacity} /></Field>
      <Field label="Shape">
        <Select value={shape} onChange={(e) => setShape(e.target.value as TableShape)}>
          {SHAPES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </Select>
      </Field>
      <div className="col-span-2 flex justify-end gap-2">
        <Button size="sm" onClick={onCancel}>Cancel</Button>
        <Button size="sm" variant="primary" type="submit" disabled={!valid}>Save</Button>
      </div>
    </form>
  )
}
