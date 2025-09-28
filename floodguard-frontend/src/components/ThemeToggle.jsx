import React from 'react'
import { MoonStar, Sun } from 'lucide-react'
import { cn } from '../lib/utils.js'

export default function ThemeToggle({ isDark, onToggle, className }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        'inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800',
        className
      )}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-200">
        {isDark ? <MoonStar className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
      </span>
      {isDark ? 'Dark' : 'Light'}
    </button>
  )
}
