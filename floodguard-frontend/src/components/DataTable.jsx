import React from 'react'

export default function DataTable({ columns, rows, emptyMessage = 'No records yet.' }) {
  if (!rows || rows.length === 0) {
    return <p className="text-sm text-slate-500 dark:text-slate-300">{emptyMessage}</p>
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 shadow-sm dark:border-slate-800">
      <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
        <thead className="bg-slate-50/80 dark:bg-slate-900/60">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300"
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white/70 backdrop-blur dark:divide-slate-800 dark:bg-slate-900/60">
          {rows.map((row) => (
            <tr key={row.id || JSON.stringify(row)} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/60">
              {columns.map((column) => (
                <td key={column.key} className="px-4 py-3 text-sm text-slate-700 dark:text-slate-200 align-top">
                  {column.render ? column.render(row) : renderFallback(row[column.key])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function renderFallback(value) {
  if (value === null || value === undefined || value === '') {
    return <span className="text-slate-400 dark:text-slate-500">—</span>
  }
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No'
  }
  if (typeof value === 'object') {
    return JSON.stringify(value)
  }
  return value
}

