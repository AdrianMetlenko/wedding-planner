import { PageHeader } from '../../components/ui'
import { daysUntil } from '../../lib/format'
import type { Settings } from '../../lib/types'
import { countdownLabel } from './helpers'

export function HeaderSection({ settings }: { settings: Settings }) {
  const names = settings.coupleNames.filter(Boolean).join(' & ')
  const label = countdownLabel(daysUntil(settings.date))
  const date = settings.date
    ? new Date(`${settings.date}T00:00:00`).toLocaleDateString('en-US', { dateStyle: 'long' })
    : undefined
  return (
    <PageHeader
      title={names || 'Dashboard'}
      description={[date, names ? 'Dashboard' : undefined].filter(Boolean).join(' · ') || undefined}
      actions={label && (
        <span className="rounded-full bg-brand-100 px-4 py-1.5 text-sm font-semibold text-brand-700" aria-live="polite">
          {label}
        </span>
      )}
    />
  )
}
