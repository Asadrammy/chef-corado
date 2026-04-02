"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { signIn } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { FloatingInput } from "@/components/ui/floating-input"
import { PasswordInput } from "@/components/ui/password-input"
import { SocialButton } from "@/components/ui/social-button"
import { GradientButton } from "@/components/ui/gradient-button"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Eye, EyeOff, CheckCircle2, AlertCircle } from "lucide-react"
import Link from "next/link"
import Image from "next/image"

export default function LoginPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    remember: false
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [fieldErrors, setFieldErrors] = useState({
    email: "",
    password: ""
  })
  const [touchedFields, setTouchedFields] = useState({
    email: false,
    password: false
  })
  const [showPassword, setShowPassword] = useState(false)

  // Validation helpers
  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email.trim())
  }

  const validatePassword = (password: string) => {
    return password.trim().length >= 8
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, checked } = e.target
    const newValue = name === 'remember' ? checked : value
    
    // Update form state immediately
    setFormData(prev => ({ 
      ...prev, 
      [name]: newValue 
    }))
    
    // Clear error for this field if it has been touched and is now valid
    if (touchedFields[name as keyof typeof touchedFields]) {
      if (name === 'password' && typeof newValue === 'string' && validatePassword(newValue)) {
        setFieldErrors(prev => ({ ...prev, password: "" }))
      } else if (name === 'email' && typeof newValue === 'string' && validateEmail(newValue)) {
        setFieldErrors(prev => ({ ...prev, email: "" }))
      }
    }
  }

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name } = e.target
    
    // Mark field as touched
    setTouchedFields(prev => ({ ...prev, [name]: true }))
    
    // Get current value from the event target (latest value)
    const currentValue = e.target.value
    
    // Validate field using current value
    if (name === 'email') {
      const trimmedValue = currentValue.trim()
      if (!trimmedValue) {
        setFieldErrors(prev => ({ ...prev, email: "Email is required" }))
      } else if (!validateEmail(trimmedValue)) {
        setFieldErrors(prev => ({ ...prev, email: "Please enter a valid email" }))
      } else {
        setFieldErrors(prev => ({ ...prev, email: "" }))
      }
    } else if (name === 'password') {
      const trimmedValue = currentValue.trim()
      if (!trimmedValue) {
        setFieldErrors(prev => ({ ...prev, password: "Password is required" }))
      } else if (!validatePassword(trimmedValue)) {
        setFieldErrors(prev => ({ ...prev, password: "Password must be at least 8 characters" }))
      } else {
        setFieldErrors(prev => ({ ...prev, password: "" }))
      }
    }
  }

  const validateForm = () => {
    const errors = {
      email: "",
      password: ""
    }
    
    // Validate email using current form data
    const trimmedEmail = formData.email.trim()
    if (!trimmedEmail) {
      errors.email = "Email is required"
    } else if (!validateEmail(trimmedEmail)) {
      errors.email = "Please enter a valid email"
    }
    
    // Validate password using current form data
    const trimmedPassword = formData.password.trim()
    if (!trimmedPassword) {
      errors.password = "Password is required"
    } else if (!validatePassword(trimmedPassword)) {
      errors.password = "Password must be at least 8 characters"
    }
    
    setFieldErrors(errors)
    setTouchedFields({ email: true, password: true })
    
    return !errors.email && !errors.password
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }
    
    setLoading(true)
    setError("")

    try {
      const result = await signIn("credentials", {
        email: formData.email.trim(),
        password: formData.password.trim(),
        redirect: false,
      })

      if (result?.error) {
        setError("Invalid email or password")
        return
      }

      if (result?.ok) {
        // Fetch user session to get role and redirect appropriately
        const response = await fetch("/api/auth/session")
        const session = await response.json()
        
        if (session?.user?.role) {
          const role = session.user.role as "CLIENT" | "CHEF" | "ADMIN"
          const dashboardPath = {
            CLIENT: "/dashboard/client",
            CHEF: "/dashboard/chef", 
            ADMIN: "/dashboard/admin"
          }[role]
          
          router.push(dashboardPath)
        } else {
          router.push("/dashboard")
        }
      }
    } catch (err) {
      setError("Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen lg:h-screen flex relative overflow-hidden bg-slate-950">
      {/* Background System - Refined */}
      <div className="absolute inset-0">
        {/* Subtle radial lighting */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-pink-600/8 rounded-full blur-3xl animate-pulse delay-500" />
      </div>

      {/* Left Side - Enhanced Hero Section */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        {/* Refined gradient with visual storytelling */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/90 via-purple-600/85 to-pink-600/80 z-10" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-black/20 z-20" />
        
        {/* Subtle floating shapes for depth */}
        <div className="absolute top-20 left-20 w-32 h-32 bg-white/8 rounded-full blur-xl animate-float" />
        <div className="absolute bottom-32 right-16 w-24 h-24 bg-purple-400/15 rounded-full blur-lg animate-float-delayed" />
        <div className="absolute top-1/2 left-1/3 w-16 h-16 bg-indigo-400/10 rounded-full blur-md animate-float-slow" />
        
        {/* Background image with reduced opacity */}
        <Image
          src="/images/cover.png"
          alt="Login visual"
          fill
          className="object-cover opacity-15"
          priority
        />
        
        {/* Subtle texture overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-600/5 via-transparent to-indigo-600/5" />
        
        {/* Enhanced text overlay with better hierarchy */}
        <div className="relative z-30 flex flex-col justify-center items-center text-white p-12 text-center">
          <div className="space-y-8 animate-fadeInUp max-w-2xl">
            <h1 className="text-6xl lg:text-7xl font-bold tracking-tight bg-gradient-to-r from-white via-purple-100 to-white bg-clip-text text-transparent leading-tight">
              Welcome to Chef Marketplace
            </h1>
            <p className="text-xl lg:text-2xl text-white/95 max-w-lg leading-relaxed font-light">
              Connect with exceptional chefs and create unforgettable culinary experiences
            </p>
            <div className="flex items-center gap-3 text-white/60 text-sm font-medium">
              <div className="w-1 h-1 bg-white/40 rounded-full" />
              <span>Premium platform for culinary excellence</span>
              <div className="w-1 h-1 bg-white/40 rounded-full" />
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form with Better Balance */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 relative z-10">
        {/* Subtle overlay for visual balance */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-black/20 to-transparent pointer-events-none" />
        
        <div className="w-full max-w-lg relative">
          {/* Refined Elite Glass Card */}
          <div className="relative group">
            {/* Subtle glow effect */}
            <div className="absolute -inset-1 bg-gradient-to-r from-purple-600/10 to-indigo-600/10 rounded-3xl blur-lg group-hover:blur-xl transition-all duration-500 opacity-50" />
            
            {/* Main card with improved contrast and spacing */}
            <div className="relative backdrop-blur-xl bg-white/12 border border-white/8 shadow-2xl rounded-3xl p-10 space-y-8 animate-fadeInUp-delayed">
              {/* Enhanced Header */}
              <div className="text-center space-y-3">
                <h2 className="text-4xl font-bold text-white tracking-tight">Welcome back</h2>
                <p className="text-lg text-white/80 font-normal">Sign in to continue</p>
              </div>

              {/* Error Alert */}
              {error && (
                <div className="animate-fadeIn">
                  <Alert className="bg-red-500/8 border-red-500/20 backdrop-blur-sm">
                    <AlertCircle className="h-4 w-4 text-red-400" />
                    <AlertDescription className="text-red-200">
                      {error}
                    </AlertDescription>
                  </Alert>
                </div>
              )}

              {/* Enhanced Login Form */}
              <form className="space-y-7" onSubmit={handleSubmit}>
                <div className="space-y-6">
                  <div className="relative group/input">
                    <FloatingInput
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      placeholder="Enter your email"
                      label="Email address"
                      value={formData.email}
                      onChange={handleChange}
                      disabled={loading}
                      error={fieldErrors.email}
                      className="bg-white/8 border-white/20 text-white placeholder-white/40 focus:border-white/35 focus:ring-white/15 focus:bg-white/10 shadow-inner"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-600/12 to-indigo-600/12 rounded-xl blur-sm opacity-0 group-focus-within/input:opacity-100 transition-opacity duration-300 -z-10" />
                  </div>
                  
                  <div className="relative group/input">
                    <PasswordInput
                      id="password"
                      name="password"
                      autoComplete="current-password"
                      required
                      placeholder="Enter your password"
                      label="Password"
                      value={formData.password}
                      onChange={handleChange}
                      disabled={loading}
                      error={fieldErrors.password}
                      className="bg-white/8 border-white/20 text-white placeholder-white/40 focus:border-white/35 focus:ring-white/15 focus:bg-white/10 shadow-inner"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-600/12 to-indigo-600/12 rounded-xl blur-sm opacity-0 group-focus-within/input:opacity-100 transition-opacity duration-300 -z-10" />
                  </div>
                </div>

                {/* Enhanced Remember Me & Forgot Password */}
                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id="remember"
                      name="remember"
                      checked={formData.remember}
                      onCheckedChange={(checked) => 
                        setFormData(prev => ({ ...prev, remember: checked as boolean }))
                      }
                      disabled={loading}
                      className="border-white/25 data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600"
                    />
                    <label 
                      htmlFor="remember" 
                      className="text-sm text-white/85 cursor-pointer select-none hover:text-white transition-colors font-medium"
                    >
                      Remember me
                    </label>
                  </div>
                  <Link 
                    href="/forgot-password" 
                    className="text-sm text-purple-300 hover:text-purple-200 transition-colors font-medium"
                  >
                    Forgot password?
                  </Link>
                </div>

                {/* Refined Submit Button */}
                <div className="relative group/btn pt-2">
                  <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl blur-md group-hover/btn:blur-lg transition-all duration-300 opacity-40" />
                  <GradientButton 
                    type="submit" 
                    className="relative w-full h-12 text-base font-semibold bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-700 hover:via-indigo-700 hover:to-purple-700 transform hover:scale-[1.005] active:scale-[0.995] transition-all duration-300 shadow-lg hover:shadow-xl"
                    loading={loading}
                    disabled={loading}
                  >
                    {loading ? "Signing in..." : "Sign in"}
                  </GradientButton>
                </div>
              </form>

              {/* Refined Divider */}
              <div className="relative py-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/6" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="bg-transparent px-4 text-white/50 font-light">or continue with</span>
                </div>
              </div>

              {/* Enhanced Social Login */}
              <div className="grid grid-cols-2 gap-4">
                <div className="relative group/social">
                  <div className="absolute -inset-0.5 bg-white/8 rounded-xl blur opacity-0 group-hover/social:opacity-100 transition-opacity duration-300" />
                  <SocialButton 
                    provider="google" 
                    type="button" 
                    disabled
                    className="bg-white/8 border-white/20 text-white hover:bg-white/12 hover:border-white/30 py-3"
                  >
                    Google
                  </SocialButton>
                </div>
                <div className="relative group/social">
                  <div className="absolute -inset-0.5 bg-white/8 rounded-xl blur opacity-0 group-hover/social:opacity-100 transition-opacity duration-300" />
                  <SocialButton 
                    provider="github" 
                    type="button" 
                    disabled
                    className="bg-white/8 border-white/20 text-white hover:bg-white/12 hover:border-white/30 py-3"
                  >
                    GitHub
                  </SocialButton>
                </div>
              </div>

              {/* Enhanced Sign Up Link */}
              <div className="text-center text-sm text-white/75 pt-2">
                Don&apos;t have an account?{" "}
                <Link 
                  href="/register" 
                  className="font-semibold text-purple-300 hover:text-purple-200 transition-colors"
                >
                  Sign up
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
