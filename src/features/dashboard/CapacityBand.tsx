import { Alert, Card } from '../../components/ui'
import type { Settings } from '../../lib/types'
import { capacityWarnings, layoutBandLabels } from './helpers'

interface Marker { key: string; label: string; value: number; className: string; row: 'top' | 'bottom' }

export function CapacityBand({ settings, planned, attending }: { settings: Settings; planned: number; attending: number }) {
  const { min, goal, max } = settings.capacity
  const scale = Math.max(max, planned, attending, 1) * 1.04
  const pct = (n: number) => `${Math.min(100, (n / scale) * 100)}%`

  const markers: Marker[] = [
    ...(min !== undefined ? [{ key: 'min', label: 'Min', value: min, className: 'bg-amber-500', row: 'top' as const }] : []),
    ...(goal !== undefined ? [{ key: 'goal', label: 'Goal', value: goal, className: 'bg-emerald-600', row: 'top' as const }] : []),
    { key: 'max', label: 'Max', value: max, className: 'bg-stone-700', row: 'top' },
    { key: 'planned', label: 'Forecast', value: planned, className: 'bg-brand-500', row: 'bottom' },
    { key: 'attending', label: 'Attending', value: attending, className: 'bg-sky-600', row: 'bottom' },
  ]
  const top = layoutBandLabels(markers.filter((m) => m.row === 'top'), scale)
  const bottom = layoutBandLabels(markers.filter((m) => m.row === 'bottom'), scale)
  const lanes = (labels: { lane: number }[]) => Math.max(1, ...labels.map((l) => l.lane + 1))
  const LANE_REM = 1.25
  const warnings = capacityWarnings(settings, planned, attending)
  const summary = `Capacity: ${[
    min !== undefined && `minimum ${min}`, goal !== undefined && `goal ${goal}`, `maximum ${max}`,
    `forecast ${planned}`, `attending ${attending}`,
  ].filter(Boolean).join(', ')}.`

  return (
    <Card title="Capacity">
      <p className="sr-only">{summary}</p>
      <div className="space-y-2 px-2 pb-1" aria-hidden="true">
        <div className="relative" style={{ height: `${lanes(top) * LANE_REM}rem` }}>
          {top.map((l) => (
            <span
              key={l.keys.join('-')}
              className="absolute -translate-x-1/2 whitespace-nowrap text-xs text-stone-600"
              style={{ left: pct(l.value), bottom: `${l.lane * LANE_REM}rem` }}
            >
              {l.text}
            </span>
          ))}
        </div>
        <div className="relative h-4 rounded-full bg-stone-100">
          {min !== undefined && (
            <div className="absolute inset-y-0 rounded-full bg-emerald-100" style={{ left: pct(min), width: `calc(${pct(max)} - ${pct(min)})` }} />
          )}
          {markers.map((m) => (
            <span
              key={m.key}
              className={`absolute -top-1 h-6 w-1 -translate-x-1/2 rounded ${m.className}`}
              style={{ left: pct(m.value) }}
            />
          ))}
        </div>
        <div className="relative" style={{ height: `${lanes(bottom) * LANE_REM}rem` }}>
          {bottom.map((l) => (
            <span
              key={l.keys.join('-')}
              className="absolute -translate-x-1/2 whitespace-nowrap text-xs font-medium"
              style={{ left: pct(l.value), top: `${l.lane * LANE_REM}rem` }}
            >
              {l.text}
            </span>
          ))}
        </div>
      </div>
      {warnings.length > 0 && (
        <div className="mt-2 space-y-2">
          {warnings.map((w) => <Alert key={w.text} tone={w.tone}>{w.text}</Alert>)}
        </div>
      )}
      <p className="mt-2 text-xs text-stone-500">
        Counts include {settings.capacity.countsTypes.join(', ') || 'no guest types'}. The shaded zone is the
        allowed range between the venue minimum and maximum.
      </p>
    </Card>
  )
}
