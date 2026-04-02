"use client"

import * as React from "react"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface GradientButtonProps extends React.ComponentProps<typeof Button> {
  loading?: boolean
}

const GradientButton = React.forwardRef<HTMLButtonElement, GradientButtonProps>(
  ({ className, loading, children, disabled, ...props }, ref) => {
    return (
      <Button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          "relative overflow-hidden group bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:from-indigo-700 hover:via-purple-700 hover:to-indigo-700 text-white border-0 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5",
          "before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent before:-translate-x-full before:group-hover:translate-x-full before:transition-transform before:duration-700",
          className
        )}
        {...props}
      >
        <span className="relative z-10 flex items-center justify-center">
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {children}
        </span>
      </Button>
    )
  }
)
GradientButton.displayName = "GradientButton"

export { GradientButton }
