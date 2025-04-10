"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { User } from "@supabase/supabase-js"

// Define possible roles
export type UserRole = 'normal_admin' | 'super_admin' | null;

interface AuthContextType {
  user: User | null
  role: UserRole // Add role to context type
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  signup: (email: string, password: string) => Promise<any>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null, // Add role default
  isLoading: true,
  login: async () => {},
  signup: async () => {},
  logout: async () => {},
})

// Helper function to fetch user role
const fetchUserRole = async (userId: string): Promise<UserRole> => {
  try {
    const { data, error } = await supabase
      .from('profiles') // Assuming a 'profiles' table
      .select('role')
      .eq('id', userId) // Assuming 'id' column links to auth.users.id
      .single();

    // Handle errors, specifically the case where no profile row exists
    if (error) {
      // If the error is "No rows found", it's not a critical error, just means no profile/role yet.
      if (error.code === 'PGRST116') { 
        console.log(`No profile found for user ${userId}. Assigning null role.`);
        return null; 
      } else {
        // Log other errors as actual problems
        console.error('Error fetching user role:', error);
        return null;
      }
    }
    
    // Validate the role fetched from the database
    if (data?.role === 'normal_admin' || data?.role === 'super_admin') {
      return data.role;
    }
    console.warn('Invalid or missing role found for user:', userId);
    return null; // Return null if role is invalid or not found
  } catch (err) {
    console.error('Exception fetching user role:', err);
    return null;
  }
};


export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [role, setRole] = useState<UserRole>(null) // Add role state
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const checkSessionAndFetchRole = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.error("Error getting session:", error);
        setUser(null);
        setRole(null);
      } else if (session?.user) {
        setUser(session.user);
        const userRole = await fetchUserRole(session.user.id);
        setRole(userRole);
      } else {
        setUser(null);
        setRole(null);
      }
      setIsLoading(false);
    };

    checkSessionAndFetchRole();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        const userRole = await fetchUserRole(currentUser.id);
        setRole(userRole);
      } else {
        setRole(null); // Clear role on logout
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []); // Removed router from dependencies as it's stable

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

      console.log('Login successful for user:', data.user.email);
      setUser(data.user);
      // Fetch and set role after successful login
      const userRole = await fetchUserRole(data.user.id);
      setRole(userRole);
      // No need for router.refresh(), state updates will trigger re-render
    } catch (error: any) {
      console.error('Login process error:', error);
      setRole(null); // Clear role on login failure
      throw error
    }
  }

  const signup = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      })

      if (error) throw error
      return data
    } catch (error: any) {
      throw error
    }
  }

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setRole(null); // Clear role on logout
      router.push('/login'); // Redirect to login after logout
    } catch (error: any) {
      console.error('Logout error:', error);
      // Optionally show a toast message for logout failure
      throw error; // Re-throw if needed elsewhere
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
