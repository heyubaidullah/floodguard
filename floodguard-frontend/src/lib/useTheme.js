import { useEffect, useMemo, useState } from 'react'

const STORAGE_KEY = 'floodguard-theme'

const getPreferredTheme = () => {
  if (typeof window === 'undefined') {
    return 'light'
  }

  const stored = safeGetItem(STORAGE_KEY)
  if (stored === 'light' || stored === 'dark') {
    return stored
  }

  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches
  return prefersDark ? 'dark' : 'light'
}

const safeSetItem = (key, value) => {
  try {
    window.localStorage.setItem(key, value)
  } catch (_) {
    // ignore write errors in private mode
  }
}

function safeGetItem(key) {
  try {
    return window.localStorage.getItem(key)
  } catch (_) {
    return null
  }
}

export function useTheme() {
  const [theme, setTheme] = useState(getPreferredTheme)

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
    safeSetItem(STORAGE_KEY, theme)
  }, [theme])

  useEffect(() => {
    const media = window.matchMedia?.('(prefers-color-scheme: dark)')
    if (!media) return

    const listener = (event) => {
      setTheme(event.matches ? 'dark' : 'light')
    }

    media.addEventListener?.('change', listener)
    return () => media.removeEventListener?.('change', listener)
  }, [])

  const toggleTheme = useMemo(() => () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))
  }, [])

  return {
    theme,
    isDark: theme === 'dark',
    setTheme,
    toggleTheme,
  }
}

