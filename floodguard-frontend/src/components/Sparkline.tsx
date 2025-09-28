import { useId, useMemo } from 'react'

type SparklineProps = {
  data: number[]
  width?: number
  height?: number
  className?: string
  gradientFrom?: string
  gradientTo?: string
  stroke?: string
}

export default function Sparkline({
  data,
  width = 120,
  height = 48,
  className,
  gradientFrom = 'rgba(16, 185, 129, 0.25)',
  gradientTo = 'rgba(16, 185, 129, 0.02)',
  stroke = '#10b981',
}: SparklineProps) {
  const gradientId = useId()

  const { path, area } = useMemo(() => {
    if (!data || data.length === 0) {
      return { path: '', area: '' }
    }

    const max = Math.max(...data)
    const min = Math.min(...data)
    const range = max - min || 1

    const points = data.map((value, index) => {
      const x = data.length === 1 ? width : (index / (data.length - 1)) * width
      const norm = (value - min) / range
      const y = height - norm * height
      return [Number.isFinite(x) ? x : 0, Number.isFinite(y) ? y : height] as const
    })

    const line = points.map(([x, y], idx) => `${idx === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`).join(' ')

    const areaPath = points.length
      ? `${line} L ${width} ${height} L 0 ${height} Z`
      : ''

    return { path: line, area: areaPath }
  }, [data, height, width])

  if (!data || data.length === 0) {
    return (
      <div className={className}>
        <div className="h-full w-full rounded-lg border border-dashed border-slate-300/60 dark:border-slate-700" />
      </div>
    )
  }

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className={className}
      role="img"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={gradientFrom} />
          <stop offset="100%" stopColor={gradientTo} />
        </linearGradient>
      </defs>
      {area && <path d={area} fill={`url(#${gradientId})`} />}
      {path && (
        <path
          d={path}
          fill="none"
          stroke={stroke}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </svg>
  )
}
