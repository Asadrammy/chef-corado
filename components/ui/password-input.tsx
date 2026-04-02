"use client"

import * as React from "react"
import { Eye, EyeOff } from "lucide-react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"

interface PasswordInputProps extends React.ComponentProps<typeof Input> {
  label?: string
  error?: string
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void
}

const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, label, error, onBlur, ...props }, ref) => {
    const [showPassword, setShowPassword] = React.useState(false)
    const [isFocused, setIsFocused] = React.useState(false)
    const hasValue = props.value && props.value.toString().length > 0

    const togglePassword = () => setShowPassword(!showPassword)

    return (
      <div className="relative">
        {label && (
          <label
            htmlFor={props.id}
            className={cn(
              "absolute left-3 transition-all duration-200 pointer-events-none",
              isFocused || hasValue
                ? "text-xs -top-2 px-1"
                : "text-sm top-3"
            )}
            style={{
              backgroundColor: className?.includes('bg-white') ? 'white' : 'transparent',
              color: isFocused || hasValue ? 'inherit' : 'inherit'
            }}
          >
            {label}
          </label>
        )}
        <Input
          {...props}
          ref={ref}
          type={showPassword ? "text" : "password"}
          className={cn(
            "pr-10 pt-6 transition-all duration-200",
            error && "border-red-500/50 focus:border-red-500/60",
            className
          )}
          onFocus={(e) => {
            setIsFocused(true)
            props.onFocus?.(e)
          }}
          onBlur={(e) => {
            setIsFocused(false)
            onBlur?.(e)
          }}
        />
        <button
          type="button"
          onClick={togglePassword}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60 transition-colors"
          tabIndex={-1}
        >
          {showPassword ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
        </button>
        {error && (
          <p className="text-red-400 text-xs mt-1 animate-fadeIn font-light">{error}</p>
        )}
      </div>
    )
  }
)
PasswordInput.displayName = "PasswordInput"

export { PasswordInput }
