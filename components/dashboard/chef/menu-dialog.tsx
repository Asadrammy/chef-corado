"use client"

import { useEffect, useMemo, useState } from "react"
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ImageUpload } from "@/components/ui/image-upload"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import type { MenuDialogSubmitData, MenuFormData, MenuType } from "@/components/dashboard/chef/menu-types"
import { COUNTRY_OPTIONS } from "@/lib/request-options"
import { cn } from "@/lib/utils"

const CUISINE_OPTIONS = [
  "Brunch",
  "Fine Dining",
  "BBQ",
  "Afternoon Tea",
  "Pan Asian",
  "Christmas",
  "Italian",
  "Mediterranean",
  "Vegan",
  "Asian Fusion",
  "British",
  "Caribbean",
  "Indian",
  "Middle Eastern",
] as const

const MENU_TYPE_OPTIONS: Array<{
  value: MenuType
  title: string
  description: string
}> = [
  {
    value: "PRICED",
    title: "Priced Menu",
    description: "Show a clear menu price to clients. Price is required.",
  },
  {
    value: "SAMPLE",
    title: "Sample Menu",
    description: "Show an example of your cooking style. Price is optional.",
  },
  {
    value: "FREE_FORM",
    title: "Free Form",
    description: "Describe your menu in your own words. Price is optional.",
  },
]

interface MenuDialogProps {
  open: boolean
  mode: "create" | "edit"
  formData: MenuFormData
  saving: boolean
  error?: string
  onOpenChange: (open: boolean) => void
  onSubmit: (data: MenuDialogSubmitData) => void
}

