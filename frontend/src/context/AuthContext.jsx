import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../services/supabase'
import { getCurrentUser, loginUser, logoutUser, registerUser, updatePassword } from '../services/authApi'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [recovering, setRecovering] = useState(false)

  useEffect(() => {
    getCurrentUser().then(setUser).catch(() => setUser(null)).finally(() => setLoading(false))
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setRecovering(true)
      if (event === 'SIGNED_OUT') setUser(null)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  const value = {
    user, loading, recovering,
    login: async (email, password) => setUser(await loginUser(email, password)),
    register: async (details) => setUser(await registerUser(details)),
    logout: async () => { await logoutUser(); setUser(null) },
    finishRecovery: async (pw) => { await updatePassword(pw); await logoutUser(); setUser(null); setRecovering(false) },
  }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)