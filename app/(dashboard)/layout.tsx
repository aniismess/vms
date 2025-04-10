"use client"

import type React from "react"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Sidebar } from "@/components/sidebar"
import { useAuth } from "@/contexts/auth-context" // Removed unused UserRole import
import { Loader2 } from "lucide-react"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, role, isLoading } = useAuth() // Get role from context
  const router = useRouter()

  useEffect(() => {
    if (!isLoading) {
      // Redirect if not logged in OR if role is null/invalid
      if (!user || (role !== 'normal_admin' && role !== 'super_admin')) {
        console.log("Redirecting to login. User:", user, "Role:", role);
        router.push("/login");
      }
    }
  }, [user, role, isLoading, router]) // Add role to dependency array

  if (isLoading || !user || (role !== 'normal_admin' && role !== 'super_admin')) { // Also check role in loading/return logic
    return (
      <div className="min-h-screen bg-white">
        <div className="flex h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-sai-orange" />
        </div>
      </div>
    )
  }

  // No need for the separate !user check as it's covered above

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Pass role to Sidebar - Assuming Sidebar accepts a userRole prop */}
      <Sidebar userRole={role} />
      {/* Updated background to neutral gray */}
      <main className="flex-1 p-2 sm:p-4 md:p-6 bg-gray-50 dark:bg-gray-900 overflow-x-hidden">{children}</main>
    </div>
  )
}