export function MenuDialog({
  open,
  mode,
  formData,
  saving,
  error,
  onOpenChange,
  onSubmit,
}: MenuDialogProps) {
  const isEdit = mode === "edit"
  const [step, setStep] = useState(1)
  const [localFormData, setLocalFormData] = useState<MenuFormData>(formData)
  const [validationError, setValidationError] = useState("")

  useEffect(() => {
    if (open) {
      setStep(1)
      setValidationError("")
      setLocalFormData({
        ...formData,
        menuType: formData.menuType || "FREE_FORM",
        price: formData.price || "",
      })
    }
  }, [formData, open])

  const previewLines = useMemo(
    () => localFormData.description.split(/\r?\n/).filter((line) => line.trim()).slice(0, 4),
    [localFormData.description]
  )

  const updateField = <K extends keyof MenuFormData>(field: K, value: MenuFormData[K]) => {
    setValidationError("")
    setLocalFormData((current) => ({ ...current, [field]: value }))
  }

  const validateStep = (currentStep: number) => {
    if (currentStep === 1) {
      if (!localFormData.title.trim()) {
        setValidationError("Menu title is required.")
        return false
      }

      if (!localFormData.cuisineType.trim()) {
        setValidationError("Cuisine is required.")
        return false
      }
    }

    if (currentStep === 3) {
      if (!localFormData.description.trim()) {
        setValidationError("Full Menu Description is required.")
        return false
      }
    }

    if (currentStep === 4 && localFormData.menuType === "PRICED") {
      if (!localFormData.price.trim()) {
        setValidationError("Price is required for a Priced Menu.")
        return false
      }

      if (Number.isNaN(Number(localFormData.price)) || Number(localFormData.price) < 0) {
        setValidationError("Price must be a valid positive number.")
        return false
      }
    }

    setValidationError("")
    return true
  }

  const handleNext = () => {
    if (!validateStep(step)) {
      return
    }

    setStep((current) => Math.min(current + 1, 4))
  }

  const handleBack = () => {
    setValidationError("")
    setStep((current) => Math.max(current - 1, 1))
  }

  const handleFinalSubmit = () => {
    if (!validateStep(4)) {
      return
    }

    onSubmit({
      title: localFormData.title.trim(),
      description: localFormData.description.trim() || undefined,
      currency: localFormData.currency,
      menuType: localFormData.menuType,
      menuImage: localFormData.menuImage || undefined,
      cuisineType: localFormData.cuisineType.trim() || undefined,
      eventType: localFormData.eventType.trim() || undefined,
      price:
        localFormData.menuType === "PRICED" && localFormData.price.trim()
          ? Number(localFormData.price)
          : undefined,
    })
  }

  const activeError = validationError || error || ""

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-5xl overflow-y-auto rounded-2xl border-border bg-background p-0 shadow-lg sm:w-[min(92vw,72rem)]">
        <DialogHeader className="space-y-2 border-b border-border p-6">
          <DialogTitle>{isEdit ? "Edit Menu" : "Create Menu"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update your menu in a simple guided flow."
              : "Create a menu using free-form descriptions so clients can understand your menu in your own words."}
          </DialogDescription>
          <div className="flex flex-wrap gap-2 pt-2">
            {["Menu Basics", "Menu Type", "Menu Content", "Media & Review"].map((label, index) => {
              const current = index + 1
              const active = current === step
              const complete = current < step

              return (
                <Badge
                  key={label}
                  variant={active ? "default" : "secondary"}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs",
                    complete && "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300"
                  )}
                >
                  {complete ? <CheckCircle2 className="mr-1 size-3" /> : null}
                  <span>{current}. {label}</span>
                </Badge>
              )
            })}
          </div>
        </DialogHeader>
        <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-6 p-6">
            {step === 1 ? (
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="title">Menu title</Label>
                  <Input
                    id="title"
                    value={localFormData.title}
                    onChange={(event) => updateField("title", event.target.value)}
                    placeholder="e.g. Summer Garden Feast"
                    className="rounded-lg"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cuisine-select">Cuisine</Label>
                  <Select
                    value={CUISINE_OPTIONS.includes(localFormData.cuisineType as (typeof CUISINE_OPTIONS)[number]) ? localFormData.cuisineType : "custom"}
                    onValueChange={(value) => {
                      if (value === "custom") {
                        if (CUISINE_OPTIONS.includes(localFormData.cuisineType as (typeof CUISINE_OPTIONS)[number])) {
                          updateField("cuisineType", "")
                        }
                        return
                      }

                      updateField("cuisineType", value)
                    }}
                  >
                    <SelectTrigger id="cuisine-select" className="rounded-lg">
                      <SelectValue placeholder="Choose a cuisine" />
                    </SelectTrigger>
                    <SelectContent>
                      {CUISINE_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                      <SelectItem value="custom">Custom cuisine</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cuisineType">Custom cuisine</Label>
                  <Input
                    id="cuisineType"
                    value={localFormData.cuisineType}
                    onChange={(event) => updateField("cuisineType", event.target.value)}
                    placeholder="Add your own cuisine label if needed"
                    className="rounded-lg"
                  />
                </div>
              </div>
            ) : null}

            {step === 2 ? (
              <div className="space-y-4">
                <div className="grid gap-3 md:grid-cols-3">
                  {MENU_TYPE_OPTIONS.map((option) => {
                    const selected = localFormData.menuType === option.value

                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => updateField("menuType", option.value)}
                        className={cn(
                          "rounded-2xl border p-4 text-left transition-colors",
                          selected
                            ? "border-primary bg-primary/5 shadow-sm"
                            : "border-border hover:border-primary/40"
                        )}
                      >
                        <p className="font-medium text-foreground">{option.title}</p>
                        <p className="mt-2 text-sm text-muted-foreground">{option.description}</p>
                      </button>
                    )
                  })}
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="price">Price</Label>
                    <Input
                      id="price"
                      type="number"
                      min="0"
                      step="0.01"
                      value={localFormData.price}
                      onChange={(event) => updateField("price", event.target.value)}
                      placeholder={localFormData.menuType === "PRICED" ? "Required for priced menus" : "Optional"}
                      className="rounded-lg"
                    />
                    <p className="text-xs text-muted-foreground">
                      {localFormData.menuType === "PRICED"
                        ? "Price is required for Priced Menu."
                        : "Price is optional for Sample Menu and Free Form."}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="currency">Currency</Label>
                    <Select value={localFormData.currency} onValueChange={(value) => updateField("currency", value)}>
                      <SelectTrigger id="currency" className="rounded-lg">
                        <SelectValue placeholder="Select currency" />
                      </SelectTrigger>
                      <SelectContent>
                        {COUNTRY_OPTIONS.map((option) => (
                          <SelectItem key={option.currency} value={option.currency}>
                            {option.label} · {option.currency}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            ) : null}

            {step === 3 ? (
              <div className="space-y-2">
                <Label htmlFor="description">Full Menu Description</Label>
                <Textarea
                  id="description"
                  value={localFormData.description}
                  onChange={(event) => updateField("description", event.target.value)}
                  placeholder="Write or paste your full menu here. You can include starters, mains, desserts, dietary notes, serving style, and substitutions in your own words."
                  rows={14}
                  className="min-h-[320px] rounded-lg"
                />
                <p className="text-sm text-muted-foreground">
                  Write or paste your full menu here. You can include starters, mains, desserts, dietary notes, serving style, and substitutions in your own words. You do not need to split the menu into sections.
                </p>
              </div>
            ) : null}

            {step === 4 ? (
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label>Menu image</Label>
                  <ImageUpload
                    value={localFormData.menuImage}
                    onChange={(url) => updateField("menuImage", url)}
                    onRemove={() => updateField("menuImage", "")}
                    className="rounded-lg border-border shadow-none"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="eventType">Best for / Event type</Label>
                  <Input
                    id="eventType"
                    value={localFormData.eventType}
                    onChange={(event) => updateField("eventType", event.target.value)}
                    placeholder="e.g. Private dinner, brunch party, festive event"
                    className="rounded-lg"
                  />
                </div>
              </div>
            ) : null}

            {activeError ? <p className="text-sm text-destructive">{activeError}</p> : null}

            <DialogFooter className="gap-2 pt-2 sm:justify-between">
              <div className="flex gap-2">
                {step > 1 ? (
                  <Button type="button" variant="outline" onClick={handleBack} className="rounded-lg">
                    <ArrowLeft className="mr-2 size-4" />
                    Back
                  </Button>
                ) : null}
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="rounded-lg">
                  Cancel
                </Button>
                {step < 4 ? (
                  <Button type="button" onClick={handleNext} className="rounded-lg">
                    Next
                    <ArrowRight className="ml-2 size-4" />
                  </Button>
                ) : (
                  <Button type="button" disabled={saving} onClick={handleFinalSubmit} className="rounded-lg">
                    {saving ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        <span>Saving</span>
                      </>
                    ) : (
                      <span>{isEdit ? "Save Menu" : "Create Menu"}</span>
                    )}
                  </Button>
                )}
              </div>
            </DialogFooter>
          </div>

          <aside className="border-t border-border bg-muted/20 p-6 lg:border-l lg:border-t-0">
            <div className="space-y-4 rounded-2xl border border-border bg-background p-4 shadow-sm">
              <div>
                <p className="text-sm font-medium text-foreground">Review</p>
                <p className="text-sm text-muted-foreground">
                  Use free-form descriptions so clients can understand your menu in your own words.
                </p>
              </div>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Title</p>
                  <p className="font-medium text-foreground">{localFormData.title || "Untitled menu"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Cuisine</p>
                  <p className="font-medium text-foreground">{localFormData.cuisineType || "Not selected"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Menu type</p>
                  <p className="font-medium text-foreground">
                    {MENU_TYPE_OPTIONS.find((option) => option.value === localFormData.menuType)?.title ?? "Free Form"}
                  </p>
                </div>
                {localFormData.menuType === "PRICED" && localFormData.price.trim() ? (
                  <div>
                    <p className="text-muted-foreground">Price</p>
                    <p className="font-medium text-foreground">{localFormData.currency} {localFormData.price}</p>
                  </div>
                ) : null}
                {localFormData.eventType.trim() ? (
                  <div>
                    <p className="text-muted-foreground">Best for</p>
                    <p className="font-medium text-foreground">{localFormData.eventType}</p>
                  </div>
                ) : null}
                <div>
                  <p className="text-muted-foreground">Content preview</p>
                  <div className="space-y-2 whitespace-pre-wrap rounded-xl bg-muted/40 p-3 text-sm text-foreground">
                    {previewLines.length > 0 ? previewLines.map((line, index) => <p key={`${line}-${index}`}>{line}</p>) : <p className="text-muted-foreground">Your menu preview will appear here.</p>}
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-4 rounded-2xl border border-border bg-background p-4 text-sm text-muted-foreground shadow-sm">
              Recommended minimum: keep at least 5 menus on your profile. Maximum allowed: 20 menus.
            </div>
          </aside>
        </div>
      </DialogContent>
    </Dialog>
  )
}
