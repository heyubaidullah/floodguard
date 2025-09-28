import React from 'react'

export default function StatCard({ label, value, status = 'ready', hint, footer }) {
  let display = value
  if (status === 'loading') {
    display = '—'
  }
  if (status === 'error') {
    display = '⚠️'
  }

  return (
    <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white/90 p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/80">
      <div className="absolute inset-x-3 top-3 h-12 rounded-3xl bg-gradient-to-r from-brand-100/60 via-transparent to-brand-100/60 blur-lg dark:from-brand-500/10 dark:to-brand-500/10" />
      <div className="relative">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {label}
        </p>
        <p className="mt-3 text-3xl font-semibold text-slate-900 dark:text-slate-100">{display}</p>
        {hint && <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{hint}</p>}
        {footer && <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">{footer}</div>}
      </div>
    </div>
  )
}

