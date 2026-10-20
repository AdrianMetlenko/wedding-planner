import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  CartesianGrid, Legend, Line, LineChart, ReferenceArea, ReferenceDot, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { Alert, Card, NumberInput } from '../../components/ui'
import { formatMoney } from '../../lib/format'
import type { Settings } from '../../lib/types'
import { useStore } from '../../store/store'
import { marginalText, optimiserRange, optimiserSummary, pointAt } from './helpers'

/** The model's assumptions, stated up front, with the gift amount editable in place. */
function Assumptions({ settings }: { settings: Settings }) {
  const min = settings.capacity.min
  return (
    <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-md bg-stone-50 px-3 py-2 text-sm text-stone-700">
      <label className="flex items-center gap-2">
        <span className="font-medium">Expected gift per guest</span>
        <span className="relative">
          <span className="pointer-events-none absolute inset-y-0 left-2 flex items-center text-stone-500">$</span>
          <NumberInput
            className="w-24 pl-5" min={0} step={10} value={settings.averageGift}
            onValueChange={(v) => useStore.getState().updateSettings({ averageGift: v })}
          />
        </span>
      </label>
      <span className="text-xs text-stone-500">
        Every extra guest is priced as an adult.
        {min !== undefined && ` The venue bills at least ${min}.`}
        {settings.tiers.length > 0 && ' Where it is cheaper, you pay for extra places to reach the next price tier.'}
      </span>
    </div>
  )
}

export function OptimiserSection({ settings, planned, attending }: { settings: Settings; planned: number; attending: number }) {
  const goal = settings.capacity.goal
  const curve = useMemo(
    () => optimiserRange(settings, [planned, attending, goal ?? 0]),
    [settings, planned, attending, goal],
  )
  const summary = useMemo(() => optimiserSummary(settings, curve), [settings, curve])
  const hasTiers = settings.tiers.length > 0
  const { hasGift, best } = summary

  if (!hasTiers && !hasGift) {
    return (
      <Card title="Headcount optimiser">
        <Assumptions settings={settings} />
        <p className="text-sm text-stone-700">
          The optimiser shows whether a bigger guest list can actually cost you less. It needs either venue price
          tiers (a lower per-head price at higher headcounts) or an expected average gift per guest. Add them in{' '}
          <Link to="/setup" className="font-medium text-brand-700 underline">Setup</Link> to see the cheapest headcount.
        </p>
      </Card>
    )
  }

  const markPoint = (n: number) => pointAt(settings, n)
  const yFor = (n: number) => (hasGift ? markPoint(n).net : markPoint(n).cost)
  const inRange = (n: number) => n >= curve[0].headcount && n <= curve[curve.length - 1].headcount
  const money = (v: unknown) => formatMoney(Number(v))
  const a11y = `${summary.text} ${planned > 0 ? marginalText(settings, planned) : ''}`.trim()

  return (
    <Card title="Headcount optimiser">
      <Assumptions settings={settings} />
      <div className="mb-2 space-y-1 text-sm text-stone-700">
        <p className="font-medium text-stone-900">{summary.text}</p>
        {planned > 0 && <p>{marginalText(settings, planned)}</p>}
      </div>
      <div role="img" aria-label={a11y} className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={curve} margin={{ top: 16, right: 16, bottom: 20, left: 8 }}>
            <CartesianGrid stroke="#e7e5e4" strokeDasharray="3 3" />
            <XAxis
              dataKey="headcount" type="number" domain={[0, 'dataMax']} tick={{ fontSize: 12 }}
              label={{ value: 'Counted guests', position: 'insideBottom', offset: -10, fontSize: 12 }}
            />
            <ReferenceArea
              x1={settings.capacity.min ?? 0} x2={settings.capacity.max} fill="#d1fae5" fillOpacity={0.5}
              label={{ value: 'Venue range', position: 'insideBottom', fontSize: 11, fill: '#047857' }}
            />
            <YAxis
              tickFormatter={(v: number) => formatMoney(v)} tick={{ fontSize: 12 }} width={72}
              label={{ value: 'Cost', angle: -90, position: 'insideLeft', fontSize: 12 }}
            />
            <Tooltip
              formatter={(v, name) => [money(v), name]}
              labelFormatter={(l) => `${l} guests`}
            />
            <Legend verticalAlign="top" height={24} />
            <Line type="linear" dataKey="cost" name="Venue cost" stroke="#78716c" strokeWidth={2} dot={false} isAnimationActive={false} />
            {hasGift && (
              <Line type="linear" dataKey="net" name="Net cost (after gifts)" stroke="#a8445a" strokeWidth={2.5} dot={false} isAnimationActive={false} />
            )}
            {goal !== undefined && inRange(goal) && (
              <ReferenceLine x={goal} stroke="#059669" strokeDasharray="4 3" label={{ value: 'Goal', position: 'top', fontSize: 11, fill: '#059669' }} />
            )}
            {planned > 0 && planned === attending && inRange(planned) && (
              <ReferenceLine x={planned} stroke="#0284c7" strokeDasharray="2 3" label={{ value: 'Forecast = attending', position: 'insideTopRight', fontSize: 11, fill: '#0284c7' }} />
            )}
            {planned > 0 && planned !== attending && inRange(planned) && (
              <ReferenceLine x={planned} stroke="#a8445a" strokeDasharray="2 3" label={{ value: 'Forecast', position: 'insideTopRight', fontSize: 11, fill: '#a8445a' }} />
            )}
            {attending > 0 && planned !== attending && inRange(attending) && (
              <ReferenceLine x={attending} stroke="#0284c7" strokeDasharray="2 3" label={{ value: 'Attending', position: 'insideRight', fontSize: 11, fill: '#0284c7' }} />
            )}
            {best && (
              <ReferenceDot x={best.headcount} y={yFor(best.headcount)} r={6} fill="#059669" stroke="#fff" strokeWidth={2} ifOverflow="extendDomain" />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 text-xs text-stone-500">
        Green dot: cheapest point. Shaded: your venue&rsquo;s minimum to maximum. Flat stretches are where you
        pay for places nobody fills: below the venue minimum, or just under a price tier where paying for the
        tier&rsquo;s headcount is cheaper.
      </p>
      {!hasGift && (
        <div className="mt-2">
          <Alert tone="info">
            Enter an expected gift per guest above to see the net cost after gifts.
          </Alert>
        </div>
      )}
      {!hasTiers && hasGift && (
        <p className="mt-1 text-xs text-stone-500">
          With no price tiers, each extra guest costs the flat adult price, so the curve is a straight line.
        </p>
      )}
    </Card>
  )
}
