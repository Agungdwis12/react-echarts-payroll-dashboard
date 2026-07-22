import type { DashboardData, DateRange } from '../../types/dashboard'
import { DateRangeFilter } from './DateRangeFilter'
import { PanelHeader } from './PanelHeader'
import { ChannelDonutChart } from './charts/ChannelDonutChart'
import { SalesTrendChart } from './charts/SalesTrendChart'
import { metricIconMap } from './metricIconMap'
import { SummaryMetricCard } from './metrics/SummaryMetricCard'

type SalesOverviewProps = {
  data: DashboardData | null
  dateRange: DateRange
  onDateRangeChange: (dateRange: DateRange) => void
}

export function SalesOverview({
  data,
  dateRange,
  onDateRangeChange,
}: SalesOverviewProps) {

  return (
    <section
      className="panel sales-overview"
      aria-labelledby="sales-overview-title"
      data-date-range={dateRange}
    >
      <PanelHeader
        id="sales-overview-title"
        index="01"
        title="销售总览"
        meta={<DateRangeFilter value={dateRange} onChange={onDateRangeChange} />}
      />

      <div className="kpi-grid">
        {data
          ? data.summaryMetrics.map(({ id, icon, ...metric }) => (
              <SummaryMetricCard key={id} icon={metricIconMap[icon]} {...metric} />
            ))
          : Array.from({ length: 4 }, (_, index) => (
              <div className="summary-metric-card skeleton-card" key={index} aria-hidden="true" />
            ))}
      </div>

      <div className="overview-charts">
        {data ? (
          <>
            <SalesTrendChart data={data.salesTrend} />
            <ChannelDonutChart channels={data.channels} />
          </>
        ) : (
          <>
            <div className="chart-card skeleton-chart" aria-hidden="true" />
            <div className="chart-card skeleton-chart" aria-hidden="true" />
          </>
        )}
      </div>
    </section>
  )
}
