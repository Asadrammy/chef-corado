"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { AlertCircle, ArrowRight, Code, LockKeyhole, Sparkles } from "lucide-react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Role } from "@/types"

type RegisterFormProps = {
  onToggleMode?: () => void
}

export function RegisterForm({ onToggleMode }: RegisterFormProps) {
  const router = useRouter()
  const [formData, setFormData] = useState<{
    name: string
    email: string
    password: string
    role: Role
    acceptedTerms: boolean
    acceptedInsurance: boolean
  }>({
    name: "",
    email: "",
    password: "",
    role: Role.CLIENT,
    acceptedTerms: false,
    acceptedInsurance: false,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleRoleChange = (value: string) => {
    setFormData((prev) => ({ ...prev, role: value as Role }))
  }

  const handleCheckboxChange = (field: "acceptedTerms" | "acceptedInsurance", checked: boolean) => {
    setFormData((prev) => ({ ...prev, [field]: checked }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    if (!formData.acceptedTerms) {
      setError("You must accept the Terms & Conditions to create an account")
      setLoading(false)
      return
    }

    if (formData.role === Role.CHEF && !formData.acceptedInsurance) {
      setError("Chefs must acknowledge the insurance requirement to create an account")
      setLoading(false)
      return
    }

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        if (data.details) {
          setError(data.details.map((d: { message: string }) => d.message).join(", "))
        } else {
          setError(data.error || "Registration failed")
        }
        return
      }

      setSuccess(true)
      setTimeout(() => {
        if (onToggleMode) {
          onToggleMode()
        } else {
          router.push("/login")
        }
      }, 2000)
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="brand-auth-surface relative w-full overflow-hidden rounded-[32px] p-4 md:p-5">
        <div className="brand-auth-divider absolute inset-x-8 top-0 h-px" />
        <div className="brand-auth-orb absolute right-[-3rem] top-[-2rem] h-32 w-32 rounded-full blur-3xl" />

        <div className="relative space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-3">
              <div className="brand-auth-chip inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em]">
                <LockKeyhole className="h-3.5 w-3.5 text-primary" />
                Secure access
              </div>
              <div className="space-y-2">
                <h1 className="text-[1.85rem] font-semibold tracking-[-0.07em] text-[#0f172a] md:text-[2.35rem] md:leading-[0.96]">Create account</h1>
                <p className="max-w-sm text-sm leading-5 text-[#667085] md:text-[15px]">
                  Create a new account to access your workspace with a cleaner, more focused control surface.
                </p>
              </div>
            </div>
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(145deg,#1849be_0%,#6854d2_100%)] text-white shadow-[0_14px_28px_rgba(36,74,184,0.24)]">
              <Sparkles className="h-4.5 w-4.5" />
            </div>
          </div>
        </div>

        <div className="relative mt-6 space-y-5">
          <Alert className="items-start rounded-2xl border-green-600/20 bg-green-50/90 text-green-800 shadow-none">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-green-800">
                Registration successful! Redirecting to login...
            </AlertDescription>
          </Alert>
        </div>
      </div>
    )
  }

  return (
    <div className="brand-auth-surface relative w-full overflow-hidden rounded-[32px] p-4 md:p-5">
      <div className="brand-auth-divider absolute inset-x-8 top-0 h-px" />
      <div className="brand-auth-orb absolute right-[-3rem] top-[-2rem] h-32 w-32 rounded-full blur-3xl" />

      <div className="relative space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2.5">
            <div className="brand-auth-chip inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em]">
              <LockKeyhole className="h-3.5 w-3.5 text-primary" />
              Secure access
            </div>
            <div className="space-y-1.5">
              <h1 className="text-[1.75rem] font-semibold tracking-[-0.07em] text-foreground md:text-[2.05rem] md:leading-[0.96]">Create account</h1>
              <p className="max-w-sm text-[13px] leading-5 text-muted-foreground md:text-[14px]">
                Create a new account to access your workspace with a cleaner, more focused control surface.
              </p>
            </div>
          </div>
          <div className="brand-gradient-button flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl shadow-[0_14px_28px_hsl(var(--primary)/0.24)]">
            <Sparkles className="h-4.5 w-4.5" />
          </div>
        </div>
      </div>

      <div className="relative mt-4 space-y-4">
        {error && (
          <Alert variant="destructive" className="items-start rounded-2xl border-[rgba(220,38,38,0.14)] bg-[rgba(254,242,242,0.92)] text-[#991b1b] shadow-none">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form className="space-y-3" onSubmit={handleSubmit}>
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-[13px] font-semibold text-foreground">Name</Label>
            <Input
              id="name"
              name="name"
              type="text"
              required
              className="h-11 rounded-[16px] border border-[#d7dfeb] bg-[#ffffff] px-4 text-[14px] text-[#0f172a] shadow-[0_1px_2px_rgba(16,24,40,0.03)] transition-all duration-200 placeholder:text-[#98a2b3] hover:border-[#c5d0df] focus-visible:border-[#2159d6] focus-visible:ring-[4px] focus-visible:ring-[rgba(33,89,214,0.12)]"
              placeholder="Enter your name"
              value={formData.name}
              onChange={handleChange}
              disabled={loading}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-[13px] font-semibold text-foreground">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="h-11 rounded-[16px] border border-[#d7dfeb] bg-[#ffffff] px-4 text-[14px] text-[#0f172a] shadow-[0_1px_2px_rgba(16,24,40,0.03)] transition-all duration-200 placeholder:text-[#98a2b3] hover:border-[#c5d0df] focus-visible:border-[#2159d6] focus-visible:ring-[4px] focus-visible:ring-[rgba(33,89,214,0.12)]"
              placeholder="Enter your email"
              value={formData.email}
              onChange={handleChange}
              disabled={loading}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-[13px] font-semibold text-foreground">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              className="h-11 rounded-[16px] border border-[#d7dfeb] bg-[#ffffff] px-4 text-[14px] text-[#0f172a] shadow-[0_1px_2px_rgba(16,24,40,0.03)] transition-all duration-200 placeholder:text-[#98a2b3] hover:border-[#c5d0df] focus-visible:border-[#2159d6] focus-visible:ring-[4px] focus-visible:ring-[rgba(33,89,214,0.12)]"
              placeholder="Create a password"
              value={formData.password}
              onChange={handleChange}
              disabled={loading}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="role" className="text-[13px] font-semibold text-foreground">I want to register as</Label>
            <Select value={formData.role} onValueChange={handleRoleChange} disabled={loading}>
              <SelectTrigger className="h-11 rounded-[16px] border border-[#d7dfeb] bg-[#ffffff] px-4 text-[14px] text-[#0f172a] shadow-[0_1px_2px_rgba(16,24,40,0.03)] transition-all duration-200 hover:border-[#c5d0df] focus:ring-[4px] focus:ring-[rgba(33,89,214,0.12)] focus:ring-offset-0">
                <SelectValue placeholder="Select your role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={Role.CLIENT}>Client - Looking for chefs</SelectItem>
                <SelectItem value={Role.CHEF}>Chef - Offering services</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3 rounded-[16px] border border-[#d7dfeb] bg-white px-4 py-3 text-sm text-[#344054]">
            <label className="flex items-start gap-3">
              <Checkbox
                checked={formData.acceptedTerms}
                onCheckedChange={(checked) => handleCheckboxChange("acceptedTerms", Boolean(checked))}
                disabled={loading}
              />
              <span>
                I agree to the <Link href="/terms/client" className="font-semibold text-[#1849be] hover:underline">Client Terms & Conditions</Link>
                {formData.role === Role.CHEF ? <> and the <Link href="/terms/chef" className="font-semibold text-[#1849be] hover:underline">Chef Terms & Conditions</Link></> : null}.
                I understand that communication, scheduling, and payments must remain inside the platform, and I have reviewed the <Link href="/privacy" className="font-semibold text-[#1849be] hover:underline">Privacy Policy</Link>.
              </span>
            </label>

            {formData.role === Role.CHEF && (
              <label className="flex items-start gap-3 rounded-2xl border border-primary/15 bg-primary/5 px-3 py-3 text-muted-foreground">
                <Checkbox
                  checked={formData.acceptedInsurance}
                  onCheckedChange={(checked) => handleCheckboxChange("acceptedInsurance", Boolean(checked))}
                  disabled={loading}
                />
                <span>
                  Chefs must acknowledge the platform&apos;s insurance and legal requirements before offering services. I confirm that I have reviewed those requirements, will keep my profile accurate, and understand that communication, coordination, and payments for active bookings must remain on-platform.
                </span>
              </label>
            )}
          </div>

          <Button
            type="submit"
            className="brand-gradient-button group h-11 w-full rounded-[16px] border-0 shadow-[0_18px_38px_hsl(var(--primary)/0.28)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_22px_46px_hsl(var(--primary)/0.34)] focus-visible:ring-[4px] focus-visible:ring-[hsl(var(--primary)/0.16)]"
            disabled={loading}
          >
            <span className="inline-flex items-center justify-center gap-2">
              {loading ? "Creating account..." : "Create account"}
              {!loading && <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />}
            </span>
          </Button>
        </form>

        <div className="space-y-3 border-t border-[rgba(215,223,235,0.92)] pt-3">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[rgba(215,223,235,0.92)]" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-[rgba(249,251,254,0.94)] px-3 text-[12px] text-[#98a2b3]">or continue with</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" className="h-10 rounded-[16px] border-[#d7dfeb] bg-white text-[13px] text-[#667085] hover:bg-[#f8fafc]" type="button" disabled>
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Google
            </Button>
            <Button variant="outline" className="h-10 rounded-[16px] border-[#d7dfeb] bg-white text-[13px] text-[#667085] hover:bg-[#f8fafc]" type="button" disabled>
              <Code className="mr-2 h-4 w-4" />
              GitHub
            </Button>
          </div>

          <div className="text-center text-[13px] text-[#667085]">
            Already have an account?{" "}
            {onToggleMode ? (
              <button type="button" onClick={onToggleMode} className="font-semibold text-[#101828] transition-colors hover:text-[#1849be]">
                Sign in
              </button>
            ) : (
              <Link href="/login" className="font-semibold text-[#101828] transition-colors hover:text-[#1849be]">
                Sign in
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
