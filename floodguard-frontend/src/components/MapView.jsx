import React from 'react'

export default function MapView() {
  // Phase 4: swap this placeholder for Mapbox GL using VITE_MAPBOX_TOKEN
  return (
    <div className="grid h-96 place-items-center rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-slate-100 shadow-sm dark:border-slate-800 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900">
      <div className="max-w-lg px-8 text-center text-slate-600 dark:text-slate-300">
        <p className="text-lg font-semibold text-slate-700 dark:text-slate-100">Interactive map coming soon</p>
        <p className="mt-2 text-sm">
          Integrate Mapbox with `VITE_MAPBOX_TOKEN` to visualize Miami flood-prone zones, live incidents,
          and real-time risk overlays powered by the agent mesh.
        </p>
      </div>
    </div>
  )
}
