"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/contexts/auth-context"
import { LoaderCircle, Mail, Lock, Eye, EyeOff, AlertCircle, Loader2 } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { Checkbox } from "@/components/ui/checkbox"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

export default function LoginPage() {
  const router = useRouter()
  const { user, isLoading, login } = useAuth()
  const { toast } = useToast()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [errorType, setErrorType] = useState<'email' | 'password' | null>(null)

  useEffect(() => {
    // Check for saved credentials
    const savedEmail = localStorage.getItem("rememberedEmail")
    if (savedEmail) {
      setEmail(savedEmail)
      setRememberMe(true)
    }

    if (user) {
      router.push("/dashboard")
    }
  }, [user, router])

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPassword = e.target.value
    setPassword(newPassword)
    setError(null)
    setErrorType(null)
  }

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEmail = e.target.value
    setEmail(newEmail)
    setError(null)
    setErrorType(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setErrorType(null)
    setIsSubmitting(true)

    try {
      await login(email, password)
      
      // Handle remember me
      if (rememberMe) {
        localStorage.setItem("rememberedEmail", email)
      } else {
        localStorage.removeItem("rememberedEmail")
      }

      toast({
        title: "Success!",
        description: "Welcome back! Redirecting to dashboard...",
      })
      router.push("/dashboard")
    } catch (err: any) {
      console.error("Login error:", err)
      
      if (err?.message === "Invalid login credentials") {
        setErrorType('password')
        setError("Invalid email or password")
        toast({
          title: "Login Failed",
          description: "Invalid email or password. Please try again.",
          variant: "destructive",
        })
      } else if (err?.message === "Unauthorized access. Admin privileges required.") {
        setError("This account does not have admin privileges")
        toast({
          title: "Access Denied",
          description: "This account does not have admin privileges.",
          variant: "destructive",
        })
      } else {
        setError("An unexpected error occurred")
        toast({
          title: "Error",
          description: "Something went wrong. Please try again later.",
          variant: "destructive",
        })
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading || isSubmitting) {
    return (
      <div className="flex h-screen items-center justify-center bg-muted/40">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center space-y-4"
        >
          <LoaderCircle className="h-8 w-8 animate-spin text-sai-orange" data-testid="loading-spinner" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </motion.div>
      </div>
    )
  }

  if (user) {
    return null // Will redirect in useEffect
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="w-full max-w-[400px] border-sai-orange/20 shadow-lg">
          <CardHeader className="space-y-1">
            <div className="flex justify-center mb-4">
              <motion.div
                whileHover={{ scale: 1.05 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <Image
                  src="https://ssssompcg.org/assets/images/sd5-464x464.jpg"
                  alt="SSSSO Logo"
                  width={80}
                  height={80}
                  className="rounded-full"
                />
              </motion.div>
            </div>
            <CardTitle className="text-2xl text-center">Welcome Back</CardTitle>
            <CardDescription className="text-center">
              Sign in to access the volunteer management system
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className={cn(
                    "absolute left-3 top-3 h-4 w-4",
                    errorType === 'email' ? "text-red-500" : "text-muted-foreground"
                  )} />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={handleEmailChange}
                    className={cn(
                      "pl-9",
                      errorType === 'email' && "border-red-500 focus-visible:ring-red-500"
                    )}
                    required
                  />
                </div>
                {errorType === 'email' && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-sm text-red-500 flex items-center gap-1"
                  >
                    <AlertCircle className="h-4 w-4" />
                    {error}
                  </motion.p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className={cn(
                    "absolute left-3 top-3 h-4 w-4",
                    errorType === 'password' ? "text-red-500" : "text-muted-foreground"
                  )} />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={handlePasswordChange}
                    className={cn(
                      "pl-9 pr-9",
                      errorType === 'password' && "border-red-500 focus-visible:ring-red-500"
                    )}
                    required
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
                {errorType === 'password' && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-sm text-red-500 flex items-center gap-1"
                  >
                    <AlertCircle className="h-4 w-4" />
                    {error}
                  </motion.p>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="remember"
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                />
                <Label htmlFor="remember" className="text-sm text-muted-foreground">
                  Remember me
                </Label>
              </div>
              {error && !errorType && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-sm text-red-500 flex items-center gap-1 bg-red-50 p-2 rounded"
                >
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </motion.p>
              )}
              <Button
                type="submit"
                className="w-full bg-sai-orange hover:bg-sai-orange-dark"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                Don't have an account?{" "}
                <Link href="/signup" className="text-sai-orange hover:text-sai-orange-dark">
                  Sign up
                </Link>
              </p>
            </CardContent>
          </form>
          <CardFooter className="flex flex-col space-y-2 text-center text-sm text-muted-foreground">
            <p>Need help? Contact your administrator</p>
            <Link 
              href="/forgot-password" 
              className="text-sai-orange hover:text-sai-orange-dark transition-colors duration-200"
            >
              Forgot password?
            </Link>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  )
}

