"use client"

import { Pencil, Trash2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import type { Menu } from "@/components/dashboard/chef/menu-types"
import { formatCurrency } from "@/lib/currency"

interface MenuCardProps {
  menu: Menu
  onEdit: (menu: Menu) => void
  onDelete: (menu: Menu) => void
  isDeleting?: boolean
}

export function MenuCard({ menu, onEdit, onDelete, isDeleting = false }: MenuCardProps) {
  const menuType = menu.menuType || "FREE_FORM"
  const descriptionPreview = menu.description?.trim() || "No description provided."

  return (
    <Card className="rounded-lg border-border bg-card shadow-sm transition-shadow hover:shadow-md">
      <CardHeader className="gap-3 p-4 pb-0">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-2">
            <CardTitle className="min-w-0 text-base font-semibold text-foreground">
              <span className="block truncate">{menu.title}</span>
            </CardTitle>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="rounded-md">
                {menuType === "PRICED" ? "Priced Menu" : menuType === "SAMPLE" ? "Sample Menu" : "Free Form"}
              </Badge>
              {menu.cuisineType ? <Badge variant="outline" className="rounded-md">{menu.cuisineType}</Badge> : null}
            </div>
          </div>
          <div className="shrink-0 text-sm font-medium text-foreground">
            {menuType === "PRICED" && typeof menu.price === "number" ? formatCurrency(menu.price, menu.currency || "GBP") : null}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="space-y-3">
          {menu.menuImage ? (
            <img src={menu.menuImage} alt={menu.title} className="h-40 w-full rounded-lg object-cover" />
          ) : null}
          <div className="max-h-32 overflow-hidden whitespace-pre-wrap text-sm text-muted-foreground">
            {descriptionPreview}
          </div>
          {menu.eventType ? <p className="text-xs text-muted-foreground">Best for: {menu.eventType}</p> : null}
        </div>
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
