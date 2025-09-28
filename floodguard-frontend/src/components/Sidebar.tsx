import { type ReactNode } from 'react'
import { X } from 'lucide-react'

type SidebarProps = {
  controls: ReactNode
  alerts: ReactNode
  isOpen: boolean
  onClose: () => void
}

export default function Sidebar({ controls, alerts, isOpen, onClose }: SidebarProps) {
  return (
    <>
      <aside
        className={`
          hidden xl:flex xl:flex-col xl:w-[360px] 2xl:w-[400px] shrink-0
          h-full overflow-y-auto border-l px-4 py-5 gap-4
          bg-white/70 dark:bg-slate-900/70 backdrop-blur
          border-slate-200 dark:border-slate-800
        `}
      >
        {controls}
        {alerts}
      </aside>

      <div
        className={`
          xl:hidden fixed inset-0 z-40 transition ${isOpen ? 'pointer-events-auto' : 'pointer-events-none'}
        `}
      >
        <div
          className={`absolute inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}
          onClick={onClose}
        />
        <aside
          className={`absolute inset-y-0 right-0 flex w-[320px] max-w-[85vw] flex-col gap-4
            bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800
            px-4 py-5 shadow-2xl dark:shadow-[none]
            transition-transform duration-300 ease-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Operations</h2>
            <button
              onClick={onClose}
              className="rounded-full border border-slate-200 dark:border-slate-700 p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Close panel"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="overflow-y-auto -mr-2 pr-2 flex-1 flex flex-col gap-4">
            {controls}
            {alerts}
          </div>
        </aside>
      </div>
    </>
  )
}
