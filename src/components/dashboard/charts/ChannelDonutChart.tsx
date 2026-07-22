import { EChart } from '../../charts/EChart'
import type { EChartsOption } from '../../../lib/echarts'
import { formatMetricValue } from '../../../utils/formatMetricValue'

const channels = [
  { name: '展会现场', value: 3248.99, color: '#168dff' },
  { name: '线上商城', value: 2180.32, color: '#15c5de' },
  { name: '代理分销', value: 1532.36, color: '#78c63c' },
  { name: '企业直销', value: 1024.49, color: '#8a68e8' },
  { name: '其他渠道', value: 770.16, color: '#f1a72c' },
]

const total = channels.reduce((sum, channel) => sum + channel.value, 0)

const channelDonutOption: EChartsOption = {
  animationDuration: 700,
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
      radius: ['61%', '79%'],
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

export function ChannelDonutChart() {
  return (
    <section className="chart-card channel-donut-chart" aria-labelledby="channel-donut-title">
      <header className="chart-card__header">
        <h3 id="channel-donut-title">销售额渠道占比</h3>
        <span>单位：万元</span>
      </header>

      <div className="channel-donut-chart__content">
        <div className="channel-donut-chart__graphic">
          <EChart
            option={channelDonutOption}
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
