"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { Loader2, Mail, Lock, Eye, EyeOff, User } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

export default function SignupPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const { signup } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    if (password !== confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match.",
        variant: "destructive",
      })
      setIsLoading(false)
      return
    }

    try {
      await signup(email, password)
      toast({
        title: "Account created!",
        description: "Your account has been created successfully.",
      })
      router.push("/dashboard")
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create account. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sai-orange/5 via-white to-sai-orange/5 dark:from-gray-900 dark:via-gray-950 dark:to-gray-900">
      <div className="container relative min-h-screen flex-col items-center justify-center grid lg:max-w-none lg:grid-cols-2 lg:px-0">
        {/* Left side - Image and Quote */}
        <div className="relative hidden h-full flex-col bg-muted p-10 text-white lg:flex dark:border-r">
          <div className="absolute inset-0 bg-gradient-to-br from-sai-orange/90 to-sai-orange-dark/90" />
          <div className="relative z-20 flex items-center justify-center h-full">
            <div className="text-center space-y-8">
              <div className="relative w-40 h-40 mx-auto">
                <Image
                  src="https://ssssompcg.org/assets/images/sd5-464x464.jpg"
                  alt="Sri Sathya Sai Logo"
                  width={160}
                  height={160}
                  className="object-cover rounded-full border-4 border-white/30 shadow-2xl hover:border-white/50 transition-all duration-300"
                  priority
                />
              </div>
              <div className="space-y-4">
                <h2 className="text-4xl font-bold font-playfair tracking-wide bg-clip-text text-transparent bg-gradient-to-r from-white to-white/80">
                  Sri Sathya Sai Seva Organisations
                </h2>
                <p className="text-xl font-medium text-white/90">
                  Love All Serve All
                </p>
                <p className="text-lg font-medium text-white/80">
                  Make a Difference
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-white/70 italic">
                  "Service to man is service to God"
                </p>
                <p className="text-sm font-medium text-white/80">
                  - Sri Sathya Sai Baba
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right side - Signup Form */}
        <div className="lg:p-8">
          <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
            <div className="flex flex-col space-y-2 text-center">
              <h1 className="text-2xl font-semibold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-sai-orange to-sai-orange-dark">
                Create an account
              </h1>
              <p className="text-sm text-muted-foreground">
                Enter your details to create your account
              </p>
            </div>

            <div className="grid gap-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                  <div className="relative group">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground group-focus-within:text-sai-orange transition-colors" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-9 border-sai-orange/20 focus:border-sai-orange/40 focus:ring-1 focus:ring-sai-orange/20 transition-colors"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                  <div className="relative group">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground group-focus-within:text-sai-orange transition-colors" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-9 pr-9 border-sai-orange/20 focus:border-sai-orange/40 focus:ring-1 focus:ring-sai-orange/20 transition-colors"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-muted-foreground hover:text-sai-orange transition-colors"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-sm font-medium">Confirm Password</Label>
                  <div className="relative group">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground group-focus-within:text-sai-orange transition-colors" />
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-9 pr-9 border-sai-orange/20 focus:border-sai-orange/40 focus:ring-1 focus:ring-sai-orange/20 transition-colors"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-3 text-muted-foreground hover:text-sai-orange transition-colors"
                      aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
                <div>
                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-to-r from-sai-orange to-sai-orange-dark hover:from-sai-orange-dark hover:to-sai-orange transition-all duration-300 shadow-lg hover:shadow-sai-orange/20" 
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating account...
                      </>
                    ) : (
                      "Create account"
                    )}
                  </Button>
                </div>
              </form>
            </div>

            <p className="px-8 text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-medium text-sai-orange hover:text-sai-orange-dark transition-colors"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
} 