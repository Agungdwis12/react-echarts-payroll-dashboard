import { BadgePercent, CircleDollarSign, Clock3, PackageCheck, RotateCcw, UserPlus } from 'lucide-react'
import { PanelHeader } from './PanelHeader'
import {
  CompactMetricCard,
  type CompactMetricCardProps,
} from './metrics/CompactMetricCard'

type CompactMetric = CompactMetricCardProps & { id: string }

const metrics: CompactMetric[] = [
  {
    id: 'new-customers',
    label: '新客数（人）',
    value: 5678,
    change: '+9.2%',
    tone: 'positive',
    icon: UserPlus,
    accent: '#269dff',
    sparkline: [12, 18, 15, 24, 20, 29, 25, 32, 27, 35, 31, 38],
  },
  {
    id: 'repeat-purchase-rate',
    label: '复购率',
    value: 27.3,
    fractionDigits: 1,
    unit: '%',
    change: '+1.8pt',
    tone: 'positive',
    icon: RotateCcw,
    accent: '#1bc5bd',
    sparkline: [22, 25, 21, 29, 26, 31, 27, 34, 30, 36, 33, 40],
  },
  {
    id: 'refund-amount',
    label: '退款金额（元）',
    value: 186542,
    change: '-5.6%',
    tone: 'negative',
    icon: CircleDollarSign,
    accent: '#ff5664',
    sparkline: [31, 28, 35, 30, 41, 33, 29, 36, 32, 38, 30, 34],
  },
  {
    id: 'gross-margin',
    label: '毛利率',
    value: 45.7,
    fractionDigits: 1,
    unit: '%',
    change: '+0.9pt',
    tone: 'positive',
    icon: BadgePercent,
    accent: '#35c968',
    sparkline: [18, 21, 20, 26, 24, 31, 29, 34, 32, 37, 35, 39],
  },
  {
    id: 'inventory-turnover',
    label: '库存周转率',
    value: 8.2,
    fractionDigits: 1,
    change: '+0.3',
    tone: 'positive',
    icon: PackageCheck,
    accent: '#f0a928',
    sparkline: [16, 23, 19, 27, 22, 31, 26, 35, 29, 37, 32, 40],
  },
  {
    id: 'average-shipping-time',
    label: '平均发货时效（天）',
    value: 1.3,
    fractionDigits: 1,
    change: '-0.1',
    tone: 'negative',
    icon: Clock3,
    accent: '#9c67f5',
    sparkline: [28, 24, 30, 26, 33, 27, 35, 31, 36, 29, 32, 27],
  },
]

export function KeyMetrics() {
  return (
    <section className="panel key-metrics" aria-labelledby="key-metrics-title">
      <PanelHeader
        id="key-metrics-title"
        index="03"
        title="关键数据"
        meta="6 项运营指标已完成"
      />

      <div className="metrics-grid">
        {metrics.map(({ id, ...metric }) => (
          <CompactMetricCard key={id} {...metric} />
        ))}
      </div>
    </section>
  )
}
