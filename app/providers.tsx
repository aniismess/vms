"use client"

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from "next-themes"
import { AuthProvider } from "@/contexts/auth-context"
import { Toaster } from "@/components/ui/toaster"
// Removed useEffect, useState import

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 30 * 60 * 1000, // 30 minutes
    },
  },
})

export function Providers({ children }: { children: React.ReactNode }) {
  // Removed mounted state and useEffect

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          {/* Removed conditional rendering wrapper */}
          {children}
          <Toaster />
        </AuthProvider>
      </QueryClientProvider>
      {/* Removed loading block */}
    </ThemeProvider>
  )
}
