"use client"

import { Loader2 } from "lucide-react"

import { ImageUpload } from "@/components/ui/image-upload"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { MenuFormData } from "@/components/dashboard/chef/menu-types"

interface MenuDialogProps {
  open: boolean
  mode: "create" | "edit"
  formData: MenuFormData
  saving: boolean
  error?: string
  onOpenChange: (open: boolean) => void
  onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void
  onImageChange: (url: string) => void
  onImageRemove: () => void
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void
}

export function MenuDialog({
  open,
  mode,
  formData,
  saving,
  error,
  onOpenChange,
  onChange,
  onImageChange,
  onImageRemove,
  onSubmit,
}: MenuDialogProps) {
  const isEdit = mode === "edit"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-lg border-border bg-background p-0 shadow-lg">
        <DialogHeader className="space-y-2 border-b border-border p-6">
          <DialogTitle>{isEdit ? "Edit Menu" : "Create Menu"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update your menu details."
              : "Add a new menu to your chef profile."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4 p-6">
          <div className="space-y-2">
            <Label htmlFor="title">Menu name</Label>
            <Input
              id="title"
              name="title"
              value={formData.title}
              onChange={onChange}
              placeholder="Three-course dinner"
              required
              className="rounded-lg"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="price">Price</Label>
            <Input
              id="price"
              name="price"
              type="number"
              min="0"
              step="0.01"
              value={formData.price}
              onChange={onChange}
              placeholder="150.00"
              required
              className="rounded-lg"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={onChange}
              placeholder="Describe what is included in this menu."
              rows={4}
              className="rounded-lg"
            />
          </div>
          <div className="space-y-2">
            <Label>Menu image</Label>
            <ImageUpload
              value={formData.menuImage}
              onChange={onImageChange}
              onRemove={onImageRemove}
              className="rounded-lg border-border shadow-none"
            />
          </div>
          {error ? (
            <p className="text-sm text-muted-foreground">{error}</p>
          ) : null}
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="rounded-lg">
              Cancel
            </Button>
            <Button type="submit" disabled={saving} className="rounded-lg">
              {saving ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>Saving</span>
                </>
              ) : (
                <span>{isEdit ? "Save Changes" : "Create Menu"}</span>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
