"use client"

import type { ReactNode } from "react"
import { ArrowRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

export function AdminReviewDrawer({
  title,
  description,
  triggerLabel = "Review",
  children,
}: {
  title: string
  description?: string
  triggerLabel?: string
  children: ReactNode
}) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 rounded-md">
          <span>{triggerLabel}</span>
          <ArrowRight className="ml-1.5 size-3.5" aria-hidden="true" />
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[calc(100vw-1rem)] overflow-y-auto p-0 sm:max-w-xl lg:max-w-2xl">
        <SheetHeader className="border-b border-border px-6 py-5">
          <SheetTitle className="text-lg font-semibold tracking-tight">{title}</SheetTitle>
          {description ? <SheetDescription className="max-w-xl leading-6">{description}</SheetDescription> : null}
        </SheetHeader>
        <div className="space-y-5 px-6 py-5">{children}</div>
      </SheetContent>
    </Sheet>
  )
}

export function AdminDrawerSection({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-sm shadow-black/[0.03]">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {description ? <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p> : null}
      </div>
      {children}
    </section>
  )
}
