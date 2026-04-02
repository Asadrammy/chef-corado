"use client"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"

interface DashboardErrorProps {
  message: string
  onRetry?: () => void
}

export function DashboardError({ message, onRetry }: DashboardErrorProps) {
  return (
    <Alert className="bg-red-50 border-red-200 mb-6">
      <AlertDescription className="text-red-800 flex items-center justify-between">
        <span>{message}</span>
        {onRetry && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="ml-4 text-red-800 border-red-300 hover:bg-red-100"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        )}
      </AlertDescription>
    </Alert>
  )
}
