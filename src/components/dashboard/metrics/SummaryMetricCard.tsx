import type { CSSProperties } from 'react'
import type { LucideIcon } from 'lucide-react'
import { formatMetricValue } from '../../../utils/formatMetricValue'
import { MetricChange, type MetricTone } from './MetricChange'

export type SummaryMetricCardProps = {
  label: string
  value: number
  fractionDigits?: number
  unit?: string
  change: string
  tone: MetricTone
  accent: string
  icon: LucideIcon
}

export function SummaryMetricCard({
  label,
  value,
  fractionDigits = 0,
  unit,
  change,
  tone,
  accent,
  icon: Icon,
}: SummaryMetricCardProps) {
  return (
    <article
      className="summary-metric-card"
      style={{ '--accent': accent } as CSSProperties}
    >
      <span className="summary-metric-card__icon" aria-hidden="true">
        <Icon size={28} strokeWidth={1.9} />
      </span>

      <div className="summary-metric-card__content">
        <div className="summary-metric-card__label">{label}</div>
        <div className="summary-metric-card__number">
          <strong>{formatMetricValue(value, fractionDigits)}</strong>
          {unit && <span>{unit}</span>}
        </div>
        <MetricChange value={change} tone={tone} />
      </div>
    </article>
  )
}
