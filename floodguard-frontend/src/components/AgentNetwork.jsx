import React from 'react'
import { Activity, ArrowUpRight, CircuitBoard, Infinity, Radio } from 'lucide-react'
import { cn } from '../lib/utils.js'

function AgentCard({ agent }) {
  const Icon = agent.icon || Activity
  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-4 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-900/80">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{agent.id}</p>
          <h4 className="mt-1 text-base font-semibold text-slate-800 dark:text-slate-100">{agent.title}</h4>
        </div>
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100 text-brand-700 dark:bg-brand-500/20 dark:text-brand-100">
          <Icon className="h-5 w-5" />
        </span>
      </div>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">{agent.description}</p>
      <div className="mt-3 flex items-center justify-between text-xs text-slate-400 dark:text-slate-500">
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-300">
          <Infinity className="h-3 w-3" /> loop
        </span>
        <span>{agent.cadence}</span>
      </div>
    </div>
  )
}

export default function AgentNetwork({ orchestrator, lanes = [], channels = [] }) {
  return (
    <section
      id="agents"
      className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-brand-50 via-white to-slate-100 p-6 shadow-sm transition dark:border-slate-800 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950"
    >
      <div className="absolute inset-0 pointer-events-none opacity-50 [background-image:radial-gradient(circle_at_20%_20%,rgba(33,150,243,0.15),transparent_55%),radial-gradient(circle_at_80%_0%,rgba(14,116,144,0.15),transparent_55%)]" />

      <div className="relative">
        <header className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
              Parallel agent mesh
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
              Agents stream insights simultaneously via the A2A bus. The orchestrator loops through
              each lane to reconcile outputs and trigger ops.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-200/70 bg-white/70 px-3 py-1.5 text-xs font-medium text-brand-700 shadow-sm backdrop-blur dark:border-brand-500/40 dark:bg-slate-900 dark:text-brand-100">
            <Radio className="h-4 w-4" /> A2A protocol
          </div>
        </header>

        {orchestrator && (
          <div className="mt-6 flex justify-center">
            <div className="relative rounded-3xl border border-slate-200 bg-white p-5 shadow-lg dark:border-slate-700 dark:bg-slate-900">
              <span className="absolute inset-x-8 -bottom-2 h-1 rounded-full bg-gradient-to-r from-brand-200 via-brand-400 to-brand-200 blur-sm dark:from-brand-500/40 dark:via-brand-400/60 dark:to-brand-500/40" />
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-500 text-white shadow-lg shadow-brand-500/30">
                  <CircuitBoard className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-brand-600 dark:text-brand-200">
                    {orchestrator.id}
                  </p>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    {orchestrator.title}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-300">{orchestrator.description}</p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-400 dark:text-slate-500">
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  <Infinity className="h-3 w-3" /> continuous loop
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-brand-100 px-2 py-0.5 font-medium text-brand-700 dark:bg-brand-500/20 dark:text-brand-100">
                  <ArrowUpRight className="h-3 w-3" /> fan-out orchestration
                </span>
                <span>{orchestrator.cadence}</span>
              </div>
            </div>
          </div>
        )}

        <div className="relative mt-14 grid gap-4 md:grid-cols-3">
          <div className="pointer-events-none absolute left-1/2 top-[-3.5rem] hidden h-[6.5rem] w-1 -translate-x-1/2 rounded-full bg-gradient-to-b from-brand-300 via-brand-400 to-transparent opacity-80 md:block" />
          {lanes.map((lane) => (
            <div
              key={lane.id}
              className={cn(
                'relative flex flex-col gap-3 rounded-3xl border border-slate-200/70 bg-white/80 p-4 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-900/80',
                lane.highlight && 'ring-1 ring-brand-300/60 dark:ring-brand-500/30'
              )}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    {lane.name}
                  </p>
                  <h4 className="text-base font-semibold text-slate-800 dark:text-slate-100">
                    {lane.subtitle}
                  </h4>
                </div>
                {lane.badge && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-700 dark:bg-brand-500/20 dark:text-brand-100">
                    {lane.badge}
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-300">{lane.description}</p>
              <div className="grid gap-3">
                {lane.agents.map((agent) => (
                  <AgentCard key={agent.id} agent={agent} />
                ))}
              </div>
            </div>
          ))}
        </div>

        {channels.length > 0 && (
          <footer className="mt-8 grid gap-3 md:grid-cols-3">
            {channels.map((channel) => (
              <div
                key={channel.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
              >
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                  {channel.icon}
                  {channel.id}
                </div>
                <p className="mt-2 font-medium text-slate-800 dark:text-slate-100">
                  {channel.title}
                </p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">{channel.description}</p>
              </div>
            ))}
          </footer>
        )}
      </div>
    </section>
  )
}

