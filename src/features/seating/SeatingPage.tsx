import {
  DndContext, DragOverlay, KeyboardSensor, PointerSensor, closestCenter, pointerWithin, useSensor, useSensors,
  type CollisionDetection, type DragEndEvent, type DragStartEvent,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useShallow } from 'zustand/react/shallow'
import { Alert, Button, Card, EmptyState, PageHeader, Select, StatTile } from '../../components/ui'
import { seatingSummary } from '../../lib/calc'
import { PALETTE, paletteColor } from '../../lib/defaults'
import type { Guest, Table } from '../../lib/types'
import { useStore } from '../../store/store'
import { MixBar, MixLegend, OverlayChip, type ColoredSegment } from './parts'
import {
  mixSegments, moveGuest, moveTable, seatedAt, sortTables, unseatTable, unseatWhere,
} from './seating'
import { TableCard } from './TableCard'
import { TableSetup } from './TableSetup'
import { POOL_ID, UnassignedPool } from './UnassignedPool'

const UNSET_COLOR = '#d6d3d1'

/** Prefer the droppable under the pointer; guests (sortable slots) win over the table body. */
const collision: CollisionDetection = (args) => {
  const hits = pointerWithin(args)
  if (hits.length) {
    const guestHits = hits.filter((h) => !String(h.id).startsWith('table:') && h.id !== POOL_ID)
    return guestHits.length ? guestHits : hits
  }
  return closestCenter(args)
}

