"use client"

import { Pencil, Trash2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import type { Menu } from "@/components/dashboard/chef/menu-types"

interface MenuCardProps {
  menu: Menu
  onEdit: (menu: Menu) => void
  onDelete: (menu: Menu) => void
  isDeleting?: boolean
}

export function MenuCard({ menu, onEdit, onDelete, isDeleting = false }: MenuCardProps) {
  return (
    <Card className="rounded-lg border-border bg-card shadow-sm transition-shadow hover:shadow-md">
      <CardHeader className="gap-3 p-4 pb-0">
        <div className="flex items-start justify-between gap-4">
          <CardTitle className="min-w-0 text-base font-semibold text-foreground">
            <span className="block truncate">{menu.title}</span>
          </CardTitle>
          <div className="shrink-0 text-sm font-medium text-foreground">
            ${menu.price.toFixed(2)}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <p className="line-clamp-2 min-h-10 text-sm text-muted-foreground">
          {menu.description?.trim() || "No description provided."}
        </p>
      </CardContent>
      <CardFooter className="flex items-center justify-between gap-3 p-4 pt-0">
        <Badge variant="secondary" className="rounded-md">
          {new Date(menu.updatedAt).toLocaleDateString()}
        </Badge>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-lg"
            onClick={() => onEdit(menu)}
            aria-label={`Edit ${menu.title}`}
          >
            <Pencil className="size-4" />
            <span>Edit</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-lg"
            onClick={() => onDelete(menu)}
            disabled={isDeleting}
            aria-label={`Delete ${menu.title}`}
          >
            <Trash2 className="size-4" />
            <span>Delete</span>
          </Button>
        </div>
      </CardFooter>
    </Card>
  )
}
