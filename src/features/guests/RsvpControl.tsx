import { cx } from '../../components/ui'
import type { Rsvp } from '../../lib/types'

export const RSVP_LABEL: Record<Rsvp, string> = { pending: 'Pending', yes: 'Yes', no: 'No' }
const ORDER: Rsvp[] = ['pending', 'yes', 'no']
const ACTIVE: Record<Rsvp, string> = {
  pending: 'bg-stone-200 text-stone-800',
  yes: 'bg-emerald-600 text-white',
  no: 'bg-red-600 text-white',
}

/** Segmented pending / yes / no control. */
export function RsvpControl({ value, onChange, label }: {
  value: Rsvp; onChange: (v: Rsvp) => void; label: string
}) {
  return (
    <div role="group" aria-label={`RSVP for ${label}`} className="inline-flex overflow-hidden rounded-md border border-stone-300 text-xs">
      {ORDER.map((r) => (
        <button
          key={r}
          type="button"
          aria-pressed={value === r}
          onClick={() => value !== r && onChange(r)}
          className={cx(
            'px-2 py-1 font-medium transition-colors',
            value === r ? ACTIVE[r] : 'bg-white text-stone-600 hover:bg-stone-100',
          )}
        >
          {RSVP_LABEL[r]}
        </button>
      ))}
    </div>
  )
}