export default function SeatingPage() {
  const { guests, tables, categories, tags, households, attributes, defaultCapacity } = useStore(
    useShallow((s) => ({
      guests: s.guests, tables: s.tables, categories: s.categories, tags: s.tags, households: s.households,
      attributes: s.balanceAttributes, defaultCapacity: s.settings.defaultTableCapacity,
    })),
  )
  const setCollection = useStore((s) => s.setCollection)
  const patch = useStore((s) => s.patch)
  const removeTable = useStore((s) => s.remove)

  const [balanceBy, setBalanceBy] = useState('category')
  const [activeId, setActiveId] = useState<string | undefined>()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const sortedTables = useMemo(() => sortTables(tables), [tables])
  const tableIds = useMemo(() => new Set(tables.map((t) => t.id)), [tables])
  const attending = useMemo(() => guests.filter((g) => g.rsvp === 'yes'), [guests])
  const pool = useMemo(() => attending.filter((g) => !g.tableId || !tableIds.has(g.tableId)), [attending, tableIds])
  const summary = seatingSummary(tables, guests)
  const stale = useMemo(() => guests.filter((g) => g.rsvp !== 'yes' && g.tableId), [guests])
  const enabledAttrs = useMemo(() => attributes.filter((a) => a.enabled), [attributes])
  const attr = enabledAttrs.find((a) => a.id === balanceBy)
  const mixLabel = attr ? attr.name : 'category'
  const catColor = useMemo(() => new Map(categories.map((c) => [c.id, c.color])), [categories])

  const segmentsFor = (list: Guest[]): ColoredSegment[] => {
    if (attr) {
      const labels = attr.values.map((v) => ({ key: v, label: v }))
      const colors = new Map(attr.values.map((v, i) => [v, paletteColor(i)]))
      return mixSegments(list, (g) => g.attributes[attr.id] ?? '', labels).map((s) => ({ ...s, color: colors.get(s.key) ?? UNSET_COLOR }))
    }
    const labels = categories.map((c) => ({ key: c.id, label: c.name }))
    return mixSegments(list, (g) => g.categoryId, labels).map((s) => ({ ...s, color: catColor.get(s.key) ?? UNSET_COLOR }))
  }
  const overall = segmentsFor(attending)

  const addTables = (added: Table[]) => setCollection('tables', [...tables, ...added])
  const commit = (next: Guest[]) => setCollection('guests', next)
  const moveTo = (guestId: string, tableId: string | undefined, index?: number) =>
    commit(moveGuest(guests, guestId, tableId, index))

  const onDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id))
  const onDragEnd = (e: DragEndEvent) => {
    setActiveId(undefined)
    const { active, over } = e
    if (!over) return
    const id = String(active.id)
    const overId = String(over.id)
    if (overId === POOL_ID) return moveTo(id, undefined)
    if (overId.startsWith('table:')) return moveTo(id, overId.slice('table:'.length))
    if (overId === id) return
    const target = guests.find((g) => g.id === overId)
    if (!target?.tableId) return
    moveTo(id, target.tableId, seatedAt(guests, target.tableId).findIndex((g) => g.id === overId))
  }

  const activeGuest = activeId ? guests.find((g) => g.id === activeId) : undefined

  const header = <PageHeader title="Seating" description="Drag guests from the pool onto tables, or use the Move to table menu on each guest." />

  if (attending.length === 0 && tables.length === 0 && stale.length === 0) {
    return (
      <>
        {header}
        <div className="space-y-4">
          <EmptyState
            title="No attending guests yet"
            action={<Link to="/rsvp" className="text-sm font-medium text-brand-700 underline">Record RSVPs</Link>}
          >
            Only guests who replied yes can be seated. You can set up tables in the meantime.
          </EmptyState>
          <TableSetup tables={tables} defaultCapacity={defaultCapacity} onAdd={addTables} prominent />
        </div>
      </>
    )
  }

  return (
    <>
      {header}
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <StatTile label="Seats" value={summary.seats} />
          <StatTile label="Attending" value={summary.attending} tone={summary.attending > summary.seats ? 'bad' : 'default'} />
          <StatTile label="Seated" value={summary.seated} />
          <StatTile label="Unseated" value={summary.unseated} tone={summary.unseated ? 'warn' : 'good'} />
          <StatTile
            label={summary.spare < 0 ? 'Short by' : 'Spare seats'}
            value={Math.abs(summary.spare)}
            tone={summary.spare < 0 ? 'bad' : 'default'}
          />
        </div>

        {attending.length > summary.seats && (
          <Alert tone="warn">
            {attending.length} guests are attending but there are only {summary.seats} seats. Add {attending.length - summary.seats} more.
          </Alert>
        )}

        {stale.length > 0 && (
          <Alert tone="info">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span>{stale.length} guest{stale.length === 1 ? '' : 's'} who are not attending still hold a seat.</span>
              <Button size="sm" onClick={() => commit(unseatWhere(guests, (g) => g.rsvp !== 'yes'))}>Unseat them</Button>
            </div>
          </Alert>
        )}

        {tables.length === 0 && <TableSetup tables={tables} defaultCapacity={defaultCapacity} onAdd={addTables} prominent />}

        <Card title="Balance">
          <div className="flex flex-wrap items-center gap-3">
            {enabledAttrs.length > 0 && (
              <label className="flex items-center gap-2 text-sm">
                <span className="font-medium text-stone-700">Balance by</span>
                <Select className="w-auto" value={attr ? balanceBy : 'category'} onChange={(e) => setBalanceBy(e.target.value)}>
                  <option value="category">Category</option>
                  {enabledAttrs.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </Select>
              </label>
            )}
            <div className="min-w-48 flex-1">
              <div className="mb-1 text-xs text-stone-500">All attending guests ({attending.length})</div>
              <MixBar segments={overall} label={`Overall ${mixLabel} mix`} />
            </div>
          </div>
          <div className="mt-2"><MixLegend segments={overall} /></div>
        </Card>

        <DndContext
          sensors={sensors}
          collisionDetection={collision}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          onDragCancel={() => setActiveId(undefined)}
        >
          <div className="grid items-start gap-4 lg:grid-cols-[18rem_1fr]">
            <UnassignedPool
              pool={pool}
              guests={guests}
              tables={tables}
              categories={categories}
              tags={tags}
              households={households}
              onMoveGuest={(id, tid) => moveTo(id, tid)}
            />
            <div className="space-y-4">
              {tables.length > 0 && (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {sortedTables.map((t, i) => (
                    <TableCard
                      key={t.id}
                      table={t}
                      tables={tables}
                      guests={guests}
                      seated={seatedAt(guests, t.id)}
                      categories={categories}
                      segments={segmentsFor(seatedAt(guests, t.id))}
                      mixLabel={mixLabel}
                      isFirst={i === 0}
                      isLast={i === sortedTables.length - 1}
                      onMoveGuest={(id, tid) => moveTo(id, tid)}
                      onEdit={(p) => patch('tables', t.id, p)}
                      onDelete={() => {
                        commit(unseatTable(guests, t.id))
                        removeTable('tables', t.id)
                      }}
                      onShift={(d) => setCollection('tables', moveTable(tables, t.id, d))}
                    />
                  ))}
                </div>
              )}
              {tables.length > 0 && (
                <TableSetup tables={tables} defaultCapacity={defaultCapacity} onAdd={addTables} />
              )}
            </div>
          </div>
          <DragOverlay>
            {activeGuest && <OverlayChip guest={activeGuest} color={catColor.get(activeGuest.categoryId) ?? PALETTE[0]} />}
          </DragOverlay>
        </DndContext>
      </div>
    </>
  )
}
