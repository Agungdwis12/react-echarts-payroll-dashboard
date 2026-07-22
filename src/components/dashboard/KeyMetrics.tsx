import { BadgePercent, CircleDollarSign, Clock3, PackageCheck, RotateCcw, UserPlus } from 'lucide-react'
import { PanelHeader } from './PanelHeader'

const metrics = [
  { label: '新客数（人）', icon: UserPlus, accent: '#269dff' },
  { label: '复购率', icon: RotateCcw, accent: '#1bc5bd' },
  { label: '退款金额（元）', icon: CircleDollarSign, accent: '#ff5664' },
  { label: '毛利率', icon: BadgePercent, accent: '#35c968' },
  { label: '库存周转率', icon: PackageCheck, accent: '#f0a928' },
  { label: '平均发货时效（天）', icon: Clock3, accent: '#9c67f5' },
]

export function KeyMetrics() {
  return (
    <section className="panel key-metrics" aria-labelledby="key-metrics-title">
      <PanelHeader
        id="key-metrics-title"
        index="03"
        title="关键数据"
        meta="指标卡组件 · 第 4 篇"
      />

      <div className="metrics-grid">
        {metrics.map(({ label, icon: Icon, accent }) => (
          <article className="metric-card" key={label} style={{ '--accent': accent } as React.CSSProperties}>
            <span className="metric-card__icon"><Icon size={16} strokeWidth={1.8} /></span>
            <div className="metric-card__body">
              <div className="metric-card__label">{label}</div>
              <div className="metric-card__value" aria-hidden="true" />
            </div>
            <div className="metric-card__sparkline" aria-hidden="true">
              <svg viewBox="0 0 72 28" fill="none">
                <path d="M1 23L10 17L18 20L27 10L36 15L45 6L54 13L63 8L71 11" stroke="currentColor" strokeWidth="2" />
              </svg>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
