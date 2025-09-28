import React, { useId, useMemo } from 'react'

export default function Sparkline({ data = [], color = '#2196f3', height = 40, width = 120 }) {
  const path = useMemo(() => buildPath(data, width, height), [data, width, height])
  const generatedId = useId()
  const gradientId = `${generatedId}-gradient`

  if (!data || data.length === 0) {
    return <div className="h-10 w-full rounded-xl bg-slate-100 dark:bg-slate-800" />
  }

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-16 w-full" role="img" aria-hidden="true">
      <defs>
        <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.4" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={path.area} fill={`url(#${gradientId})`} opacity="0.65" />
      <path d={path.line} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}

function buildPath(values, width, height) {
  if (!values || values.length === 0) {
    return { line: '', area: '' }
  }

  const max = Math.max(...values)
  const min = Math.min(...values)
  const range = max - min || 1
  const step = width / Math.max(values.length - 1, 1)

  let line = ''
  let area = ''

  values.forEach((value, index) => {
    const x = index * step
    const y = height - ((value - min) / range) * height
    if (index === 0) {
      line = `M ${x},${y}`
      area = `M ${x},${height} L ${x},${y}`
    } else {
      line += ` L ${x},${y}`
      area += ` L ${x},${y}`
    }
  })

  const lastX = (values.length - 1) * step
  area += ` L ${lastX},${height} Z`

  return { line, area }
}
