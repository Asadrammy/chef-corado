"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertTriangle, RefreshCw } from "lucide-react"

interface DashboardErrorProps {
  error?: string
  onRetry?: () => void
}

export function DashboardError({ error = "Failed to load dashboard data", onRetry }: DashboardErrorProps) {
  return (
    <div className="bg-gray-50 min-h-screen flex items-center justify-center p-8">
      <Card className="max-w-md w-full border-0 shadow-lg">
        <CardContent className="p-8 text-center space-y-6">
          <div className="space-y-4">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-xl font-semibold text-gray-900">
                Dashboard Error
              </h3>
              <p className="text-gray-600">
                {error}
              </p>
            </div>
          </div>
          
          {onRetry && (
            <Button 
              onClick={onRetry}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          )}
          
          <div className="text-sm text-gray-500">
            If this problem persists, please contact support.
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
