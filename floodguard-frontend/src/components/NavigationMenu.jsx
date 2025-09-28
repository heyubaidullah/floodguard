import React from 'react'
import { cn } from '../lib/utils.js'

export default function NavigationMenu({ sections, activeId, onNavigate, orientation = 'vertical', className }) {
  const containerClass = cn(
    'flex gap-1',
    orientation === 'vertical' ? 'flex-col' : 'flex-row',
    orientation === 'horizontal' ? 'overflow-x-auto pb-1' : null,
    className
  )

  return (
    <nav className={containerClass} aria-label="Primary">
      {sections.map((section) => {
        const isActive = activeId === section.id
        return (
          <button
            key={section.id}
            type="button"
            onClick={() => onNavigate(section)}
            className={cn(
              'group inline-flex items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-medium transition',
              isActive
                ? 'bg-brand-100 text-brand-900 shadow-sm dark:bg-brand-500/20 dark:text-brand-100'
                : 'text-slate-600 hover:bg-slate-200/70 dark:text-slate-300 dark:hover:bg-slate-800'
            )}
          >
            <span
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-lg border text-base',
                isActive
                  ? 'border-transparent bg-white text-brand-600 shadow-sm dark:bg-slate-900 dark:text-brand-100'
                  : 'border-slate-200 bg-white text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400'
              )}
              aria-hidden="true"
            >
              <section.icon className="h-4 w-4" />
            </span>
            <span>{section.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
