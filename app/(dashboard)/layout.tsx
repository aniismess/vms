"use client"

import type React from "react"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Sidebar } from "@/components/sidebar"
import { useAuth } from "@/contexts/auth-context"
import { Loader2 } from "lucide-react"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, role, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading) {
      if (!user || (role !== 'normal_admin' && role !== 'super_admin')) {
        console.log("Redirecting to login. User:", user, "Role:", role);
        router.push("/login");
      }
    }
  }, [user, role, isLoading, router])

  if (isLoading || !user || (role !== 'normal_admin' && role !== 'super_admin')) {
    return (
      <div className="min-h-screen bg-white">
        <div className="flex h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-sai-orange" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Sidebar userRole={role} />
      <main className="flex-1 p-2 sm:p-4 md:p-6 bg-gray-50 dark:bg-gray-900 overflow-x-hidden">{children}</main>
    </div>
  )
}
