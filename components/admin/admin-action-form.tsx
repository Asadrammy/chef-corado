"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

type Field = {
  name: string
  label?: string
  type?: "text" | "email" | "date" | "datetime-local" | "hidden" | "select" | "textarea" | "checkbox"
  defaultValue?: string | number | boolean | null
  placeholder?: string
  nullable?: boolean
  options?: { label: string; value: string }[]
}

export function AdminActionForm({
  endpoint,
  method = "PATCH",
  fields,
  submitLabel,
  compact = false,
}: {
  endpoint: string
  method?: "POST" | "PATCH" | "DELETE"
  fields: Field[]
  submitLabel: string
  compact?: boolean
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function onSubmit(formData: FormData) {
    setLoading(true)
    setMessage(null)

    const body: Record<string, unknown> = {}
    for (const field of fields) {
      if (field.type === "checkbox") {
        body[field.name] = formData.get(field.name) === "on"
        continue
      }

      const raw = formData.get(field.name)
      if (raw === null || raw === "") {
        body[field.name] = field.nullable ? null : undefined
      } else {
        body[field.name] = field.type === "datetime-local" ? new Date(String(raw)).toISOString() : raw
      }
    }

    try {
      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: method === "DELETE" ? undefined : JSON.stringify(body),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(payload?.error ? JSON.stringify(payload.error) : "Request failed")
      }
      setMessage("Saved")
      router.refresh()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Request failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form action={onSubmit} className={compact ? "grid gap-3 sm:grid-cols-2" : "grid gap-3 md:grid-cols-2"}>
      {fields.map((field) => {
        if (field.type === "hidden") {
          return <input key={field.name} type="hidden" name={field.name} defaultValue={String(field.defaultValue ?? "")} />
        }

        const id = `${endpoint}-${field.name}`.replace(/[^a-zA-Z0-9_-]/g, "-")
        const label = field.label ?? field.name
        const defaultValue = field.defaultValue === null || field.defaultValue === undefined ? "" : String(field.defaultValue)

        return (
          <div key={field.name} className="space-y-1.5">
            <Label htmlFor={id} className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              {label}
            </Label>
            {field.type === "textarea" ? (
              <Textarea id={id} name={field.name} defaultValue={defaultValue} placeholder={field.placeholder} className="min-h-20 rounded-md" />
            ) : field.type === "select" ? (
              <select
                id={id}
                name={field.name}
                defaultValue={defaultValue}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm transition-colors focus:border-primary"
              >
                {field.nullable ? <option value="">None</option> : null}
                {field.options?.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : field.type === "checkbox" ? (
              <Input id={id} name={field.name} type="checkbox" defaultChecked={Boolean(field.defaultValue)} className="h-5 w-5 rounded border-border" />
            ) : (
              <Input id={id} name={field.name} type={field.type ?? "text"} defaultValue={defaultValue} placeholder={field.placeholder} className="h-9 rounded-md shadow-sm transition-colors focus:border-primary" />
            )}
          </div>
        )
      })}
      <div className={compact ? "sm:col-span-2 border-t border-border pt-3" : "md:col-span-2 border-t border-border pt-3"}>
        <Button type="submit" size="sm" disabled={loading} className="h-9 rounded-md shadow-sm">
          {loading ? "Saving..." : submitLabel}
        </Button>
        {message ? <p className="mt-1 text-xs text-muted-foreground">{message}</p> : null}
      </div>
    </form>
  )
}
