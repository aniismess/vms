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
      if (error.code === 'PGRST116') {
        console.log(`No profile found for user ${userId}. Assigning null role.`);
        return null;
      } else {
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
    let isMounted = true; // Prevent state updates on unmounted component

    const checkSessionAndFetchRole = async () => {
      // Don't set isLoading true here initially, let the first run finish
      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (!isMounted) return;

        if (error) {
          console.error("Error getting session:", error);
          setUser(null);
          setRole(null);
        } else if (session?.user) {
          setUser(session.user); // Set user first
          const userRole = await fetchUserRole(session.user.id);
          if (isMounted) {
            setRole(userRole); // Then set role
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
        // Only set loading false after the initial check is complete
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    checkSessionAndFetchRole();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!isMounted) return;
      setIsLoading(true); // Start loading when auth state changes
      const currentUser = session?.user ?? null;
      let userRole: UserRole = null;

      if (currentUser) {
        try {
          userRole = await fetchUserRole(currentUser.id);
        } catch (e) {
           console.error("Exception fetching role on auth change:", e);
           userRole = null; // Ensure role is null on error
        }
      }

      // Set user and role together after role fetch (or if user is null)
      if (isMounted) {
        setUser(currentUser);
        setRole(userRole);
        setIsLoading(false); // Finish loading after state is updated
      }
    });

    return () => {
      isMounted = false; // Cleanup flag
      subscription.unsubscribe();
    }
  }, []); // Keep dependencies empty

  const login = async (email: string, password: string) => {
    setIsLoading(true); // Indicate loading during login process
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

      // Fetch role immediately after successful sign-in
      const userRole = await fetchUserRole(data.user.id);

      // Set user and role state together AFTER role is fetched
      // This will trigger the onAuthStateChange listener as well,
      // but setting state here ensures the context is updated faster
      // for immediate UI changes if needed, while onAuthStateChange handles persistence.
      setUser(data.user);
      setRole(userRole);
      // No explicit redirect needed here, layout effect handles it based on state

    } catch (error: any) {
      console.error('Login process error:', error);
      // Clear state on failure
      setUser(null);
      setRole(null);
      throw error; // Re-throw for the login page to handle
    } finally {
      // Set loading false after login attempt completes (success or failure)
      // The onAuthStateChange listener might set it again, which is fine.
      setIsLoading(false);
    }
  }

  const signup = async (email: string, password: string) => {
    // Signup doesn't usually log the user in immediately or assign a role
    // It depends on your email verification flow.
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      if (error) throw error;
      return data; // Return data which might include user info (but usually unconfirmed)
    } catch (error: any) {
      throw error;
    }
  }

  const logout = async () => {
    setIsLoading(true); // Indicate loading during logout
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
          console.error('Logout error:', error);
          throw error; // Throw if signout itself fails
      }
      // Clear state explicitly here for immediate UI feedback
      setUser(null);
      setRole(null);
      router.push('/login'); // Redirect after state is cleared
    } catch (error: any) {
      console.error('Logout process error:', error);
      // Optionally show a toast message for logout failure
    } finally {
        setIsLoading(false); // Ensure loading is false after logout attempt
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
