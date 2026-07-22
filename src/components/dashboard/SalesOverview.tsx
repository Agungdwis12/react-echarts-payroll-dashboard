import { BadgePercent, CircleDollarSign, ReceiptText, TrendingUp } from 'lucide-react'
import { ModulePlaceholder } from './ModulePlaceholder'

const kpis = [
  { label: '销售额（元）', icon: CircleDollarSign, accent: '#239dff' },
  { label: '订单量（笔）', icon: ReceiptText, accent: '#8d68ff' },
  { label: '客单价（元）', icon: BadgePercent, accent: '#24c98a' },
  { label: '转化率', icon: TrendingUp, accent: '#f4a928' },
]

export function SalesOverview() {
  return (
    <section className="panel sales-overview" aria-labelledby="sales-overview-title">
      <div className="panel-heading">
        <div className="panel-heading__title">
          <span className="panel-heading__index">01</span>
          <h2 id="sales-overview-title">销售总览</h2>
        </div>
        <span className="panel-heading__meta">第三至第五篇逐块实现</span>
      </div>

      <div className="kpi-grid">
        {kpis.map(({ label, icon: Icon, accent }) => (
          <article className="kpi-card" key={label} style={{ '--accent': accent } as React.CSSProperties}>
            <span className="kpi-card__icon"><Icon size={24} strokeWidth={1.8} /></span>
            <div>
              <div className="kpi-card__label">{label}</div>
              <div className="kpi-card__line" aria-hidden="true" />
            </div>
          </article>
        ))}
      </div>

      <div className="overview-charts">
        <ModulePlaceholder title="销售额趋势" chapter="折线图将在第 5 篇接入 ECharts" />
        <ModulePlaceholder title="销售额渠道占比" chapter="环形图将在第 5 篇接入 ECharts" />
      </div>
    </section>
  )
}
