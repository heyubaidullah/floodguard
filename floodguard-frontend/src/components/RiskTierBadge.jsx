import React from 'react'

const colors = {
  SAFE: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200',
  MEDIUM: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200',
  HIGH: 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-200',
}

export function RiskTierBadge({ tier }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${colors[tier] || 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}
    >
      {tier ?? 'UNKNOWN'}
    </span>
  )
}

