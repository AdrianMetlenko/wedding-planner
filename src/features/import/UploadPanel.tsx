import { useRef, useState } from 'react'
import { Alert, Button, Card, cx } from '../../components/ui'
import { type ParsedCsv, parseCsv } from './parse'

interface Props {
  onParsed: (fileName: string, data: ParsedCsv) => void
  onBack: () => void
}

export function UploadPanel({ onParsed, onBack }: Props) {
  const [error, setError] = useState<string>()
  const [dragging, setDragging] = useState(false)
  const input = useRef<HTMLInputElement>(null)

  async function handle(file: File | undefined) {
    if (!file) return
    setError(undefined)
    try {
      const { data, error: err } = parseCsv(await file.text())
      if (err || !data) setError(err ?? 'Could not read the file.')
      else onParsed(file.name, data)
    } catch {
      setError('Could not read the file.')
    }
  }

  return (
    <div className="space-y-4">
      <Card title="2. Upload your CSV">
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); void handle(e.dataTransfer.files[0]) }}
          className={cx(
            'flex flex-col items-center gap-2 rounded-lg border-2 border-dashed p-8 text-center',
            dragging ? 'border-brand-500 bg-brand-50' : 'border-stone-300',
          )}
        >
          <p className="text-sm text-stone-700">Drag a .csv file here, or</p>
          <Button variant="primary" onClick={() => input.current?.click()}>Choose file</Button>
          <input
            ref={input}
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            aria-label="CSV file"
            onChange={(e) => { void handle(e.target.files?.[0]); e.target.value = '' }}
          />
        </div>
        <div aria-live="polite" className="mt-3">
          {error && <Alert tone="error">{error}</Alert>}
        </div>
      </Card>
      <div><Button onClick={onBack}>Back</Button></div>
    </div>
  )
}
