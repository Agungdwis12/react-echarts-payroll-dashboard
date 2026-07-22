import type { CSSProperties } from 'react'
import type { LucideIcon } from 'lucide-react'
import { formatMetricValue } from '../../../utils/formatMetricValue'
import { MetricChange, type MetricTone } from './MetricChange'
import { Sparkline } from './Sparkline'

export type CompactMetricCardProps = {
  label: string
  value: number
  fractionDigits?: number
  unit?: string
  change: string
  tone: MetricTone
  accent: string
  icon: LucideIcon
  sparkline: number[]
}

export function CompactMetricCard({
  label,
  value,
  fractionDigits = 0,
  unit,
  change,
  tone,
  accent,
  icon: Icon,
  sparkline,
}: CompactMetricCardProps) {
  return (
    <article
      className="compact-metric-card"
      style={{ '--accent': accent } as CSSProperties}
    >
      <div className="compact-metric-card__heading">
        <span className="compact-metric-card__icon" aria-hidden="true">
          <Icon size={16} strokeWidth={1.9} />
        </span>
        <span className="compact-metric-card__label">{label}</span>
      </div>

      <div className="compact-metric-card__number">
        <strong>{formatMetricValue(value, fractionDigits)}</strong>
        {unit && <span>{unit}</span>}
      </div>
      <MetricChange value={change} tone={tone} />

      <div className="compact-metric-card__chart">
        <Sparkline values={sparkline} />
      </div>
    </article>
  )
}
