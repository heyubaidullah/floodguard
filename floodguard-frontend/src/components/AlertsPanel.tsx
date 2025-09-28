import { useEffect, useState } from 'react'
import Card from './Card'
import { getAlerts } from '../api'
import { Clipboard, Download } from 'lucide-react'


function download(filename: string, text: string) {
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = filename; a.click()
    URL.revokeObjectURL(url)
}


export default function AlertsPanel() {
    const [alerts, setAlerts] = useState<any[]>([])


    async function load() { setAlerts(await getAlerts()) }
    useEffect(() => { load() }, [])


    return (
        <Card title="Alerts">
            <ul className="space-y-3">
                {alerts.slice().reverse().slice(0, 12).map(a => (
                    <li key={a.id} className="rounded-xl border border-slate-200 bg-white/80 p-3 transition hover:border-emerald-200 hover:bg-emerald-50 dark:border-slate-800 dark:bg-slate-900/70 dark:hover:border-emerald-500/40 dark:hover:bg-emerald-500/10">
                        <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">{a.audience}</div>
                        <div className="mt-1 text-sm text-slate-700 dark:text-slate-200">{a.message}</div>
                        <div className="mt-2 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                            <button className="flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 transition hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800" onClick={() => navigator.clipboard.writeText(a.message)}>
                                <Clipboard className="w-3.5 h-3.5" /> Copy
                            </button>
                            <button className="flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 transition hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800" onClick={() => download(`alert-${a.id}.txt`, a.message)}>
                                <Download className="w-3.5 h-3.5" /> Download
                            </button>
                            <span className="ml-auto text-slate-400 dark:text-slate-500">{new Date(a.createdAt).toLocaleTimeString()}</span>
                        </div>
                    </li>
                ))}
                {alerts.length === 0 && <div className="text-sm text-slate-500 dark:text-slate-400">No alerts yet. Run a cycle.</div>}
            </ul>
        </Card>
    )
}
