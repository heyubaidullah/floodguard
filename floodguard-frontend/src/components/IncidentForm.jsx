import React, { useState } from 'react'
import { api } from '../lib/api.js'

const initialState = {
  type: 'drain',
  zone: 'Miami Beach',
  description: '',
  photoUrl: '',
}

export default function IncidentForm({ onCreated }) {
  const [form, setForm] = useState(initialState)
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState(null)

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!form.description.trim()) {
      setError(new Error('Description is required'))
      return
    }

    setStatus('submitting')
    setError(null)

    try {
      await api.post('/incidents/report', {
        type: form.type,
        description: form.description.trim(),
        zone: form.zone.trim(),
        photoUrl: form.photoUrl.trim() || null,
      })
      setStatus('success')
      setForm(initialState)
      onCreated?.()
    } catch (err) {
      setStatus('error')
      setError(err)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-inner dark:border-slate-800 dark:bg-slate-950/40"
    >
      <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-200">Log a new incident</h3>

      <div className="mt-4 grid gap-3 text-sm">
        <label className="flex flex-col gap-1 text-slate-600 dark:text-slate-300">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">Type</span>
          <select
            name="type"
            value={form.type}
            onChange={handleChange}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-brand-400 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            <option value="drain">Drain sensor</option>
            <option value="citizen">Citizen report</option>
          </select>
        </label>

        <label className="flex flex-col gap-1 text-slate-600 dark:text-slate-300">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">Zone</span>
          <input
            name="zone"
            value={form.zone}
            onChange={handleChange}
            placeholder="e.g. Brickell"
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-brand-400 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          />
        </label>

        <label className="flex flex-col gap-1 text-slate-600 dark:text-slate-300">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">Description</span>
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            rows={4}
            placeholder="Brief details about the incident"
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-brand-400 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          />
        </label>

        <label className="flex flex-col gap-1 text-slate-600 dark:text-slate-300">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">Photo URL (optional)</span>
          <input
            name="photoUrl"
            value={form.photoUrl}
            onChange={handleChange}
            placeholder="https://"
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-brand-400 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          />
        </label>
      </div>

      {status === 'error' && (
        <p className="mt-3 text-xs text-rose-600 dark:text-rose-300">
          {error?.response?.data?.error || error?.message || 'Unable to submit incident'}
        </p>
      )}

      {status === 'success' && (
        <p className="mt-3 text-xs text-emerald-600 dark:text-emerald-300">Incident recorded</p>
      )}

      <button
        type="submit"
        disabled={status === 'submitting'}
        className="mt-4 inline-flex w-full justify-center rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:bg-brand-300"
      >
        {status === 'submitting' ? 'Submitting…' : 'Submit incident'}
      </button>
    </form>
  )
}
