import React from 'react'
import { AlertTriangle, BellRing, CheckCircle2, Leaf } from 'lucide-react'
import { RiskTierBadge } from './RiskTierBadge.jsx'

export default function AlertSpotlight({ alert, climateScore }) {
  return (
    <section className="grid gap-4 md:grid-cols-2">
      <div className="relative overflow-hidden rounded-3xl border border-rose-200/70 bg-gradient-to-br from-rose-50 via-white to-orange-50 p-5 shadow-sm dark:border-rose-500/20 dark:from-rose-950 dark:via-slate-900 dark:to-amber-950">
        <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_top,rgba(251,191,36,0.6),transparent_60%)]" />
        <div className="relative">
          <header className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-500 text-white shadow-lg shadow-rose-500/30">
              <BellRing className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-rose-500 dark:text-rose-200">
                Live alert spotlight
              </p>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                {alert ? alert.message : 'No critical alerts'}
              </h3>
            </div>
          </header>
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-200">
            {alert
              ? 'Agents escalated this insight for rapid response across operations and public channels.'
              : 'Agents are monitoring Miami neighborhoods in the background. You will see urgent alerts here when thresholds trip.'}
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-3 text-xs">
            {alert ? (
              <>
                <RiskTierBadge tier={alert.riskTier} />
                <span className="inline-flex items-center gap-1 rounded-full bg-white/80 px-3 py-1 font-medium text-rose-600 shadow-sm dark:bg-slate-900/80 dark:text-rose-200">
                  <AlertTriangle className="h-3.5 w-3.5" /> audience: {alert.audience}
                </span>
              </>
            ) : (
              <span className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 font-medium text-emerald-600 shadow-sm dark:bg-slate-900/80 dark:text-emerald-200">
                <CheckCircle2 className="h-4 w-4" /> System nominal
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-3xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50 via-white to-sky-50 p-5 shadow-sm dark:border-emerald-500/20 dark:from-emerald-950 dark:via-slate-900 dark:to-sky-950">
        <div className="absolute inset-0 opacity-25 [background-image:radial-gradient(circle_at_30%_20%,rgba(16,185,129,0.5),transparent_45%),radial-gradient(circle_at_80%_0%,rgba(59,130,246,0.4),transparent_50%)]" />
        <div className="relative flex h-full flex-col">
          <header className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/30">
              <Leaf className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-500 dark:text-emerald-200">
                Climate action impact
              </p>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Sustainability score
              </h3>
            </div>
          </header>
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-200">
            Coordinated agents keep waterways clear and communities safe. Success is measured by
            reduced flood risk and timely community outreach.
          </p>
          <div className="mt-5 flex items-end gap-4">
            <div>
              <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-200">
                {climateScore?.toFixed?.(1) ?? '82'}
              </p>
              <p className="text-xs uppercase tracking-wide text-slate-400">impact index</p>
            </div>
            <div className="h-16 flex-1 rounded-2xl bg-white/60 p-1 shadow-inner dark:bg-slate-900/70">
              <div
                className="h-full rounded-xl bg-gradient-to-r from-emerald-400 via-brand-400 to-sky-400 text-[0px]"
                style={{ width: `${Math.min(100, Math.max(25, climateScore ?? 82))}%` }}
              >
                .
              </div>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-300">
            <span className="rounded-full bg-white/80 px-3 py-1 shadow-sm dark:bg-slate-900/80">Drain debris cleared: 68%</span>
            <span className="rounded-full bg-white/80 px-3 py-1 shadow-sm dark:bg-slate-900/80">Community alerts acknowledged: 92%</span>
          </div>
        </div>
      </div>
    </section>
  )
}
