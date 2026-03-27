import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import api from '../api/client'
import { User } from '../types'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const syncing = useRef(false)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session) {
        if (syncing.current) return
        syncing.current = true
        localStorage.setItem('pp_token', session.access_token)
        try {
          const name = session.user.user_metadata?.full_name || session.user.email || ''
          const { data } = await api.post('/auth/sync', { name })
          setUser(data)
        } catch {
          // Sync failed — still mark as logged in with basic info
          setUser({ id: '', email: session.user.email!, name: session.user.email!, role: 'ADMIN' })
        } finally {
          syncing.current = false
          setLoading(false)
        }
      } else {
        localStorage.removeItem('pp_token')
        setUser(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  const loginWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' })
    if (error) throw error
  }

  const logout = async () => {
    await supabase.auth.signOut()
    localStorage.removeItem('pp_token')
    setUser(null)
  }

  return { user, loading, login, loginWithGoogle, logout }
}
