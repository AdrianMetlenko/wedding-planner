import { useDroppable } from '@dnd-kit/core'
import { useMemo, useState } from 'react'
import { Card, Input, Select, cx } from '../../components/ui'
import { guestName } from '../../lib/format'
import type { Category, Guest, Household, Table, Tag } from '../../lib/types'
import { PoolChip } from './parts'
import { groupByHousehold } from './seating'

export const POOL_ID = 'pool'

export function UnassignedPool({ pool, guests, tables, categories, tags, households, onMoveGuest }: {
  pool: Guest[]
  guests: Guest[]
  tables: Table[]
  categories: Category[]
  tags: Tag[]
  households: Household[]
  onMoveGuest: (guestId: string, tableId: string | undefined) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: POOL_ID })
  const [query, setQuery] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [tagId, setTagId] = useState('')
  const catById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return pool.filter((g) =>
      (!q || guestName(g).toLowerCase().includes(q))
      && (!categoryId || g.categoryId === categoryId)
      && (!tagId || g.tagIds.includes(tagId)))
  }, [pool, query, categoryId, tagId])
  const groups = useMemo(() => groupByHousehold(filtered, households), [filtered, households])

  return (
    <Card title={`Unassigned (${pool.length})`} className={cx('lg:sticky lg:top-4', isOver && 'ring-2 ring-brand-200')}>
      <div className="mb-3 grid gap-2">
        <Input type="search" aria-label="Search unassigned guests" placeholder="Search guests…" value={query} onChange={(e) => setQuery(e.target.value)} />
        <div className="grid grid-cols-2 gap-2">
          <Select aria-label="Filter by category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">All categories</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
          <Select aria-label="Filter by tag" value={tagId} onChange={(e) => setTagId(e.target.value)}>
            <option value="">All tags</option>
            {tags.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </Select>
        </div>
      </div>
      <div ref={setNodeRef} className="max-h-[60vh] min-h-24 overflow-y-auto" aria-label="Unassigned guests drop area">
        {pool.length === 0 ? (
          <p className="py-6 text-center text-sm text-emerald-700">Everyone attending has a seat.</p>
        ) : filtered.length === 0 ? (
          <p className="py-6 text-center text-sm text-stone-500">No guests match the filter.</p>
        ) : (
          <div className="space-y-3">
            {groups.map((grp) => (
              <div key={grp.household?.id ?? 'none'}>
                <h4 className="mb-1 text-xs font-medium uppercase tracking-wide text-stone-500">
                  {grp.household?.name ?? 'No household'}
                </h4>
                <ul className="flex flex-col gap-1">
                  {grp.guests.map((g) => (
                    <PoolChip
                      key={g.id}
                      guest={g}
                      guests={guests}
                      tables={tables}
                      categoryColor={catById.get(g.categoryId)?.color ?? '#a8a29e'}
                      categoryName={catById.get(g.categoryId)?.name ?? 'No category'}
                      onMove={(tid) => onMoveGuest(g.id, tid)}
                    />
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  )
}
