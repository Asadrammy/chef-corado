"use client"

import { useEffect, useState } from "react"
import { Loader2, Plus } from "lucide-react"

import { MenuDialog } from "@/components/dashboard/chef/menu-dialog"
import { MenuEmptyState } from "@/components/dashboard/chef/menu-empty-state"
import { MenuGrid } from "@/components/dashboard/chef/menu-grid"
import type { Menu, MenuFormData } from "@/components/dashboard/chef/menu-types"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Card, CardContent } from "@/components/ui/card"

// Prevent static generation
export const dynamic = 'force-dynamic'

export default function MenusPage() {
  const [menus, setMenus] = useState<Menu[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingMenu, setEditingMenu] = useState<Menu | null>(null)
  const [formData, setFormData] = useState<MenuFormData>({
    title: "",
    description: "",
    price: "",
    menuImage: "",
  })
  const [saving, setSaving] = useState(false)
  const [deletingMenu, setDeletingMenu] = useState<Menu | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState("")
  const [successMessage, setSuccessMessage] = useState("")

  useEffect(() => {
    fetchMenus()
  }, [])

  const fetchMenus = async () => {
    try {
      setError("")
      const response = await fetch("/api/menus")
      if (!response.ok) {
        throw new Error("Failed to fetch menus")
      }
      const data = await response.json()
      setMenus(data)
    } catch (err) {
      setError("Failed to load menus")
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      price: "",
      menuImage: "",
    })
    setEditingMenu(null)
    setError("")
  }

  const handleDialogOpenChange = (open: boolean) => {
    setDialogOpen(open)

    if (!open) {
      resetForm()
    }
  }

  const openDialog = (menu?: Menu) => {
    if (menu) {
      setEditingMenu(menu)
      setFormData({
        title: menu.title,
        description: menu.description || "",
        price: menu.price.toString(),
        menuImage: menu.menuImage || "",
      })
    } else {
      resetForm()
    }
    setDialogOpen(true)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError("")

    try {
      const submitData = {
        title: formData.title,
        description: formData.description || undefined,
        price: parseFloat(formData.price),
        menuImage: formData.menuImage || undefined,
      }

      const url = editingMenu ? `/api/menus/${editingMenu.id}` : "/api/menus"
      const method = editingMenu ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(submitData),
      })

      if (!response.ok) {
        const data = await response.json()
        if (data.details) {
          setError(data.details.map((d: any) => d.message).join(", "))
        } else {
          setError(data.error || "Failed to save menu")
        }
        return
      }

      const actionLabel = editingMenu ? "Menu updated successfully." : "Menu created successfully."

      handleDialogOpenChange(false)
      await fetchMenus()
      setSuccessMessage(actionLabel)
      window.setTimeout(() => setSuccessMessage(""), 3000)
    } catch (err) {
      setError("Network error. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deletingMenu) {
      return
    }

    setDeleting(true)
    setError("")

    try {
      const response = await fetch(`/api/menus/${deletingMenu.id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete menu")
      }

      await fetchMenus()
      setDeletingMenu(null)
      setSuccessMessage("Menu deleted successfully.")
      window.setTimeout(() => setSuccessMessage(""), 3000)
    } catch (err) {
      setError("Failed to delete menu")
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="w-full flex-1">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Menu Management</h1>
            <p className="text-sm text-muted-foreground">Create, update, and manage your menu offerings.</p>
          </div>
          <Button type="button" onClick={() => openDialog()} className="rounded-lg sm:self-start">
            <Plus className="size-4" />
            <span>Create Menu</span>
          </Button>
        </header>

        {successMessage ? (
          <Card className="rounded-lg border-border bg-card shadow-sm">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">{successMessage}</p>
            </CardContent>
          </Card>
        ) : null}

        {error && !dialogOpen ? (
          <Card className="rounded-lg border-border bg-card shadow-sm">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">{error}</p>
            </CardContent>
          </Card>
        ) : null}

        {menus.length === 0 ? (
          <MenuEmptyState onCreate={() => openDialog()} />
        ) : (
          <MenuGrid
            menus={menus}
            onEdit={openDialog}
            onDelete={setDeletingMenu}
            deletingMenuId={deleting ? deletingMenu?.id : null}
          />
        )}

        <MenuDialog
          open={dialogOpen}
          mode={editingMenu ? "edit" : "create"}
          formData={formData}
          saving={saving}
          error={error}
          onOpenChange={handleDialogOpenChange}
          onChange={handleChange}
          onImageChange={(url) => setFormData((prev) => ({ ...prev, menuImage: url }))}
          onImageRemove={() => setFormData((prev) => ({ ...prev, menuImage: "" }))}
          onSubmit={handleSubmit}
        />

        <AlertDialog open={Boolean(deletingMenu)} onOpenChange={(open) => !open && setDeletingMenu(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete menu</AlertDialogTitle>
              <AlertDialogDescription>
                This action will permanently remove {deletingMenu?.title || "this menu"}.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-lg">Cancel</AlertDialogCancel>
              <AlertDialogAction className="rounded-lg" onClick={handleDelete}>
                {deleting ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}
