import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'

export type AppMode = 'demo' | 'live'

const LS_MODE_KEY = 'fg_mode'
const LS_GEMINI_KEY = 'fg_gemini_key'

type ModeContextType = {
  mode: AppMode
  setMode: (m: AppMode) => void
  geminiKey: string
  setGeminiKey: (key: string) => void
  clearGeminiKey: () => void
}

const ModeContext = createContext<ModeContextType | null>(null)

export function ModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<AppMode>(() => {
    const saved = localStorage.getItem(LS_MODE_KEY)
    return saved === 'live' ? 'live' : 'demo'
  })

  const [geminiKey, setGeminiKeyState] = useState<string>(() => {
    return localStorage.getItem(LS_GEMINI_KEY) ?? ''
  })

  function setMode(m: AppMode) {
    setModeState(m)
    localStorage.setItem(LS_MODE_KEY, m)
  }

  function setGeminiKey(key: string) {
    setGeminiKeyState(key)
    if (key.trim()) {
      localStorage.setItem(LS_GEMINI_KEY, key.trim())
    } else {
      localStorage.removeItem(LS_GEMINI_KEY)
    }
  }

  function clearGeminiKey() {
    setGeminiKeyState('')
    localStorage.removeItem(LS_GEMINI_KEY)
  }

  return (
    <ModeContext.Provider value={{ mode, setMode, geminiKey, setGeminiKey, clearGeminiKey }}>
      {children}
    </ModeContext.Provider>
  )
}

export function useMode() {
  const ctx = useContext(ModeContext)
  if (!ctx) throw new Error('useMode must be used within ModeProvider')
  return ctx
}
