import { useState } from 'react'
import type { ViewportState } from '../../constants/dashboard'
import { useDashboardData } from '../../hooks/useDashboardData'
import type { DateRange } from '../../types/dashboard'
import { CarouselControls } from './CarouselControls'
import { DashboardDataState } from './DashboardDataState'
import { DashboardHeader } from './DashboardHeader'
import { KeyMetrics } from './KeyMetrics'
import { SalesOverview } from './SalesOverview'
import { SalesRanking } from './SalesRanking'

type DashboardLayoutProps = {
  viewport: ViewportState
}

export function DashboardLayout({ viewport }: DashboardLayoutProps) {
  const [dateRange, setDateRange] = useState<DateRange>('today')
  const { data, status, error, retry } = useDashboardData(dateRange)

  return (
    <div className="dashboard-layout">
      <DashboardHeader viewport={viewport} dataStatus={status} />

      <div className={`dashboard-content dashboard-content--${status}`} aria-busy={status === 'loading'}>
        <div className="dashboard-main">
          <SalesOverview
            data={data}
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
          />
          <SalesRanking ranking={data?.ranking ?? null} />
        </div>

        <KeyMetrics metrics={data?.keyMetrics ?? null} />

        {status !== 'success' && (
          <DashboardDataState status={status} error={error} onRetry={retry} />
        )}
      </div>
      <CarouselControls />
    </div>
  )
}
