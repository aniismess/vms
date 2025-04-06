"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/use-toast"
import { supabase } from "@/lib/supabase"
import { Loader2, Shield, Eye, EyeOff, Mail, Lock, AlertCircle, Clock, RefreshCw, X } from "lucide-react"
import { motion } from "framer-motion"
import { useAuth } from "@/contexts/auth-context"
import { Label } from "@/components/ui/label"
import { formatDistanceToNow } from "date-fns"
import { createHash, randomBytes } from 'crypto'
import { createAdminSchema, adminUserSchema, pendingAdminUserSchema } from '@/lib/validations/admin'

interface Admin {
  id: string
  email: string
  created_at: string
  created_by?: string
}

// Add email tracking
const EMAIL_LIMIT_KEY = 'gmail_daily_email_count'
const EMAIL_LIMIT_DATE_KEY = 'gmail_count_date'
const DAILY_EMAIL_LIMIT = 500

// Function to check and update email count
const checkEmailLimit = () => {
  const today = new Date().toDateString()
  const lastDate = localStorage.getItem(EMAIL_LIMIT_DATE_KEY)
  const count = Number(localStorage.getItem(EMAIL_LIMIT_KEY) || 0)

  if (lastDate !== today) {
    localStorage.setItem(EMAIL_LIMIT_DATE_KEY, today)
    localStorage.setItem(EMAIL_LIMIT_KEY, '0')
    return true
  }

  return count < DAILY_EMAIL_LIMIT
}

// Function to increment email count
const incrementEmailCount = () => {
  const count = Number(localStorage.getItem(EMAIL_LIMIT_KEY) || 0)
  localStorage.setItem(EMAIL_LIMIT_KEY, String(count + 1))
}

// Add new interface for pending admins
interface PendingAdmin {
  email: string
  created_by: string
  created_by_email?: string
  created_at: string
  expires_at: string
  confirmation_token: string
}

// Add these utility functions
const hashPassword = async (password: string): Promise<string> => {
  return createHash('sha256').update(password).digest('hex')
}

const generateToken = (): string => {
  return randomBytes(32).toString('hex')
}

