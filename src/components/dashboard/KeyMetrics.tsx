import type { KeyMetricData } from '../../types/dashboard'
import { metricIconMap } from './metricIconMap'
import { PanelHeader } from './PanelHeader'
import { CompactMetricCard } from './metrics/CompactMetricCard'

type KeyMetricsProps = {
  metrics: KeyMetricData[] | null
}

export function KeyMetrics({ metrics }: KeyMetricsProps) {
  return (
    <section className="panel key-metrics" aria-labelledby="key-metrics-title">
      <PanelHeader
        id="key-metrics-title"
        title="关键数据"
        meta={metrics ? undefined : '正在等待数据'}
      />

      <div className="metrics-grid">
        {metrics
          ? metrics.map(({ id, icon, ...metric }) => (
              <CompactMetricCard key={id} icon={metricIconMap[icon]} {...metric} />
            ))
          : Array.from({ length: 6 }, (_, index) => (
              <div className="compact-metric-card skeleton-card" key={index} aria-hidden="true" />
            ))}
      </div>
    </section>
  )
}
