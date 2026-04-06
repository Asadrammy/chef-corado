"use client"

import { Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"

interface MenuEmptyStateProps {
  onCreate: () => void
}

export function MenuEmptyState({ onCreate }: MenuEmptyStateProps) {
  return (
    <Card className="rounded-lg border-border bg-card shadow-sm">
      <CardContent className="p-0">
        <Empty className="rounded-lg border-0 p-8 md:p-12">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Plus className="size-5" />
            </EmptyMedia>
            <EmptyTitle>No menus yet</EmptyTitle>
            <EmptyDescription>
              Create your first menu to start presenting your offerings to clients.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button type="button" onClick={onCreate} className="rounded-lg">
              <Plus className="size-4" />
              <span>Create Menu</span>
            </Button>
          </EmptyContent>
        </Empty>
      </CardContent>
    </Card>
  )
}
