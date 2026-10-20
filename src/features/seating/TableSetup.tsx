import { useState } from 'react'
import { Button, Card, Field, NumberInput, Select } from '../../components/ui'
import type { Table, TableShape } from '../../lib/types'
import { SHAPES, buildTables } from './seating'

export function TableSetup({ tables, defaultCapacity, onAdd, prominent }: {
  tables: Table[]
  defaultCapacity: number
  onAdd: (added: Table[]) => void
  prominent?: boolean
}) {
  const [count, setCount] = useState<number | undefined>(prominent ? 10 : 1)
  const [capacity, setCapacity] = useState<number | undefined>(undefined)
  const [shape, setShape] = useState<TableShape>('round')
  const cap = capacity ?? defaultCapacity
  const valid = (count ?? 0) >= 1 && cap >= 1

  return (
    <Card title="Add tables" className={prominent ? 'border-brand-500' : undefined}>
      <form
        className="grid grid-cols-2 items-end gap-3 sm:grid-cols-4"
        onSubmit={(e) => {
          e.preventDefault()
          if (valid) onAdd(buildTables(tables, Math.min(count!, 100), cap, shape))
        }}
      >
        <Field label="Tables">
          <NumberInput min={1} max={100} value={count} onValueChange={setCount} />
        </Field>
        <Field label="Seats each" hint={`Default ${defaultCapacity}`}>
          <NumberInput min={1} value={capacity ?? defaultCapacity} onValueChange={setCapacity} />
        </Field>
        <Field label="Shape">
          <Select value={shape} onChange={(e) => setShape(e.target.value as TableShape)}>
            {SHAPES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </Select>
        </Field>
        <Button type="submit" variant="primary" disabled={!valid}>
          Add {count ?? 0} × {cap} seats
        </Button>
      </form>
    </Card>
  )
}
