import { useDraggable } from '@dnd-kit/core'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { ReactNode } from 'react'
import { cx } from '../../components/ui'
import { guestName } from '../../lib/format'
import type { Guest, Table, TableShape } from '../../lib/types'
import { householdElsewhere, sortTables, type MixSegment } from './seating'

const UNSEAT = '__unseat'

export interface ColoredSegment extends MixSegment {
  color: string
}

export function MixBar({ segments, label }: { segments: ColoredSegment[]; label: string }) {
  const total = segments.reduce((s, x) => s + x.count, 0)
  if (!total) return <div className="h-2.5 rounded-full bg-stone-100" role="img" aria-label={`${label}: empty`} />
  const text = segments.map((s) => `${s.label} ${s.count}`).join(', ')
  return (
    <div className="flex h-2.5 overflow-hidden rounded-full bg-stone-100" role="img" aria-label={`${label}: ${text}`} title={text}>
      {segments.map((s) => (
        <div key={s.key} style={{ width: `${(s.count / total) * 100}%`, backgroundColor: s.color }} />
      ))}
    </div>
  )
}

export function MixLegend({ segments }: { segments: ColoredSegment[] }) {
  return (
    <ul className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-stone-600">
      {segments.map((s) => (
        <li key={s.key} className="inline-flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} />
          {s.label} <span className="tabular-nums text-stone-400">{s.count}</span>
        </li>
      ))}
    </ul>
  )
}

export function ShapeIcon({ shape, className }: { shape: TableShape; className?: string }) {
  const form = shape === 'long' ? 'h-4 w-9 rounded-sm' : shape === 'round' ? 'h-7 w-7 rounded-full' : 'h-7 w-8 rounded-[40%]'
  return (
    <span aria-hidden className={cx('inline-flex h-8 w-10 shrink-0 items-center justify-center', className)}>
      <span className={cx('border-2 border-brand-600 bg-brand-50', form)} />
    </span>
  )
}

interface ChipProps {
  guest: Guest
  guests: Guest[]
  tables: Table[]
  categoryColor: string
  categoryName: string
  seat?: number
  /** True when sitting in a table (shows a seat number, moves to the pool via the select). */
  onMove: (tableId: string | undefined) => void
}

function ChipView({
  guest, guests, tables, categoryColor, categoryName, seat, onMove, handle, dragging, rootRef, style,
}: ChipProps & {
  handle: Record<string, unknown>
  dragging?: boolean
  rootRef?: (el: HTMLElement | null) => void
  style?: React.CSSProperties
}): ReactNode {
  const elsewhere = householdElsewhere(guest, guests, tables)
  const name = guestName(guest)
  const tip = elsewhere.length ? `Household also at ${elsewhere.join(', ')}` : 'No other household members seated'
  return (
    <li
      ref={rootRef}
      style={style}
      className={cx(
        'flex items-center gap-1.5 rounded-md border border-stone-200 bg-white px-1.5 py-1 text-sm',
        dragging && 'opacity-40',
      )}
      title={`${name} (${categoryName}). ${tip}`}
    >
      <button
        type="button"
        className="flex min-w-0 flex-1 cursor-grab touch-none items-center gap-1.5 rounded text-left focus-visible:outline-2 focus-visible:outline-brand-500"
        aria-label={`Drag ${name}`}
        {...handle}
      >
        {seat !== undefined && <span className="w-4 shrink-0 text-right text-xs tabular-nums text-stone-400">{seat}</span>}
        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: categoryColor }} aria-hidden />
        <span className="truncate">{name}</span>
        {guest.type === 'child' && <span className="shrink-0 rounded bg-sky-100 px-1 text-[10px] font-medium text-sky-800">child</span>}
        {guest.type === 'staff' && <span className="shrink-0 rounded bg-stone-100 px-1 text-[10px] font-medium text-stone-600">staff</span>}
        {elsewhere.length > 0 && (
          <span className="hidden truncate text-xs text-stone-400 sm:inline">also: {elsewhere.join(', ')}</span>
        )}
      </button>
      <select
        aria-label={`Move ${name} to table`}
        className="w-24 shrink-0 rounded border border-stone-200 bg-white px-1 py-0.5 text-xs text-stone-600"
        value={guest.tableId ?? ''}
        onChange={(e) => onMove(e.target.value && e.target.value !== UNSEAT ? e.target.value : undefined)}
      >
        {guest.tableId ? <option value={UNSEAT}>Unseat</option> : <option value="">Move to table…</option>}
        {sortTables(tables).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
      </select>
    </li>
  )
}

/** Guest in a table: sortable within and across tables. */
export function SeatedChip(props: ChipProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: props.guest.id,
  })
  return (
    <ChipView
      {...props}
      handle={{ ...attributes, ...listeners }}
      dragging={isDragging}
      rootRef={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    />
  )
}

/** Guest in the unassigned pool: draggable only. */
export function PoolChip(props: ChipProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: props.guest.id })
  return <ChipView {...props} handle={{ ...attributes, ...listeners }} dragging={isDragging} rootRef={setNodeRef} />
}

/** Static chip rendered inside the drag overlay. */
export function OverlayChip({ guest, color }: { guest: Guest; color: string }) {
  return (
    <div className="flex items-center gap-1.5 rounded-md border border-brand-500 bg-white px-2 py-1 text-sm shadow-lg">
      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
      {guestName(guest)}
    </div>
  )
}
