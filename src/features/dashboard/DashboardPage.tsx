import { Link } from 'react-router-dom'
import { Button, EmptyState } from '../../components/ui'
import { BreakdownCharts } from './BreakdownCharts'
import { BudgetSnapshot } from './BudgetSnapshot'
import { CapacityBand } from './CapacityBand'
import { CostSection } from './CostSection'
import { GiftsSection } from './GiftsSection'
import { HeaderSection } from './HeaderSection'
import { HeadcountTiles } from './HeadcountTiles'
import { OptimiserSection } from './OptimiserSection'
import { useDashboardData } from './useDashboardData'

export default function DashboardPage() {
  const data = useDashboardData()
  const { settings, planned, attending } = data

  if (data.guests.length === 0) {
    return (
      <>
        <HeaderSection settings={settings} />
        <EmptyState
          title="No guests yet"
          action={(
            <div className="flex justify-center gap-2">
              <Link to="/guests"><Button variant="primary">Add guests</Button></Link>
              <Link to="/setup"><Button>Review setup</Button></Link>
            </div>
          )}
        >
          Add or import your guest list to see headcounts, costs and the optimiser. You can also revisit your
          capacity and pricing in setup.
        </EmptyState>
      </>
    )
  }

  return (
    <div className="space-y-4">
      <HeaderSection settings={settings} />
      <HeadcountTiles data={data} />
      <CapacityBand settings={settings} planned={planned.headcount} attending={attending.headcount} />
      <CostSection settings={settings} planned={planned.cost} attending={attending.cost} />
      <OptimiserSection settings={settings} planned={planned.headcount} attending={attending.headcount} />
      <BreakdownCharts data={data} />
      {settings.modules.gifts && <GiftsSection data={data} />}
      {settings.modules.expenses && <BudgetSnapshot data={data} />}
    </div>
  )
}
