"use client"

import { useEffect, useState } from "react"
import { Loader2, Plus } from "lucide-react"

import { MenuDialog } from "@/components/dashboard/chef/menu-dialog"
import { MenuEmptyState } from "@/components/dashboard/chef/menu-empty-state"
import { MenuGrid } from "@/components/dashboard/chef/menu-grid"
import type { Menu, MenuDialogSubmitData, MenuFormData } from "@/components/dashboard/chef/menu-types"
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

const MENU_RECOMMENDED_MIN = 5
const MENU_MAX_COUNT = 20

// Prevent static generation
export const dynamic = 'force-dynamic'

export default function MenusPage() {
  const [defaultCurrency, setDefaultCurrency] = useState("GBP")

  const createInitialFormData = (): MenuFormData => ({
    title: "",
    description: "",
    price: "",
    currency: defaultCurrency,
    menuType: "FREE_FORM",
    menuImage: "",
    cuisineType: "",
    eventType: "",
  })

  const [menus, setMenus] = useState<Menu[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingMenu, setEditingMenu] = useState<Menu | null>(null)
  const [formData, setFormData] = useState<MenuFormData>(createInitialFormData)
  const [saving, setSaving] = useState(false)
  const [deletingMenu, setDeletingMenu] = useState<Menu | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState("")
  const [successMessage, setSuccessMessage] = useState("")

  useEffect(() => {
    fetchMenus()
    fetchProfileDefaults()
  }, [])

  const fetchProfileDefaults = async () => {
    try {
      const response = await fetch("/api/chef/profile")
      if (!response.ok) return
      const payload = await response.json()
      const currency = payload?.data?.preferredCurrency as string | undefined
      if (currency) {
        setDefaultCurrency(currency)
        setFormData((prev) => ({ ...prev, currency: currency }))
      }
    } catch {
      // ignore and keep platform default
    }
  }

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
    setFormData(createInitialFormData())
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
        price: menu.price?.toString() || "",
        currency: menu.currency || "GBP",
        menuType: menu.menuType || "FREE_FORM",
        menuImage: menu.menuImage || "",
        cuisineType: menu.cuisineType || "",
        eventType: menu.eventType || "",
      })
    } else {
      resetForm()
    }
    setDialogOpen(true)
  }

  const handleSubmit = async (submitData: MenuDialogSubmitData) => {
    setSaving(true)
    setError("")

    try {
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
            <p className="text-sm text-muted-foreground">Use free-form descriptions so clients can understand your menu in your own words.</p>
            <p className="text-xs text-muted-foreground">Recommended minimum: {MENU_RECOMMENDED_MIN} menus. Maximum allowed: {MENU_MAX_COUNT} menus.</p>
          </div>
          <Button type="button" onClick={() => openDialog()} className="rounded-lg sm:self-start" disabled={menus.length >= MENU_MAX_COUNT}>
            <Plus className="size-4" />
            <span>{menus.length >= MENU_MAX_COUNT ? "Menu Limit Reached" : "Create Menu"}</span>
          </Button>
        </header>

        <Card className="rounded-lg border-border bg-card shadow-sm">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">
              You currently have <span className="font-medium text-foreground">{menus.length}</span> menu{menus.length === 1 ? "" : "s"}.
              {menus.length < MENU_RECOMMENDED_MIN
                ? ` Add ${MENU_RECOMMENDED_MIN - menus.length} more to reach the recommended profile minimum.`
                : menus.length < MENU_MAX_COUNT
                  ? ` You can add ${MENU_MAX_COUNT - menus.length} more before reaching the maximum.`
                  : " You have reached the maximum allowed menus for one chef profile."}
            </p>
          </CardContent>
        </Card>

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
