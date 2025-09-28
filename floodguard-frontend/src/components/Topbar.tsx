import { useState } from 'react'
import { Activity, Menu, Moon, PanelsTopLeft, Sun, X } from 'lucide-react'

type NavItem = {
  id: string
  label: string
}

type TopbarProps = {
  theme: 'light' | 'dark'
  onToggleTheme: () => void
  onTogglePanel: () => void
  sections: NavItem[]
}

export default function Topbar({ theme, onToggleTheme, onTogglePanel, sections }: TopbarProps) {
  const [navOpen, setNavOpen] = useState(false)

  const handleNavClick = (id: string) => {
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
    setNavOpen(false)
  }

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <button
            className="inline-flex lg:hidden items-center justify-center rounded-full border border-slate-200 dark:border-slate-800 p-2 text-slate-600 dark:text-slate-300"
            onClick={() => setNavOpen(o => !o)}
            aria-label="Toggle navigation"
          >
            {navOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
            <Activity className="h-5 w-5 text-emerald-500" />
            <div className="text-base font-semibold">FloodGuard</div>
            <span className="hidden text-xs font-medium text-slate-400 sm:inline">Operations Console</span>
          </div>
        </div>

        <nav className="hidden lg:flex items-center gap-2">
          {sections.map(item => (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className="rounded-full border border-transparent px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 dark:text-slate-300 dark:hover:border-emerald-500/40 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-300"
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <button
            onClick={onToggleTheme}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/60 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:border-emerald-300 hover:text-emerald-600 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200 dark:hover:border-emerald-500/50 dark:hover:text-emerald-300"
          >
            {theme === 'light' ? (
              <>
                <Moon className="h-4 w-4" /> Night
              </>
            ) : (
              <>
                <Sun className="h-4 w-4" /> Day
              </>
            )}
          </button>

          <button
            onClick={onTogglePanel}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:border-emerald-300 hover:text-emerald-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-emerald-500/40 dark:hover:text-emerald-300 xl:hidden"
          >
            <PanelsTopLeft className="h-4 w-4" /> Ops
          </button>
        </div>
      </div>

      {navOpen && (
        <div className="lg:hidden">
          <div className="px-4 pb-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-lg dark:border-slate-800 dark:bg-slate-900">
              {sections.map(item => (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-emerald-50 hover:text-emerald-700 dark:text-slate-200 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-300"
                >
                  {item.label}
                  <span className="text-xs text-slate-400">View</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
