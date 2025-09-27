import React, { useEffect, useState } from 'react'
import { api } from './lib/api.js'
import MapView from './components/MapView.jsx'

export default function App() {
  const [backendVersion, setBackendVersion] = useState(null)
  const [opsResult, setOpsResult] = useState(null)

  // Fetch backend version on load
  useEffect(() => {
    api.get('/version')
      .then((res) => setBackendVersion(res.data))
      .catch(() => {})
  }, [])

  const runCycle = async () => {
    const res = await api.post('/ops/run')
    setOpsResult(res.data)
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">🌊 FloodGuard</h1>
        <button
          onClick={runCycle}
          className="px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700"
        >
          Run Cycle
        </button>
      </header>

      <MapView />

      <section className="bg-white p-4 rounded-2xl border border-slate-200">
        <h2 className="font-semibold mb-2">Backend</h2>
        <pre className="text-xs bg-slate-50 p-3 rounded-xl overflow-auto">
{JSON.stringify(backendVersion, null, 2)}
        </pre>
      </section>

      {opsResult && (
        <section className="bg-white p-4 rounded-2xl border border-slate-200">
          <h2 className="font-semibold mb-2">Last Run Result</h2>
          <pre className="text-xs bg-slate-50 p-3 rounded-xl overflow-auto">
{JSON.stringify(opsResult, null, 2)}
          </pre>
        </section>
      )}
    </div>
  )
}
