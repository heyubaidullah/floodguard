import { useEffect, useState } from 'react'


export function useToast() {
    const [msg, setMsg] = useState<string | null>(null)
    const [type, setType] = useState<'ok' | 'err'>('ok')
    const toast = (m: string, t: 'ok' | 'err' = 'ok') => { setMsg(m); setType(t) }
    const dismiss = () => setMsg(null)
    return { msg, type, toast, dismiss }
}


export default function Toast({ msg, type, onClose }: { msg: string, type: 'ok' | 'err', onClose: () => void }) {
    useEffect(() => { const t = setTimeout(onClose, 2200); return () => clearTimeout(t) }, [msg])
    return (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl text-white shadow-lg ${type === 'ok' ? 'bg-emerald-500' : 'bg-rose-500'}`}>
            {msg}
        </div>
    )
}