import { useRef, useState } from 'react'
import { Alert, Button, Card } from '../../../components/ui'
import { createDemoState } from '../../../lib/demo'
import { useStore } from '../../../store/store'
import { loadBackup } from '../../data/backup'

export function WelcomeStep({ onStart, onLoaded, onDemo }: {
  onStart: () => void
  /** Called after a backup loaded successfully. */
  onLoaded: () => void
  onDemo: () => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string>()

  const demo = () => {
    useStore.getState().replaceState(createDemoState())
    onDemo()
  }

  const restore = async (file: File | undefined) => {
    if (!file) return
    const err = await loadBackup(file)
    if (fileRef.current) fileRef.current.value = ''
    if (err) setError(err)
    else { setError(undefined); onLoaded() }
  }

  return (
    <Card>
      <h2 className="text-xl font-semibold text-stone-900">Welcome</h2>
      <p className="mt-2 text-sm text-stone-700">
        This planner helps you manage your guest list, RSVPs, seating, costs and more. A short setup
        (about five minutes) tailors it to your wedding.
      </p>
      <p className="mt-2 text-sm text-stone-700">
        Everything you enter stays in this browser. There are no accounts and nothing is sent online (to any server).
        Download a backup from Settings &amp; data to keep a copy or move to another device.
      </p>
      <div className="mt-5 flex flex-wrap gap-2">
        <Button variant="primary" onClick={onStart}>Start setup</Button>
        <Button onClick={demo}>Load demo wedding</Button>
        <Button onClick={() => fileRef.current?.click()}>Restore a backup</Button>
        <input ref={fileRef} type="file" accept="application/json,.json" className="sr-only" tabIndex={-1}
          aria-label="Backup file" onChange={(e) => void restore(e.target.files?.[0])} />
      </div>
      {error && <div className="mt-3" role="alert"><Alert tone="error">{error}</Alert></div>}
    </Card>
  )
}
