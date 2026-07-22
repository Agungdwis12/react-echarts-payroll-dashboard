import { graphic } from 'echarts/core'
import { EChart } from '../../charts/EChart'
import type { EChartsOption } from '../../../lib/echarts'

const salesTrendOption: EChartsOption = {
  animationDuration: 700,
  animationEasing: 'cubicOut',
  color: ['#23a8ff', '#4c7ff2'],
  legend: {
    top: 1,
    right: 10,
    itemWidth: 18,
    itemHeight: 3,
    itemGap: 20,
    textStyle: {
      color: '#9fb6cf',
      fontSize: 11,
    },
  },
  tooltip: {
    trigger: 'axis',
    confine: true,
    backgroundColor: 'rgba(5, 22, 40, 0.96)',
    borderColor: '#1e69a8',
    borderWidth: 1,
    padding: [9, 12],
    textStyle: {
      color: '#dcecff',
      fontSize: 12,
    },
    axisPointer: {
      type: 'line',
      lineStyle: {
        color: '#4eb8ff',
        type: 'dashed',
        opacity: 0.55,
      },
    },
    valueFormatter: (value) => `${Number(value).toLocaleString('zh-CN')} 万元`,
  },
  grid: {
    top: 38,
    right: 18,
    bottom: 30,
    left: 48,
    containLabel: false,
  },
  xAxis: {
    type: 'category',
    boundaryGap: false,
    data: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', '24:00'],
    axisLine: {
      lineStyle: { color: 'rgba(63, 115, 164, 0.42)' },
    },
    axisTick: { show: false },
    axisLabel: {
      color: '#7890a9',
      fontSize: 11,
      margin: 10,
    },
  },
  yAxis: {
    type: 'value',
    min: 0,
    max: 1200,
    interval: 200,
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: {
      color: '#7890a9',
      fontSize: 11,
      formatter: (value: number) => value === 0 ? '0' : `${value.toLocaleString('zh-CN')}万`,
    },
    splitLine: {
      lineStyle: {
        color: 'rgba(52, 104, 151, 0.2)',
      },
    },
  },
  series: [
    {
      name: '今日销售额',
      type: 'line',
      smooth: 0.35,
      showSymbol: false,
      data: [120, 250, 470, 680, 820, 910, 1000],
      lineStyle: {
        width: 2.4,
        color: '#23a8ff',
        shadowBlur: 8,
        shadowColor: 'rgba(35, 168, 255, 0.48)',
      },
      areaStyle: {
        color: new graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: 'rgba(35, 168, 255, 0.34)' },
          { offset: 1, color: 'rgba(35, 168, 255, 0.02)' },
        ]),
      },
    },
    {
      name: '昨日销售额',
      type: 'line',
      smooth: 0.35,
      showSymbol: false,
      data: [90, 180, 300, 450, 560, 730, 800],
      lineStyle: {
        width: 1.8,
        type: 'dashed',
        color: '#4c7ff2',
      },
    },
  ],
}

export function SalesTrendChart() {
  return (
    <section className="chart-card sales-trend-chart" aria-labelledby="sales-trend-title">
      <header className="chart-card__header">
        <h3 id="sales-trend-title">销售额趋势</h3>
        <span>单位：万元</span>
      </header>
      <EChart
        option={salesTrendOption}
        className="chart-card__canvas"
        ariaLabel="今日与昨日销售额折线趋势图"
      />
    </section>
  )
}
