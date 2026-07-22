import { BadgePercent, CircleDollarSign, ReceiptText, TrendingUp } from 'lucide-react'
import { PanelHeader } from './PanelHeader'
import { ChannelDonutChart } from './charts/ChannelDonutChart'
import { SalesTrendChart } from './charts/SalesTrendChart'
import {
  SummaryMetricCard,
  type SummaryMetricCardProps,
} from './metrics/SummaryMetricCard'

type SummaryMetric = SummaryMetricCardProps & { id: string }

const summaryMetrics: SummaryMetric[] = [
  {
    id: 'sales-amount',
    label: '销售额（元）',
    value: 8756.32,
    fractionDigits: 2,
    unit: '万',
    change: '+8.6%',
    tone: 'positive',
    icon: CircleDollarSign,
    accent: '#239dff',
  },
  {
    id: 'order-count',
    label: '订单量（笔）',
    value: 23856,
    change: '+6.3%',
    tone: 'positive',
    icon: ReceiptText,
    accent: '#8d68ff',
  },
  {
    id: 'average-order-value',
    label: '客单价（元）',
    value: 98.12,
    fractionDigits: 2,
    change: '+6.6%',
    tone: 'positive',
    icon: BadgePercent,
    accent: '#24c98a',
  },
  {
    id: 'conversion-rate',
    label: '转化率',
    value: 3.62,
    fractionDigits: 2,
    unit: '%',
    change: '+0.42pt',
    tone: 'positive',
    icon: TrendingUp,
    accent: '#f4a928',
  },
]

export function SalesOverview() {
  return (
    <section className="panel sales-overview" aria-labelledby="sales-overview-title">
      <PanelHeader
        id="sales-overview-title"
        index="01"
        title="销售总览"
        meta="核心指标与图表已完成"
      />

      <div className="kpi-grid">
        {summaryMetrics.map(({ id, ...metric }) => (
          <SummaryMetricCard key={id} {...metric} />
        ))}
      </div>

      <div className="overview-charts">
        <SalesTrendChart />
        <ChannelDonutChart />
      </div>
    </section>
  )
}
