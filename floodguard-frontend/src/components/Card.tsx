import { motion } from 'framer-motion'
import { type ReactNode } from 'react'

type CardProps = {
  title?: string
  actions?: ReactNode
  children: ReactNode
  className?: string
}

export default function Card({ title, actions, children, className }: CardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      className={`rounded-2xl border border-slate-200 bg-white/80 shadow-sm transition-shadow hover:shadow-lg hover:shadow-emerald-500/10 dark:border-slate-800 dark:bg-slate-900/70 ${className ?? ''}`}
    >
      {title && (
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
          <div className="flex gap-2 text-slate-500 dark:text-slate-300">{actions}</div>
        </div>
      )}
      <div className="px-5 pb-5 text-slate-700 dark:text-slate-200">{children}</div>
    </motion.div>
  )
}
