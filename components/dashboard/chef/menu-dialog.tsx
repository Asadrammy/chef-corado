"use client"

import { Loader2, Plus, Trash2 } from "lucide-react"

import { ImageUpload } from "@/components/ui/image-upload"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import type { MenuFormData } from "@/components/dashboard/chef/menu-types"
import { COUNTRY_OPTIONS } from "@/lib/request-options"

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
  onSectionsChange: (sections: MenuFormData["sections"]) => void
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
  onSectionsChange,
  onSubmit,
}: MenuDialogProps) {
  const isEdit = mode === "edit"

  const updateSection = (sectionIndex: number, nextSection: MenuFormData["sections"][number]) => {
    const nextSections = formData.sections.map((section, index) =>
      index === sectionIndex ? nextSection : section
    )
    onSectionsChange(nextSections)
  }

  const addSection = () => {
    onSectionsChange([
      ...formData.sections,
      {
        title: "",
        sortOrder: formData.sections.length,
        items: [],
      },
    ])
  }

  const removeSection = (sectionIndex: number) => {
    const nextSections = formData.sections
      .filter((_, index) => index !== sectionIndex)
      .map((section, index) => ({ ...section, sortOrder: index }))
    onSectionsChange(nextSections.length > 0 ? nextSections : [{ title: "Starter", sortOrder: 0, items: [] }])
  }

  const addItem = (sectionIndex: number) => {
    const section = formData.sections[sectionIndex]
    updateSection(sectionIndex, {
      ...section,
      items: [
        ...section.items,
        {
          name: "",
          description: "",
          sortOrder: section.items.length,
        },
      ],
    })
  }

  const updateItem = (sectionIndex: number, itemIndex: number, field: "name" | "description", value: string) => {
    const section = formData.sections[sectionIndex]
    updateSection(sectionIndex, {
      ...section,
      items: section.items.map((item, index) =>
        index === itemIndex ? { ...item, [field]: value } : item
      ),
    })
  }

  const removeItem = (sectionIndex: number, itemIndex: number) => {
    const section = formData.sections[sectionIndex]
    updateSection(sectionIndex, {
      ...section,
      items: section.items
        .filter((_, index) => index !== itemIndex)
        .map((item, index) => ({ ...item, sortOrder: index })),
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl rounded-lg border-border bg-background p-0 shadow-lg">
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
          <div className="grid gap-4 sm:grid-cols-2">
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
              <Label htmlFor="currency">Currency</Label>
              <Select value={formData.currency} onValueChange={(value) => onChange({ target: { name: "currency", value } } as React.ChangeEvent<HTMLInputElement>)}>
                <SelectTrigger className="rounded-lg">
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRY_OPTIONS.map((option) => (
                    <SelectItem key={option.currency} value={option.currency}>{option.label} · {option.currency}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="cuisineType">Cuisine type</Label>
              <Input
                id="cuisineType"
                name="cuisineType"
                value={formData.cuisineType}
                onChange={onChange}
                placeholder="Italian"
                className="rounded-lg"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="eventType">Best for</Label>
              <Input
                id="eventType"
                name="eventType"
                value={formData.eventType}
                onChange={onChange}
                placeholder="Private dinner"
                className="rounded-lg"
              />
            </div>
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
          <div className="space-y-3 rounded-lg border border-border p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <Label>Menu sections</Label>
                <p className="text-sm text-muted-foreground">Organize dishes by course or serving flow.</p>
              </div>
              <Button type="button" variant="outline" size="sm" className="rounded-lg" onClick={addSection}>
                <Plus className="size-4" />
                <span>Add section</span>
              </Button>
            </div>
            <Accordion type="multiple" className="w-full">
              {formData.sections.map((section, sectionIndex) => (
                <AccordionItem key={`${section.id ?? "new"}-${sectionIndex}`} value={`section-${sectionIndex}`}>
                  <AccordionTrigger className="py-3 text-sm font-medium">
                    {section.title.trim() || `Section ${sectionIndex + 1}`}
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4">
                    <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                      <div className="space-y-2">
                        <Label htmlFor={`section-title-${sectionIndex}`}>Section title</Label>
                        <Input
                          id={`section-title-${sectionIndex}`}
                          value={section.title}
                          onChange={(event) => updateSection(sectionIndex, { ...section, title: event.target.value })}
                          placeholder="Starter"
                          className="rounded-lg"
                        />
                      </div>
                      <Button type="button" variant="ghost" size="sm" className="rounded-lg text-muted-foreground" onClick={() => removeSection(sectionIndex)}>
                        <Trash2 className="size-4" />
                      </Button>
                    </div>

                    <div className="space-y-3">
                      {section.items.map((item, itemIndex) => (
                        <div key={`${item.id ?? "item"}-${itemIndex}`} className="rounded-lg border border-border/60 p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="grid flex-1 gap-3">
                              <div className="space-y-2">
                                <Label htmlFor={`item-name-${sectionIndex}-${itemIndex}`}>Dish name</Label>
                                <Input
                                  id={`item-name-${sectionIndex}-${itemIndex}`}
                                  value={item.name}
                                  onChange={(event) => updateItem(sectionIndex, itemIndex, "name", event.target.value)}
                                  placeholder="Roasted beet salad"
                                  className="rounded-lg"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor={`item-description-${sectionIndex}-${itemIndex}`}>Description</Label>
                                <Textarea
                                  id={`item-description-${sectionIndex}-${itemIndex}`}
                                  value={item.description || ""}
                                  onChange={(event) => updateItem(sectionIndex, itemIndex, "description", event.target.value)}
                                  placeholder="Key ingredients or preparation notes"
                                  rows={3}
                                  className="rounded-lg"
                                />
                              </div>
                            </div>
                            <Button type="button" variant="ghost" size="sm" className="rounded-lg text-muted-foreground" onClick={() => removeItem(sectionIndex, itemIndex)}>
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      <Button type="button" variant="outline" size="sm" className="rounded-lg" onClick={() => addItem(sectionIndex)}>
                        <Plus className="size-4" />
                        <span>Add item</span>
                      </Button>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
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
