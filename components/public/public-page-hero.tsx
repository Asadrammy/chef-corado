import { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function PublicPageHero({
  eyebrow,
  title,
  description,
  actions,
  centered = false,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
  centered?: boolean;
}) {
  return (
    <section className="border-b border-border/50 bg-[radial-gradient(circle_at_top_left,hsl(var(--brand-primary)/0.12),transparent_32%),radial-gradient(circle_at_top_right,hsl(var(--brand-highlight)/0.10),transparent_28%),linear-gradient(180deg,hsl(var(--background)),hsl(var(--brand-surface)/0.55))]">
      <div className={cn("mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-16 sm:px-6 lg:px-8 lg:py-20", centered && "items-center text-center")}>
        <div className="space-y-4">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary/80">{eyebrow}</p>
          <h1 className="max-w-4xl break-words text-4xl font-semibold tracking-tight text-foreground sm:text-5xl lg:text-6xl">{title}</h1>
          <p className="max-w-3xl text-base leading-7 text-muted-foreground sm:text-lg">{description}</p>
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
      </div>
    </section>
  );
}
