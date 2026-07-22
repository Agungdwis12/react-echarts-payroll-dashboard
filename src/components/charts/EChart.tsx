import { useEffect, useRef } from 'react'
import {
  echarts,
  type EChartsOption,
  type EChartsType,
} from '../../lib/echarts'

type EChartProps = {
  option: EChartsOption
  className?: string
  ariaLabel: string
}

export function EChart({ option, className, ariaLabel }: EChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<EChartsType | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const chart = echarts.init(container, null, { renderer: 'canvas' })
    const resizeObserver = new ResizeObserver(() => chart.resize())

    chartRef.current = chart
    resizeObserver.observe(container)

    return () => {
      resizeObserver.disconnect()
      chart.dispose()
      chartRef.current = null
    }
  }, [])

  useEffect(() => {
    chartRef.current?.setOption(option, { notMerge: true })
  }, [option])

  return (
    <div
      ref={containerRef}
      className={className}
      role="img"
      aria-label={ariaLabel}
    />
  )
}
