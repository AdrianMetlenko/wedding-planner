import { Alert, Button, Card, Select } from '../../components/ui'
import type { BalanceAttribute } from '../../lib/types'
import { fieldDefs, type Mapping, missingRequired } from './mapping'
import type { ParsedCsv } from './parse'

interface Props {
  fileName: string
  data: ParsedCsv
  attributes: BalanceAttribute[]
  mapping: Mapping
  onChange: (m: Mapping) => void
  onBack: () => void
  onNext: () => void
}

export function MapPanel({ fileName, data, attributes, mapping, onChange, onBack, onNext }: Props) {
  const defs = fieldDefs(attributes)
  const missing = missingRequired(mapping)
  const sample = (col: number | null | undefined) =>
    col == null ? '' : data.rows.slice(0, 3).map((r) => r[col]).filter(Boolean).join(', ')

  return (
    <div className="space-y-4">
      <Card title="3. Match your columns">
        <p className="mb-3 text-sm text-stone-600">
          {fileName}: {data.rows.length} rows, {data.headers.length} columns. We matched what we could by name;
          check each one. First name and last name are required.
        </p>
        <div className="divide-y divide-stone-100">
          {defs.map((f) => {
            const col = mapping[f.key]
            const id = `map-${f.key}`
            return (
              <div key={f.key} className="grid items-center gap-2 py-2 sm:grid-cols-[12rem_16rem_1fr]">
                <label htmlFor={id} className="text-sm font-medium text-stone-800">
                  {f.label}{f.required && <span className="text-red-600" aria-label="required"> *</span>}
                </label>
                <Select
                  id={id}
                  value={col == null ? '' : String(col)}
                  onChange={(e) => onChange({ ...mapping, [f.key]: e.target.value === '' ? null : Number(e.target.value) })}
                >
                  <option value="">— not imported —</option>
                  {data.headers.map((h, i) => <option key={i} value={i}>{h}</option>)}
                </Select>
                <span className="truncate text-xs text-stone-500">{sample(col)}</span>
              </div>
            )
          })}
        </div>
        {missing.length > 0 && (
          <div className="mt-3">
            <Alert tone="warn">Choose a column for: {missing.map((f) => f.label).join(', ')}.</Alert>
          </div>
        )}
      </Card>
      <div className="flex justify-between">
        <Button onClick={onBack}>Back</Button>
        <Button variant="primary" disabled={missing.length > 0} onClick={onNext}>Next: review</Button>
      </div>
    </div>
  )
}
