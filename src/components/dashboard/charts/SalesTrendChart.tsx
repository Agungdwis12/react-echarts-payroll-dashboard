import { graphic } from 'echarts/core'
import { EChart } from '../../charts/EChart'
import type { EChartsOption } from '../../../lib/echarts'
import type { SalesTrendData } from '../../../types/dashboard'

function createSalesTrendOption(data: SalesTrendData): EChartsOption {
  const largestValue = Math.max(...data.current, ...data.previous)
  const paddedMaximum = largestValue * 1.15
  const magnitude = 10 ** Math.floor(Math.log10(paddedMaximum))
  const interval = magnitude / 5
  const axisMaximum = Math.ceil(paddedMaximum / interval) * interval

  return {
    animationDuration: 700,
    animationDurationUpdate: 480,
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
        fontSize: 12,
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
      left: 52,
      containLabel: false,
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: data.categories,
      axisLine: {
        lineStyle: { color: 'rgba(63, 115, 164, 0.42)' },
      },
      axisTick: { show: false },
      axisLabel: {
        color: '#7890a9',
        fontSize: 12,
        margin: 10,
      },
    },
    yAxis: {
      type: 'value',
      min: 0,
      max: axisMaximum,
      splitNumber: 5,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: '#7890a9',
        fontSize: 12,
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
        name: data.currentLabel,
        type: 'line',
        smooth: 0.35,
        showSymbol: false,
        data: data.current,
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
        name: data.previousLabel,
        type: 'line',
        smooth: 0.35,
        showSymbol: false,
        data: data.previous,
        lineStyle: {
          width: 1.8,
          type: 'dashed',
          color: '#4c7ff2',
        },
      },
    ],
  }
}

type SalesTrendChartProps = {
  data: SalesTrendData
}

export function SalesTrendChart({ data }: SalesTrendChartProps) {
  return (
    <section className="chart-card sales-trend-chart" aria-labelledby="sales-trend-title">
      <header className="chart-card__header">
        <h3 id="sales-trend-title">销售额趋势</h3>
        <span>单位：万元</span>
      </header>
      <EChart
        option={createSalesTrendOption(data)}
        className="chart-card__canvas"
        ariaLabel={`${data.currentLabel}与${data.previousLabel}折线趋势图`}
      />
    </section>
  )
}
