type SparklineProps = {
  values: number[]
}

const WIDTH = 92
const HEIGHT = 34
const PADDING = 2

export function Sparkline({ values }: SparklineProps) {
  if (values.length < 2) return null

  const minimum = Math.min(...values)
  const maximum = Math.max(...values)
  const range = maximum - minimum || 1
  const step = (WIDTH - PADDING * 2) / (values.length - 1)
  const points = values
    .map((value, index) => {
      const x = PADDING + index * step
      const y = HEIGHT - PADDING - ((value - minimum) / range) * (HEIGHT - PADDING * 2)
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')

  return (
    <svg className="sparkline" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} aria-hidden="true">
      <polygon points={`${PADDING},${HEIGHT} ${points} ${WIDTH - PADDING},${HEIGHT}`} />
      <polyline points={points} />
    </svg>
  )
}
