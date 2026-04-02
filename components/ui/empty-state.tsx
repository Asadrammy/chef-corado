"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { PlusCircle, FileText, Search } from "lucide-react"
import Link from "next/link"

interface EmptyStateProps {
  title?: string
  description?: string
  icon?: "create" | "search" | "document"
  actionLabel?: string
  actionHref?: string
  onAction?: () => void
}

export function EmptyState({ 
  title = "No data yet", 
  description = "Get started by creating your first item.",
  icon = "create",
  actionLabel = "Create Request",
  actionHref = "#",
  onAction
}: EmptyStateProps) {
  const getIcon = () => {
    switch (icon) {
      case "search":
        return <Search className="h-12 w-12 text-gray-400" />
      case "document":
        return <FileText className="h-12 w-12 text-gray-400" />
      default:
        return <PlusCircle className="h-12 w-12 text-gray-400" />
    }
  }

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200/60 dark:border-gray-700/60 rounded-2xl shadow-sm p-8 text-center">
      <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-gray-50 dark:bg-gray-800">
        {getIcon()}
      </div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{title}</h3>
      <p className="text-gray-600 dark:text-gray-300 max-w-md mx-auto mb-6">
        {description}
      </p>
      {actionHref !== "#" ? (
        <Button 
          className="shadow-sm hover:shadow-md"
          asChild
        >
          <Link href={actionHref}>
            <PlusCircle className="h-4 w-4 mr-2" />
            {actionLabel}
          </Link>
        </Button>
      ) : (
        <Button 
          onClick={onAction}
          className="shadow-sm hover:shadow-md"
        >
          <PlusCircle className="h-4 w-4 mr-2" />
          {actionLabel}
        </Button>
      )}
    </div>
  )
}
