import type { ViewportState } from '../../constants/dashboard'
import { CarouselControls } from './CarouselControls'
import { DashboardHeader } from './DashboardHeader'
import { KeyMetrics } from './KeyMetrics'
import { SalesOverview } from './SalesOverview'
import { SalesRanking } from './SalesRanking'

type DashboardLayoutProps = {
  viewport: ViewportState
}

export function DashboardLayout({ viewport }: DashboardLayoutProps) {
  return (
    <div className="dashboard-layout">
      <DashboardHeader viewport={viewport} />

      <div className="dashboard-main">
        <SalesOverview />
        <SalesRanking />
      </div>

      <KeyMetrics />
      <CarouselControls />
    </div>
  )
}
