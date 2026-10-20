// Guest import: Template → Upload → Map columns → Review → Done.
// Rendered as the last setup-wizard step and from the Guests page.
import { useState } from 'react'
import { Alert, Button, Card, cx } from '../../components/ui'
import { useStore } from '../../store/store'
import { autoMap, type Mapping } from './mapping'
import { MapPanel } from './MapPanel'
import type { ParsedCsv } from './parse'
import { ReviewPanel, type ImportSummary } from './ReviewPanel'
import { TemplatePanel } from './TemplatePanel'
import { UploadPanel } from './UploadPanel'

export interface ImportStepProps {
  /** Called after guests have been imported (or the user chose to skip). */
  onDone: () => void
}

type Step = 'template' | 'upload' | 'map' | 'review' | 'done'
const STEPS: { key: Step; label: string }[] = [
  { key: 'template', label: 'Template' },
  { key: 'upload', label: 'Upload' },
  { key: 'map', label: 'Map columns' },
  { key: 'review', label: 'Review' },
  { key: 'done', label: 'Done' },
]

function Stepper({ current }: { current: Step }) {
  const at = STEPS.findIndex((s) => s.key === current)
  return (
    <ol className="flex flex-wrap gap-2 text-sm" aria-label="Import progress">
      {STEPS.map((s, i) => (
        <li
          key={s.key}
          aria-current={i === at ? 'step' : undefined}
          className={cx(
            'flex items-center gap-1.5 rounded-full border px-3 py-1',
            i === at ? 'border-brand-600 bg-brand-600 text-white'
              : i < at ? 'border-brand-200 bg-brand-50 text-brand-700' : 'border-stone-200 text-stone-500',
          )}
        >
          <span className="font-semibold tabular-nums">{i + 1}</span>
          {s.label}
        </li>
      ))}
    </ol>
  )
}

export function ImportStep({ onDone }: ImportStepProps) {
  const categories = useStore((s) => s.categories)
  const tags = useStore((s) => s.tags)
  const attributes = useStore((s) => s.balanceAttributes)

  const [step, setStep] = useState<Step>('template')
  const [fileName, setFileName] = useState('')
  const [data, setData] = useState<ParsedCsv>()
  const [mapping, setMapping] = useState<Mapping>({})
  const [summary, setSummary] = useState<ImportSummary>()

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Stepper current={step} />
        {step !== 'done' && (
          <button type="button" className="text-sm text-stone-600 underline hover:text-stone-900" onClick={onDone}>
            Skip for now / add guests manually later
          </button>
        )}
      </div>

      {step === 'template' && (
        <TemplatePanel categories={categories} tags={tags} attributes={attributes} onNext={() => setStep('upload')} />
      )}
      {step === 'upload' && (
        <UploadPanel
          onBack={() => setStep('template')}
          onParsed={(name, parsed) => {
            setFileName(name)
            setData(parsed)
            setMapping(autoMap(parsed.headers, attributes))
            setStep('map')
          }}
        />
      )}
      {step === 'map' && data && (
        <MapPanel
          fileName={fileName}
          data={data}
          attributes={attributes}
          mapping={mapping}
          onChange={setMapping}
          onBack={() => setStep('upload')}
          onNext={() => setStep('review')}
        />
      )}
      {step === 'review' && data && (
        <ReviewPanel
          data={data}
          mapping={mapping}
          onBack={() => setStep('map')}
          onImported={(s) => { setSummary(s); setStep('done') }}
        />
      )}
      {step === 'done' && summary && (
        <Card title="Import complete">
          <Alert tone="success">
            {summary.mode === 'replace'
              ? `${summary.added} guests imported.`
              : `${summary.added} added, ${summary.updated} updated, ${summary.unchanged} unchanged.`}
            {summary.newCategories > 0 && ` ${summary.newCategories} categories created.`}
            {summary.newTags > 0 && ` ${summary.newTags} groups created.`}
            {summary.excluded > 0 && ` ${summary.excluded} rows were left out.`}
          </Alert>
          <div className="mt-4 flex justify-end">
            <Button variant="primary" onClick={onDone}>Continue</Button>
          </div>
        </Card>
      )}
    </div>
  )
}
