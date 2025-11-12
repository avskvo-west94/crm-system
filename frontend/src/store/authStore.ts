import { create } from 'zustand'
import { authApi } from '../services/api'

interface User {
  id: number
  email: string
  full_name: string
  role: 'admin' | 'manager' | 'executor'
  avatar?: string
  theme: string
}

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  loadUser: () => Promise<void>
  setTheme: (theme: string) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem('token'),
  isAuthenticated: !!localStorage.getItem('token'),
  isLoading: false,

  login: async (email: string, password: string) => {
    set({ isLoading: true })
    try {
      console.log('[AUTH] Attempting login for:', email)
      const data = await authApi.login(email, password)
      console.log('[AUTH] Login successful, token received')
      localStorage.setItem('token', data.access_token)
      
      // Load user data
      console.log('[AUTH] Loading user data...')
      const user = await authApi.getCurrentUser()
      console.log('[AUTH] User data loaded:', user)
      
      set({
        token: data.access_token,
        user,
        isAuthenticated: true,
        isLoading: false,
      })
      console.log('[AUTH] Login complete!')
    } catch (error: any) {
      console.error('[AUTH] Login error:', error)
      console.error('[AUTH] Error response:', error.response)
      set({ isLoading: false })
      throw error
    }
  },

  logout: () => {
    localStorage.removeItem('token')
    set({
      user: null,
      token: null,
      isAuthenticated: false,
    })
  },

  loadUser: async () => {
    const token = localStorage.getItem('token')
    if (!token) {
      set({ isAuthenticated: false })
      return
    }

    try {
      const user = await authApi.getCurrentUser()
      set({ user, isAuthenticated: true })
    } catch (error) {
      localStorage.removeItem('token')
      set({
        user: null,
        token: null,
        isAuthenticated: false,
      })
    }
  },

  setTheme: (theme: string) => {
    set((state) => ({
      user: state.user ? { ...state.user, theme } : null,
    }))
    
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  },
}))

