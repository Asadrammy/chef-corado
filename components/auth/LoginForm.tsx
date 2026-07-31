"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useSearchParams } from "next/navigation"
import { signIn } from "next-auth/react"
import { AlertCircle, ArrowRight, LockKeyhole, Sparkles } from "lucide-react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type LoginFormProps = {
  onToggleMode?: () => void
}

export function LoginForm({ onToggleMode }: LoginFormProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [fieldErrors, setFieldErrors] = useState({
    email: "",
    password: "",
  })
  const [touchedFields, setTouchedFields] = useState({
    email: false,
    password: false,
  })
  const bannedMessage = searchParams.get("banned") === "1"
    ? "This account has been suspended. Contact support if you believe this was a mistake."
    : ""
  const requestedRole = searchParams.get("role")
  const callbackUrl = searchParams.get("callbackUrl")
  const safeCallbackUrl = callbackUrl?.startsWith("/") && !callbackUrl.startsWith("//") ? callbackUrl : ""
  const roleCopy = requestedRole === "CHEF"
    ? {
        heading: "Chef Login",
        description: "Sign in to manage requests, proposals, menus, bookings, compliance, messages, and payouts.",
        signupHref: "/register?role=CHEF",
      }
    : requestedRole === "CLIENT"
      ? {
          heading: "Customer Login",
          description: "Sign in to create requests, compare chef proposals, manage bookings, and continue conversations.",
          signupHref: "/register?role=CLIENT",
        }
      : requestedRole === "ADMIN"
        ? {
            heading: "Admin Login",
            description: "Sign in with an authorized admin account to review marketplace operations, approvals, and payments.",
            signupHref: "",
          }
      : {
          heading: "Welcome back",
          description: "Sign in to access the right workspace for your account.",
          signupHref: "/register",
        }
  const isAdminLogin = requestedRole === "ADMIN"
  const signupHref =
    roleCopy.signupHref && safeCallbackUrl
      ? `${roleCopy.signupHref}${roleCopy.signupHref.includes("?") ? "&" : "?"}callbackUrl=${encodeURIComponent(safeCallbackUrl)}`
      : roleCopy.signupHref

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email.trim())
  }

  const validatePassword = (password: string) => {
    return password.trim().length >= 6
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))

    if (touchedFields[name as keyof typeof touchedFields]) {
      if (name === "email") {
        const trimmedValue = value.trim()
        if (!trimmedValue) {
          setFieldErrors((prev) => ({ ...prev, email: "Email is required" }))
        } else if (!validateEmail(trimmedValue)) {
          setFieldErrors((prev) => ({ ...prev, email: "Please enter a valid email" }))
        } else {
          setFieldErrors((prev) => ({ ...prev, email: "" }))
        }
      }

      if (name === "password") {
        const trimmedValue = value.trim()
        if (!trimmedValue) {
          setFieldErrors((prev) => ({ ...prev, password: "Password is required" }))
        } else if (!validatePassword(trimmedValue)) {
          setFieldErrors((prev) => ({ ...prev, password: "Password must be at least 6 characters" }))
        } else {
          setFieldErrors((prev) => ({ ...prev, password: "" }))
        }
      }
    }
  }

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target

    setTouchedFields((prev) => ({ ...prev, [name]: true }))

    if (name === "email") {
      const trimmedValue = value.trim()
      if (!trimmedValue) {
        setFieldErrors((prev) => ({ ...prev, email: "Email is required" }))
      } else if (!validateEmail(trimmedValue)) {
        setFieldErrors((prev) => ({ ...prev, email: "Please enter a valid email" }))
      } else {
        setFieldErrors((prev) => ({ ...prev, email: "" }))
      }
    }

    if (name === "password") {
      const trimmedValue = value.trim()
      if (!trimmedValue) {
        setFieldErrors((prev) => ({ ...prev, password: "Password is required" }))
      } else if (!validatePassword(trimmedValue)) {
        setFieldErrors((prev) => ({ ...prev, password: "Password must be at least 6 characters" }))
      } else {
        setFieldErrors((prev) => ({ ...prev, password: "" }))
      }
    }
  }

  const validateForm = () => {
    const errors = {
      email: "",
      password: "",
    }

    const trimmedEmail = formData.email.trim()
    if (!trimmedEmail) {
      errors.email = "Email is required"
    } else if (!validateEmail(trimmedEmail)) {
      errors.email = "Please enter a valid email"
    }

    const trimmedPassword = formData.password.trim()
    if (!trimmedPassword) {
      errors.password = "Password is required"
    } else if (!validatePassword(trimmedPassword)) {
      errors.password = "Password must be at least 6 characters"
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
        const response = await fetch("/api/auth/session")
        const session = await response.json()

        if (session?.user?.role) {
          const role = session.user.role as "CLIENT" | "CHEF" | "ADMIN"
          const dashboardPath = {
            CLIENT: "/dashboard/client",
            CHEF: "/dashboard/chef",
            ADMIN: "/dashboard/admin",
          }[role]

          router.push(safeCallbackUrl || dashboardPath)
        } else {
          router.push(safeCallbackUrl || "/dashboard")
        }
      }
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="brand-auth-surface relative w-full overflow-hidden rounded-[32px] p-5 md:p-6">
      <div className="brand-auth-divider absolute inset-x-8 top-0 h-px" />
      <div className="brand-auth-orb absolute right-[-3rem] top-[-2rem] h-32 w-32 rounded-full blur-3xl" />

      <div className="relative space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-3">
            <div className="brand-auth-chip inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em]">
              <LockKeyhole className="h-3.5 w-3.5 text-primary" />
              Secure access
            </div>
            <div className="space-y-2">
              <h1 className="text-[1.85rem] font-semibold tracking-[-0.07em] text-foreground md:text-[2.35rem] md:leading-[0.96]">{roleCopy.heading}</h1>
              <p className="max-w-sm text-sm leading-5 text-muted-foreground md:text-[15px]">
                {roleCopy.description}
              </p>
            </div>
          </div>
          <div className="brand-gradient-button flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl shadow-[0_14px_28px_hsl(var(--primary)/0.24)]">
            <Sparkles className="h-4.5 w-4.5" />
          </div>
        </div>
      </div>

      <div className="relative mt-6 space-y-5">
        {bannedMessage && !error && (
          <Alert variant="destructive" className="items-start rounded-2xl border-[rgba(220,38,38,0.14)] bg-[rgba(254,242,242,0.92)] text-[#991b1b] shadow-none">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{bannedMessage}</AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive" className="items-start rounded-2xl border-[rgba(220,38,38,0.14)] bg-[rgba(254,242,242,0.92)] text-[#991b1b] shadow-none">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-semibold text-foreground">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={formData.email}
              onChange={handleChange}
              onBlur={handleBlur}
              disabled={loading}
              aria-invalid={fieldErrors.email ? true : undefined}
              aria-describedby={fieldErrors.email ? "email-error" : undefined}
              placeholder="name@example.com"
              className="h-12 rounded-[18px] border border-[#d7dfeb] bg-[#ffffff] px-4 text-[15px] text-[#0f172a] shadow-[0_1px_2px_rgba(16,24,40,0.03)] transition-all duration-200 placeholder:text-[#98a2b3] hover:border-[#c5d0df] focus-visible:border-[#2159d6] focus-visible:ring-[4px] focus-visible:ring-[rgba(33,89,214,0.12)]"
            />
            {fieldErrors.email && (
              <p id="email-error" className="text-sm text-[#b91c1c]">
                {fieldErrors.email}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="password" className="text-sm font-semibold text-foreground">Password</Label>
              <Link href="/forgot-password" className="text-sm font-medium text-[#667085] transition-colors hover:text-[#1849be]">
                Forgot password?
              </Link>
            </div>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={formData.password}
              onChange={handleChange}
              onBlur={handleBlur}
              disabled={loading}
              aria-invalid={fieldErrors.password ? true : undefined}
              aria-describedby={fieldErrors.password ? "password-error" : undefined}
              placeholder="Enter your password"
              className="h-12 rounded-[18px] border border-[#d7dfeb] bg-[#ffffff] px-4 text-[15px] text-[#0f172a] shadow-[0_1px_2px_rgba(16,24,40,0.03)] transition-all duration-200 placeholder:text-[#98a2b3] hover:border-[#c5d0df] focus-visible:border-[#2159d6] focus-visible:ring-[4px] focus-visible:ring-[rgba(33,89,214,0.12)]"
            />
            {fieldErrors.password && (
              <p id="password-error" className="text-sm text-[#b91c1c]">
                {fieldErrors.password}
              </p>
            )}
          </div>

          <Button
            type="submit"
            className="brand-gradient-button group h-12 w-full rounded-[18px] border-0 shadow-[0_18px_38px_hsl(var(--primary)/0.28)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_22px_46px_hsl(var(--primary)/0.34)] focus-visible:ring-[4px] focus-visible:ring-[hsl(var(--primary)/0.16)]"
            disabled={loading}
          >
            <span className="inline-flex items-center justify-center gap-2">
              {loading ? "Signing in..." : "Sign in"}
              {!loading && <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />}
            </span>
          </Button>
        </form>

        <div className="border-t border-[rgba(215,223,235,0.92)] pt-4 text-center text-sm text-[#667085]">
          <p className="mb-3 text-xs leading-5 text-muted-foreground">
            By continuing, you agree to keep communication, booking coordination, and payments inside the platform. Read the <Link href="/terms/client" className="font-semibold text-primary hover:underline">Client Terms</Link>, <Link href="/terms/chef" className="font-semibold text-primary hover:underline">Chef Terms</Link>, and <Link href="/privacy" className="font-semibold text-primary hover:underline">Privacy Policy</Link>.
          </p>
          {isAdminLogin ? (
            <span>Admin access is provisioned by the platform owner.</span>
          ) : (
            <>
              Don&apos;t have an account?{" "}
              {onToggleMode ? (
                <button type="button" onClick={onToggleMode} className="font-semibold text-[#101828] transition-colors hover:text-[#1849be]">
                  Sign up
                </button>
              ) : (
                <Link href={signupHref} className="font-semibold text-[#101828] transition-colors hover:text-[#1849be]">
                  Sign up
                </Link>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
