export type DateRange = 'today' | '7-days' | '30-days' | 'custom'

export type MetricTone = 'positive' | 'negative' | 'neutral'

export type MetricIconKey =
  | 'sales'
  | 'orders'
  | 'average-order'
  | 'conversion'
  | 'customers'
  | 'repeat-purchase'
  | 'refund'
  | 'gross-margin'
  | 'inventory'
  | 'shipping'

export type SummaryMetricData = {
  id: string
  label: string
  value: number
  fractionDigits?: number
  unit?: string
  change: string
  tone: MetricTone
  accent: string
  icon: MetricIconKey
}

export type KeyMetricData = SummaryMetricData & {
  sparkline: number[]
}

export type SalesTrendData = {
  categories: string[]
  currentLabel: string
  previousLabel: string
  current: number[]
  previous: number[]
}

export type ChannelData = {
  name: string
  value: number
  color: string
}

export type RankingData = {
  name: string
  amount: number
  share: number
}

export type DashboardData = {
  rangeLabel: string
  updatedAt: string
  summaryMetrics: SummaryMetricData[]
  salesTrend: SalesTrendData
  channels: ChannelData[]
  ranking: RankingData[]
  keyMetrics: KeyMetricData[]
}

export type DashboardDataStatus = 'loading' | 'success' | 'empty' | 'error'

export type MockScenario = 'success' | 'loading' | 'empty' | 'error'
