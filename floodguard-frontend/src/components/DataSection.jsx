import React from 'react'

const statusCopy = {
  idle: 'Idle',
  loading: 'Loading…',
  ready: '',
  error: 'Failed to load',
}

export default function DataSection({
  title,
  description,
  status = 'idle',
  error = null,
  onRefresh,
  children,
  id,
}) {
  const copy = statusCopy[status] ?? ''

  return (
    <section
      id={id}
      className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/80"
    >
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
          {description && (
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">{description}</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {copy && (
            <span
              className={
                status === 'error'
                  ? 'text-sm font-medium text-rose-600'
                  : 'text-sm text-slate-400 dark:text-slate-500'
              }
            >
              {copy}
            </span>
          )}
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="rounded-full border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Refresh
            </button>
          )}
        </div>
      </header>

      <div className="mt-4">
        {status === 'error' ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-600 dark:border-rose-700/60 dark:bg-rose-950/30 dark:text-rose-200">
            {error?.response?.data?.error || error?.message || 'Something went wrong'}
          </div>
        ) : (
          children
        )}
      </div>
    </section>
  )
}

