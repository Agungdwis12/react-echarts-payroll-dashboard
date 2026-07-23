import { EChart } from '../../charts/EChart'
import type { EChartsOption } from '../../../lib/echarts'
import type { ChannelData } from '../../../types/dashboard'
import { formatMetricValue } from '../../../utils/formatMetricValue'

function createChannelDonutOption(channels: ChannelData[]): EChartsOption {
  return {
    animationDuration: 700,
    animationDurationUpdate: 480,
    tooltip: {
      trigger: 'item',
      confine: true,
      formatter: '{b}<br/>{c} 万元 · {d}%',
      backgroundColor: 'rgba(5, 22, 40, 0.96)',
      borderColor: '#1e69a8',
      borderWidth: 1,
      padding: [9, 12],
      textStyle: {
        color: '#dcecff',
        fontSize: 12,
      },
    },
    series: [
      {
        name: '销售额渠道占比',
        type: 'pie',
        radius: ['62%', '86%'],
        center: ['50%', '50%'],
        minAngle: 4,
        avoidLabelOverlap: true,
        label: { show: false },
        labelLine: { show: false },
        itemStyle: {
          borderColor: '#07182b',
          borderWidth: 2,
        },
        emphasis: {
          scaleSize: 5,
        },
        data: channels.map(({ name, value, color }) => ({
          name,
          value,
          itemStyle: { color },
        })),
      },
    ],
  }
}

type ChannelDonutChartProps = {
  channels: ChannelData[]
}

export function ChannelDonutChart({ channels }: ChannelDonutChartProps) {
  const total = channels.reduce((sum, channel) => sum + channel.value, 0)

  return (
    <section className="chart-card channel-donut-chart" aria-labelledby="channel-donut-title">
      <header className="chart-card__header">
        <h3 id="channel-donut-title">销售额渠道占比</h3>
        <span>单位：万元</span>
      </header>

      <div className="channel-donut-chart__content">
        <div className="channel-donut-chart__graphic">
          <EChart
            option={createChannelDonutOption(channels)}
            className="chart-card__canvas"
            ariaLabel="五类销售渠道占比环形图"
          />
          <div className="channel-donut-chart__total" aria-hidden="true">
            <strong>{formatMetricValue(total, 2)}</strong>
            <span>销售总额</span>
          </div>
        </div>

        <ul className="channel-legend" aria-label="渠道销售额明细">
          {channels.map((channel) => (
            <li key={channel.name}>
              <span className="channel-legend__dot" style={{ '--channel-color': channel.color } as React.CSSProperties} />
              <span className="channel-legend__name">{channel.name}</span>
              <strong>{formatMetricValue(channel.value, 2)}</strong>
              <span>{((channel.value / total) * 100).toFixed(1)}%</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
