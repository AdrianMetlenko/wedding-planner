import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useShallow } from 'zustand/react/shallow'
import { Alert, Button, Card, PageHeader } from '../../components/ui'
import { createDemoState } from '../../lib/demo'
import { useStore } from '../../store/store'
import { downloadBackup, loadBackup } from './backup'

export default function DataPage() {
  const navigate = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string }>()
  const counts = useStore(useShallow((s) => ({ guests: s.guests.length, tables: s.tables.length, gifts: s.gifts.length, expenses: s.expenses.length })))
  const setupDone = useStore((s) => s.setup.done)

  const onFile = async (file: File | undefined) => {
    if (!file) return
    if (!confirm('Loading a backup replaces everything currently in the planner. Continue?')) return
    const error = await loadBackup(file)
    setMessage(error ? { tone: 'error', text: error } : { tone: 'success', text: `Loaded ${file.name}.` })
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <>
      <PageHeader title="Settings & data" description="Everything is stored in this browser only. Nothing is sent online (to any server)." />
      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Backup">
          <p className="mb-3 text-sm text-stone-600">
            Download a JSON file with all your planner data. Load it later to restore, or to continue on another device.
          </p>
          <p className="mb-4 text-xs text-stone-500">
            Currently: {counts.guests} guests · {counts.tables} tables · {counts.gifts} gifts · {counts.expenses} expenses
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" onClick={downloadBackup}>Download backup</Button>
            <Button onClick={() => fileRef.current?.click()}>Load backup…</Button>
            <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => onFile(e.target.files?.[0])} />
          </div>
          {message && <div className="mt-3"><Alert tone={message.tone}>{message.text}</Alert></div>}
        </Card>

        <Card title="Setup">
          <p className="mb-4 text-sm text-stone-600">
            Revisit the setup steps to change capacity, pricing, categories, groups, balance attributes or modules. Your guests are kept.
          </p>
          <Button onClick={() => navigate('/setup')}>{setupDone ? 'Edit setup' : 'Continue setup'}</Button>
        </Card>

        <Card title="Try the demo">
          <p className="mb-4 text-sm text-stone-600">Fill the planner with a made-up wedding to explore every screen.</p>
          <Button
            onClick={() => {
              if (!confirm('This replaces your current data with demo data. Download a backup first if you want to keep it. Continue?')) return
              useStore.getState().replaceState(createDemoState())
              navigate('/dashboard')
            }}
          >
            Load demo wedding
          </Button>
        </Card>

        <Card title="Start over">
          <p className="mb-4 text-sm text-stone-600">Delete all planner data from this browser.</p>
          <Button
            variant="danger"
            onClick={() => {
              if (!confirm('Delete all planner data from this browser? This cannot be undone unless you have a backup.')) return
              useStore.getState().reset()
              navigate('/setup')
            }}
          >
            Reset everything
          </Button>
        </Card>
      </div>
    </>
  )
}
