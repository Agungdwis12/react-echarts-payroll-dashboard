import type { MetricTone } from '../../../types/dashboard'

export type { MetricTone } from '../../../types/dashboard'

type MetricChangeProps = {
  value: string
  tone: MetricTone
}

export function MetricChange({ value, tone }: MetricChangeProps) {
  return (
    <p className="metric-change">
      <span>较昨日</span>
      <strong className={`metric-change__value metric-change__value--${tone}`}>
        {value}
      </strong>
    </p>
  )
}
