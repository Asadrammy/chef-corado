"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"

interface FloatingInputProps extends React.ComponentProps<typeof Input> {
  label?: string
  error?: string
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void
}

const FloatingInput = React.forwardRef<HTMLInputElement, FloatingInputProps>(
  ({ className, label, error, onBlur, ...props }, ref) => {
    const [isFocused, setIsFocused] = React.useState(false)
    const hasValue = props.value && props.value.toString().length > 0

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
        {error && (
          <p className="text-red-400 text-xs mt-1 animate-fadeIn font-light">{error}</p>
        )}
      </div>
    )
  }
)
FloatingInput.displayName = "FloatingInput"

export { FloatingInput }
