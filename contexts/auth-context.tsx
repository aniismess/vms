"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { User } from "@supabase/supabase-js"

interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  signup: (email: string, password: string) => Promise<any>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  login: async () => {},
  signup: async () => {},
  logout: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Check active sessions and sets the user
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setIsLoading(false)
    })

    // Listen for changes on auth state (logged in, signed out, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null)
      setIsLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const login = async (email: string, password: string) => {
    try {
      console.log('Attempting login with email:', email)
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        console.error('Login error:', error)
        throw new Error(error.message || 'Authentication failed')
      }

      if (!data?.user) {
        console.error('No user data returned from Supabase')
        throw new Error('Authentication failed: No user data returned')
      }

      // Check if user exists in admin_users table
      const { data: adminData, error: adminError } = await supabase
        .from('admin_users')
        .select('id')
        .eq('id', data.user.id)
        .single()

      if (adminError) {
        console.error('Admin check error:', adminError)
        await supabase.auth.signOut()
        throw new Error('Error checking admin privileges')
      }

      if (!adminData) {
        console.error('User not found in admin_users table')
        await supabase.auth.signOut()
        throw new Error('Unauthorized access. Admin privileges required.')
      }

      console.log('Login successful for user:', data.user.email)
      setUser(data.user)
      router.refresh()
    } catch (error: any) {
      console.error('Login process error:', error)
      throw error
    }
  }

  const signup = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            is_admin: true
          }
        }
      })

      if (error) throw error

      if (data.user) {
        // Add to admin_users table
        const { error: adminError } = await supabase
          .from('admin_users')
          .insert([
            {
              id: data.user.id,
              email: data.user.email
            }
          ])

        if (adminError) {
          // If failed to add to admin_users, delete the auth user
          await supabase.auth.admin.deleteUser(data.user.id)
          throw adminError
        }
      }

      return data
    } catch (error: any) {
      throw error
    }
  }

  const logout = async () => {
    try {
      await supabase.auth.signOut()
      setUser(null)
      router.push('/login')
    } catch (error: any) {
      throw error
    }
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  return useContext(AuthContext)
}

