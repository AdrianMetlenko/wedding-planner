import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, EmptyState, PageHeader } from '../../components/ui'
import { useStore } from '../../store/store'
import { ChoosePanel } from './ChoosePanel'
import { CostComparison } from './CostComparison'
import { CostGrid } from './CostGrid'
import { InclusionsMatrix } from './InclusionsMatrix'
import { VenueCard } from './VenueCard'
import { addVenue } from './venueActions'
import { flattenPackages, headcountSteps } from './venueGrid'

export default function VenuesPage() {
  const enabled = useStore((s) => s.settings.modules.venues)
  const venues = useStore((s) => s.venues)
  const inclusions = useStore((s) => s.venueInclusions)
  const capMin = useStore((s) => s.settings.capacity.min)
  const capGoal = useStore((s) => s.settings.capacity.goal)
  const capMax = useStore((s) => s.settings.capacity.max)
  const [headcountInput, setHeadcountInput] = useState<number | null>()  // undefined = default, null = cleared by the user
  const [choosingId, setChoosingId] = useState<string>()
  const [newVenueId, setNewVenueId] = useState<string>()

  if (!enabled) {
    return (
      <>
        <PageHeader title="Venues" />
        <EmptyState title="Venue scouting is turned off">
          Turn it on under{' '}
          <Link to="/setup" className="font-medium text-brand-700 underline">setup</Link> to compare venues.
        </EmptyState>
      </>
    )
  }

  const refs = flattenPackages(venues)
  const headcount = headcountInput === undefined ? (capGoal ?? capMax) : headcountInput ?? undefined
  const start = capMin ?? Math.max(1, Math.round(capMax * 0.6))
  const headcounts = headcountSteps(Math.min(start, capMax), capMax)
  const choosing = refs.find((r) => r.pkg.id === choosingId)
  const add = () => setNewVenueId(addVenue())

  return (
    <>
      <PageHeader
        title="Venues"
        description="Compare venues like for like: venue charges, estimated drinks and the extras each one leaves out."
        actions={<Button variant="primary" onClick={add}>Add a venue</Button>}
      />

      {venues.length === 0 ? (
        <EmptyState title="No venues yet" action={<Button variant="primary" onClick={add}>Add a venue</Button>}>
          Add each venue you are considering with its packages, then compare their total cost and what is included.
        </EmptyState>
      ) : (
        <div className="space-y-6">
          {choosing && <ChoosePanel key={choosing.pkg.id} target={choosing} onClose={() => setChoosingId(undefined)} />}
          <div className="space-y-4">
            {venues.map((v) => (
              <VenueCard key={v.id} venue={v} headcount={headcount ?? capGoal ?? capMax} startOpen={v.id === newVenueId}
                onChoose={setChoosingId} />
            ))}
          </div>
          <CostComparison refs={refs} headcount={headcount} onHeadcount={(n) => setHeadcountInput(n ?? null)} />
          <CostGrid refs={refs} headcounts={headcounts} plannerRange={{ min: capMin, max: capMax }} />
          <InclusionsMatrix venues={venues} rows={inclusions} />
        </div>
      )}
    </>
  )
}
