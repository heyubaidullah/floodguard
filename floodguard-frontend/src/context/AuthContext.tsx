import { createContext, useContext, useState, type ReactNode } from 'react'

type AuthContextType = {
  isAuthenticated: boolean
  userEmail: string | null
  login: (email: string, password: string) => boolean
  logout: () => void
}

const DEMO_EMAIL = 'admin@nws.gov'
const DEMO_PASSWORD = 'FloodGuard2025'

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)

  function login(email: string, password: string): boolean {
    if (email === DEMO_EMAIL && password === DEMO_PASSWORD) {
      setIsAuthenticated(true)
      setUserEmail(email)
      return true
    }
    return false
  }

  function logout() {
    setIsAuthenticated(false)
    setUserEmail(null)
    // Clear any stored BYOK Gemini key on logout for security
    localStorage.removeItem('fg_gemini_key')
    localStorage.removeItem('fg_mode')
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, userEmail, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
