import { useMemo, useState } from 'react'
import { Button, Card } from '../../components/ui'
import { formatMoney } from '../../lib/format'
import type { Gift, Guest, Household } from '../../lib/types'
import { giftDistribution, type GiftBasis, type GiftPoint } from './distribution'

const W = 720
const H = 170
const PAD = { left: 16, right: 16, top: 34, bottom: 30 }
const BOX_Y = 70
const BOX_H = 34

function niceMax(v: number) {
  if (v <= 0) return 100
  const p = 10 ** Math.floor(Math.log10(v))
  return Math.ceil(v / p) * p
}

/** Deterministic vertical jitter so dots don't sit on top of each other. */
const jitter = (i: number) => ((i * 37) % 23) / 22 - 0.5

export function GiftBoxPlot({ gifts, guests, households, expected }: {
  gifts: Gift[]; guests: Guest[]; households: Household[]; expected?: number
}) {
  const [basis, setBasis] = useState<GiftBasis>('perGuest')
  const [fullRange, setFullRange] = useState(false)
  const d = useMemo(() => giftDistribution(gifts, guests, households, basis), [gifts, guests, households, basis])
  const s = d.stats

  if (!s) return null
  const expectedHere = basis === 'perGuest' ? expected ?? 0 : 0
  // By default zoom to the box and whiskers; outliers beyond the axis sit at the edge with their value.
  const zoomMax = niceMax(Math.max(s.highWhisker, expectedHere) * 1.25)
  const max = fullRange || zoomMax >= s.max ? niceMax(Math.max(s.max, expectedHere)) : zoomMax
  const offScale = (v: number) => v > max
  const x = (v: number) => PAD.left + (Math.min(v, max) / max) * (W - PAD.left - PAD.right - 8)
  const ticks = Array.from({ length: 6 }, (_, i) => (max / 5) * i)
  const outlierSet = new Set(s.outliers)
  const none = d.points.filter((p) => p.none)
  const high = d.points.filter((p) => outlierSet.has(p.value) && p.value > s.q3).sort((a, b) => b.value - a.value)
  const unit = basis === 'perGuest' ? 'per attending guest' : 'per household'
  // Label off-scale outliers (their position no longer shows their value), else the top few.
  const labelled = new Set((high.some((p) => offScale(p.value)) ? high.filter((p) => offScale(p.value)) : high.slice(0, 3)).map((p) => p.householdId))
  const pointTitle = (p: GiftPoint) =>
    `${p.name}: ${p.none ? 'no gift' : `${formatMoney(p.value)} ${unit}`} (${p.attending} attending${basis === 'perGuest' && !p.none ? `, ${formatMoney(p.total)} total` : ''})`

  const summary = `Gifts ${unit} across ${d.points.length} attending households: median ${formatMoney(s.median)}, `
    + `middle half ${formatMoney(s.q1)}–${formatMoney(s.q3)}, ${none.length} gave nothing, ${high.length} large outliers.`

  return (
    <Card
      title="Gift distribution"
      actions={
        <div className="flex flex-wrap gap-2">
        {zoomMax < s.max && (
          <Button size="sm" variant="ghost" aria-pressed={fullRange} onClick={() => setFullRange(!fullRange)}>
            {fullRange ? 'Zoom to the box' : 'Show full range'}
          </Button>
        )}
        <div role="group" aria-label="Measure gifts" className="inline-flex gap-1">
          <Button size="sm" variant={basis === 'perGuest' ? 'primary' : 'secondary'} aria-pressed={basis === 'perGuest'} onClick={() => setBasis('perGuest')}>Per guest</Button>
          <Button size="sm" variant={basis === 'perHousehold' ? 'primary' : 'secondary'} aria-pressed={basis === 'perHousehold'} onClick={() => setBasis('perHousehold')}>Per household</Button>
        </div>
        </div>
      }
    >
      <p className="mb-2 text-sm text-stone-700">
        Each dot is a household with someone attending, valued {unit}. Grey dots at $0 gave nothing; the box is the
        middle half, the line in it the median, and red dots beyond the whiskers are outliers. Hover a dot for the
        household. Arrows at the right edge are outliers beyond the axis.
      </p>
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[560px]" role="img" aria-label={summary}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={x(t)} x2={x(t)} y1={PAD.top - 6} y2={H - PAD.bottom} stroke="#e7e5e4" strokeDasharray="3 3" />
              <text x={x(t)} y={H - 10} textAnchor="middle" fontSize="11" fill="#78716c">{formatMoney(t)}</text>
            </g>
          ))}
          {basis === 'perGuest' && expected !== undefined && expected <= max && (
            <g>
              <line x1={x(expected)} x2={x(expected)} y1={PAD.top - 10} y2={H - PAD.bottom} stroke="#059669" strokeDasharray="4 3" />
              <text x={x(expected) + 4} y={PAD.top - 14} fontSize="11" fill="#059669">Expected {formatMoney(expected)}</text>
            </g>
          )}
          {/* whiskers */}
          <line x1={x(s.lowWhisker)} x2={x(s.q1)} y1={BOX_Y + BOX_H / 2} y2={BOX_Y + BOX_H / 2} stroke="#57534e" />
          <line x1={x(s.q3)} x2={x(s.highWhisker)} y1={BOX_Y + BOX_H / 2} y2={BOX_Y + BOX_H / 2} stroke="#57534e" />
          <line x1={x(s.lowWhisker)} x2={x(s.lowWhisker)} y1={BOX_Y + 8} y2={BOX_Y + BOX_H - 8} stroke="#57534e" />
          <line x1={x(s.highWhisker)} x2={x(s.highWhisker)} y1={BOX_Y + 8} y2={BOX_Y + BOX_H - 8} stroke="#57534e" />
          {/* box + median */}
          <rect x={x(s.q1)} y={BOX_Y} width={Math.max(1, x(s.q3) - x(s.q1))} height={BOX_H} fill="#fbe8eb" stroke="#a8445a" rx="3" />
          <line x1={x(s.median)} x2={x(s.median)} y1={BOX_Y} y2={BOX_Y + BOX_H} stroke="#8a3549" strokeWidth="2.5" />
          {/* points */}
          {d.points.map((p, i) => {
            const outlier = outlierSet.has(p.value)
            const off = offScale(p.value)
            const cy = BOX_Y + BOX_H / 2 + jitter(i) * (BOX_H + 22)
            const cx = x(p.value)
            const fill = p.none ? '#a8a29e' : outlier ? '#c2566b' : '#57534e'
            return (
              <g key={p.householdId}>
                {off ? (
                  <path d={`M${cx - 5},${cy - 5} L${cx + 4},${cy} L${cx - 5},${cy + 5} Z`} fill={fill}>
                    <title>{pointTitle(p)} (off scale)</title>
                  </path>
                ) : (
                  <circle cx={cx} cy={cy} r={outlier ? 4 : 3} fill={fill} fillOpacity={outlier ? 0.95 : 0.45}>
                    <title>{pointTitle(p)}</title>
                  </circle>
                )}
                {labelled.has(p.householdId) && (
                  <text x={cx - 8} y={cy + 3} textAnchor="end" fontSize="10" fill="#8a3549">
                    {p.name}{off ? ` ${formatMoney(p.value)} →` : ''}
                  </text>
                )}
              </g>
            )
          })}
        </svg>
      </div>

      <dl className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-4">
        <div><dt className="text-xs text-stone-500">Median</dt><dd className="tabular-nums">{formatMoney(s.median)}</dd></div>
        <div><dt className="text-xs text-stone-500">Middle half</dt><dd className="tabular-nums">{formatMoney(s.q1)}–{formatMoney(s.q3)}</dd></div>
        <div><dt className="text-xs text-stone-500">Mean</dt><dd className="tabular-nums">{formatMoney(s.mean)}</dd></div>
        <div><dt className="text-xs text-stone-500">Households</dt><dd className="tabular-nums">{d.points.length}</dd></div>
      </dl>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <details className="text-sm">
          <summary className="cursor-pointer font-medium text-stone-800">Gave nothing ({none.length})</summary>
          <p className="mt-1 text-xs text-stone-500">Households with someone attending and no gift linked to them.</p>
          <ul className="mt-1 max-h-48 overflow-y-auto text-stone-700">
            {none.map((p) => <li key={p.householdId}>{p.name} <span className="text-stone-400">({p.attending})</span></li>)}
          </ul>
        </details>
        <details className="text-sm" open={high.length > 0 && high.length <= 8}>
          <summary className="cursor-pointer font-medium text-stone-800">Large outliers ({high.length})</summary>
          <ul className="mt-1 max-h-48 overflow-y-auto tabular-nums text-stone-700">
            {high.map((p) => <li key={p.householdId}>{p.name}: {formatMoney(p.value)} <span className="text-stone-400">{unit}</span></li>)}
          </ul>
        </details>
      </div>
      {d.unvalued.length > 0 && (
        <p className="mt-3 text-xs text-stone-500">
          Not plotted: {d.unvalued.length} household{d.unvalued.length === 1 ? '' : 's'} whose gifts have no dollar
          value ({d.unvalued.map((u) => u.name).join(', ')}). Add an estimated amount to include them.
        </p>
      )}
    </Card>
  )
}
