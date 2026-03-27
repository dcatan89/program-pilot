import { useState, useEffect } from 'react'
import api from '../api/client'
import { User } from '../types'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('pp_token')
    if (!token) { setLoading(false); return }
    api.get('/auth/me')
      .then(r => setUser(r.data))
      .catch(() => localStorage.removeItem('pp_token'))
      .finally(() => setLoading(false))
  }, [])

  const login = async (email: string, password: string) => {
    const { data } = await api.post('/auth/login', { email, password })
    localStorage.setItem('pp_token', data.token)
    setUser(data.user)
    return data.user
  }

  const logout = () => {
    localStorage.removeItem('pp_token')
    setUser(null)
  }

  return { user, loading, login, logout }
}