export default function AdminsPage() {
  const [admins, setAdmins] = useState<Admin[]>([])
  const [pendingAdmins, setPendingAdmins] = useState<PendingAdmin[]>([])
  const [newAdminEmail, setNewAdminEmail] = useState("")
  const [newAdminPassword, setNewAdminPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isAddingAdmin, setIsAddingAdmin] = useState(false)
  const [isLoadingPending, setIsLoadingPending] = useState(true)
  const { toast } = useToast()
  const { user } = useAuth()

  const fetchAdmins = async () => {
    try {
      const { data, error } = await supabase
        .from("admin_users")
        .select("*")
        .order("created_at", { ascending: true })

      if (error) throw error

      // Validate admin data using Zod
      const validatedAdmins = data.map(admin => {
        const result = adminUserSchema.safeParse(admin)
        if (!result.success) {
          console.error('Invalid admin data:', result.error)
          return null
        }
        return result.data
      }).filter(Boolean) as Admin[]

      setAdmins(validatedAdmins)
    } catch (error: any) {
      console.error("Error fetching admins:", error)
      toast({
        title: "Error",
        description: "Could not fetch admin users. Please try again.",
        duration: 4000,
      })
    } finally {
      setIsLoading(false)
    }
  }

  const fetchPendingAdmins = async () => {
    try {
      const { data, error } = await supabase
        .from('pending_admin_users')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      // Validate pending admin data using Zod
      const validatedPendingAdmins = data.map(pending => {
        const result = pendingAdminUserSchema.safeParse(pending)
        if (!result.success) {
          console.error('Invalid pending admin data:', result.error)
          return null
        }
        return result.data
      }).filter(Boolean) as PendingAdmin[]

      setPendingAdmins(validatedPendingAdmins)
    } catch (error) {
      console.error('Error fetching pending admins:', error)
      toast({
        title: "Error",
        description: "Failed to fetch pending admin requests",
        variant: "destructive",
      })
    } finally {
      setIsLoadingPending(false)
    }
  }

  useEffect(() => {
    fetchAdmins()
    fetchPendingAdmins()

    // Set up real-time subscription for both tables
    const adminChannel = supabase
      .channel("admin_users_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "admin_users",
        },
        () => {
          fetchAdmins()
        }
      )
      .subscribe()

    const pendingChannel = supabase
      .channel("pending-admin-changes")
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'pending_admin_users' 
        },
        () => {
          fetchPendingAdmins()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(adminChannel)
      pendingChannel.unsubscribe()
    }
  }, [])

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const validatePassword = (password: string) => {
    return password.length >= 6
  }

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsAddingAdmin(true)

    // Check email limit
    if (!checkEmailLimit()) {
      toast({
        title: "Email Limit Reached",
        description: "Daily Gmail sending limit reached. Please try again tomorrow.",
        variant: "destructive",
      })
      setIsAddingAdmin(false)
      return
    }

    // Validate input using Zod
    const validationResult = createAdminSchema.safeParse({
      email: newAdminEmail,
      password: newAdminPassword
    })

    if (!validationResult.success) {
      toast({
        title: "Invalid Input",
        description: validationResult.error.errors[0].message,
        variant: "destructive",
      })
      setIsAddingAdmin(false)
      return
    }

    try {
      // Check if email already exists in admin_users or pending_admin_users
      const [{ data: existingAdmin }, { data: pendingAdmin }] = await Promise.all([
        supabase
          .from("admin_users")
          .select("email")
          .eq("email", newAdminEmail)
          .single(),
        supabase
          .from("pending_admin_users")
          .select("email")
          .eq("email", newAdminEmail)
          .single()
      ])

      if (existingAdmin) {
        toast({
          title: "Error",
          description: "This email is already registered as an admin.",
          variant: "destructive",
        })
        setIsAddingAdmin(false)
        return
      }

      if (pendingAdmin) {
        toast({
          title: "Error",
          description: "This email is already pending confirmation.",
          variant: "destructive",
        })
        setIsAddingAdmin(false)
        return
      }

      // Generate confirmation token
      const confirmationToken = generateToken()

      // Add to pending_admin_users table
      const { error: pendingError } = await supabase
        .from("pending_admin_users")
        .insert({
          email: newAdminEmail,
          password: await hashPassword(newAdminPassword),
          created_by: user?.id,
          confirmation_token: confirmationToken,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        })

      if (pendingError) throw pendingError

      // Send confirmation email to current admin
      const response = await fetch('/api/admin/send-confirmation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: newAdminEmail,
          token: confirmationToken,
          adminEmail: user?.email
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to send confirmation email')
      }

      // If successful, increment email count
      incrementEmailCount()

      toast({
        title: "Success",
        description: "Admin invitation sent. Please check your email for confirmation.",
        duration: 4000,
      })

      // Show remaining emails
      const remainingEmails = DAILY_EMAIL_LIMIT - Number(localStorage.getItem(EMAIL_LIMIT_KEY) || 0)
      toast({
        title: "Email Limit Status",
        description: `${remainingEmails} emails remaining for today`,
        duration: 2000,
      })

      setNewAdminEmail("")
      setNewAdminPassword("")
    } catch (error: any) {
      console.error("Error adding admin:", error)
      toast({
        title: "Error",
        description: error.message || "Could not add admin. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsAddingAdmin(false)
    }
  }

  const handleRemoveAdmin = async (adminId: string) => {
    try {
      // Check if trying to remove self
      if (adminId === user?.id) {
        toast({
          title: "Error",
          description: "You cannot remove yourself as an admin.",
          duration: 4000,
        })
        return
      }

      // Check if this is the last admin
      const { count } = await supabase
        .from("admin_users")
        .select("*", { count: "exact" })

      if (count === 1) {
        toast({
          title: "Error",
          description: "Cannot remove the last admin user.",
          duration: 4000,
        })
        return
      }

      // Remove from admin_users table
      const { error: removeError } = await supabase
        .from("admin_users")
        .delete()
        .eq("id", adminId)

      if (removeError) throw removeError

      toast({
        title: "Success",
        description: "Admin removed successfully.",
        duration: 3000,
      })
    } catch (error: any) {
      console.error("Error removing admin:", error)
      toast({
        title: "Error",
        description: "Could not remove admin. Please try again.",
        duration: 4000,
      })
    }
  }

  const handleResendConfirmation = async (email: string) => {
    try {
      const response = await fetch('/api/admin/resend-confirmation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      if (!response.ok) {
        throw new Error('Failed to resend confirmation')
      }

      toast({
        title: "Success",
        description: "Confirmation email has been resent.",
      })
    } catch (error) {
      console.error('Error resending confirmation:', error)
      toast({
        title: "Error",
        description: "Failed to resend confirmation email.",
        variant: "destructive",
      })
    }
  }

  const handleCancelPending = async (email: string) => {
    try {
      const { error } = await supabase
        .from('pending_admin_users')
        .delete()
        .eq('email', email)

      if (error) throw error

      toast({
        title: "Success",
        description: "Admin invitation has been cancelled.",
      })
    } catch (error) {
      console.error('Error cancelling invitation:', error)
      toast({
        title: "Error",
        description: "Failed to cancel admin invitation.",
        variant: "destructive",
      })
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center space-y-4"
        >
          <Loader2 className="h-8 w-8 animate-spin text-sai-orange" />
          <p className="text-sm text-muted-foreground">Loading admin data...</p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="border-sai-orange/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-sai-orange" />
              Admin Management
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <Mail className="h-4 w-4" />
                {DAILY_EMAIL_LIMIT - Number(localStorage.getItem(EMAIL_LIMIT_KEY) || 0)} emails remaining today
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddAdmin} className="space-y-4 mb-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="New admin email"
                      value={newAdminEmail}
                      onChange={(e) => setNewAdminEmail(e.target.value)}
                      className="pl-9"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="New admin password"
                      value={newAdminPassword}
                      onChange={(e) => setNewAdminPassword(e.target.value)}
                      className="pl-9 pr-9"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  <p className="text-sm text-muted-foreground">Must be at least 6 characters</p>
                </div>
              </div>
              <Button 
                type="submit" 
                disabled={isAddingAdmin}
                className="w-full bg-sai-orange hover:bg-sai-orange-dark"
              >
                {isAddingAdmin ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding Admin...
                  </>
                ) : (
                  "Add Admin"
                )}
              </Button>
            </form>

            <div className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl font-semibold flex items-center gap-2">
                    <Clock className="h-5 w-5 text-yellow-500" />
                    Pending Admin Confirmations
                  </CardTitle>
                  <CardDescription>
                    Admins waiting for email confirmation
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingPending ? (
                    <div className="flex justify-center py-4">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : pendingAdmins.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground">
                      No pending admin confirmations
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {pendingAdmins.map((pending) => (
                        <div
                          key={pending.email}
                          className="flex items-center justify-between p-4 rounded-lg border bg-muted/50"
                        >
                          <div className="flex items-center gap-4">
                            <div className="h-8 w-8 rounded-full bg-yellow-500/20 flex items-center justify-center">
                              <Clock className="h-4 w-4 text-yellow-500" />
                            </div>
                            <div>
                              <p className="font-medium">{pending.email}</p>
                              <p className="text-sm text-muted-foreground">
                                Added by: {pending.created_by_email || 'Unknown'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm text-muted-foreground">
                              Expires: {formatDistanceToNow(new Date(pending.expires_at))}
                            </p>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleResendConfirmation(pending.email)}
                              className="text-yellow-500 hover:text-yellow-600"
                            >
                              <RefreshCw className="h-4 w-4" />
                              <span className="sr-only">Resend confirmation</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCancelPending(pending.email)}
                              className="text-red-500 hover:text-red-600"
                            >
                              <X className="h-4 w-4" />
                              <span className="sr-only">Cancel invitation</span>
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Existing admins section */}
            <div className="mt-8">
              <h3 className="text-lg font-semibold mb-4">Active Admins</h3>
              <div className="space-y-4">
                {admins.map((admin) => (
                  <div
                    key={admin.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{admin.email}</p>
                      <p className="text-sm text-muted-foreground">
                        Added: {new Date(admin.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      variant="destructive"
                      onClick={() => handleRemoveAdmin(admin.id)}
                      disabled={admin.id === user?.id}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
} 