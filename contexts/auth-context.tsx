"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { User } from "@supabase/supabase-js"

export type UserRole = 'normal_admin' | 'super_admin' | null;

interface AuthContextType {
  user: User | null
  role: UserRole
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  signup: (email: string, password: string) => Promise<any>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  isLoading: true,
  login: async () => {},
  signup: async () => {},
  logout: async () => {},
})

const fetchUserRole = async (userId: string): Promise<UserRole> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        console.log(`No profile found for user ${userId}. Assigning null role.`);
        return null;
      } else {
        console.error('Error fetching user role:', error);
        return null;
      }
    }

    if (data?.role === 'normal_admin' || data?.role === 'super_admin') {
      return data.role;
    }
    console.warn('Invalid or missing role found for user:', userId);
    return null;
  } catch (err) {
    console.error('Exception fetching user role:', err);
    return null;
  }
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [role, setRole] = useState<UserRole>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    let isMounted = true;

    const checkSessionAndFetchRole = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (!isMounted) return;

        if (error) {
          console.error("Error getting session:", error);
          setUser(null);
          setRole(null);
        } else if (session?.user) {
          setUser(session.user);
          const userRole = await fetchUserRole(session.user.id);
          if (isMounted) {
            setRole(userRole);
          }
        } else {
          setUser(null);
          setRole(null);
        }
      } catch (e) {
         console.error("Exception in checkSessionAndFetchRole:", e);
         if (isMounted) {
            setUser(null);
            setRole(null);
         }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    checkSessionAndFetchRole();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;

      if (event === "TOKEN_REFRESHED" && session === null) {
        console.error("Token refresh failed. Forcing logout.");
        queueMicrotask(() => {
          if (isMounted) {
             logout();
          }
        });
        return;
      }

      const currentUser = session?.user ?? null;
      let userRole: UserRole = null;

      if (currentUser) {
        try {
          userRole = await fetchUserRole(currentUser.id);
        } catch (e) {
           console.error("Exception fetching role on auth change:", e);
           userRole = null;
        }
      }

      if (isMounted) {
         setUser(currentUser);
         setRole(userRole);
         setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    }
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      console.log('Attempting login with email:', email);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Login error:', error);
        throw new Error(error.message || 'Authentication failed');
      }

      if (!data?.user) {
        console.error('No user data returned from Supabase');
        throw new Error('Authentication failed: No user data returned');
      }

      console.log('Login successful for user:', data.user.email);

      const userRole = await fetchUserRole(data.user.id);

      setUser(data.user);
      setRole(userRole);

    } catch (error: any) {
      console.error('Login process error:', error);
      setUser(null);
      setRole(null);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }

  const signup = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      if (error) throw error;
      return data;
    } catch (error: any) {
      throw error;
    }
  }

  const logout = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
          console.error('Logout error:', error);
          throw error;
      }
      setUser(null);
      setRole(null);
      router.push('/login');
    } catch (error: any) {
      console.error('Logout process error:', error);
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, role, isLoading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  return useContext(AuthContext)
}
