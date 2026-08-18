"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";

export type FaqItem = {
  question: string;
  answer: string;
  category: string;
};

export function FaqList({ items }: { items: FaqItem[] }) {
  const [query, setQuery] = useState("");

  const filteredItems = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return items;

    return items.filter((item) =>
      [item.question, item.answer, item.category].some((value) =>
        value.toLowerCase().includes(normalized)
      )
    );
  }, [items, query]);

  const groupedItems = useMemo(() => {
    return filteredItems.reduce<Record<string, FaqItem[]>>((groups, item) => {
      groups[item.category] = [...(groups[item.category] ?? []), item];
      return groups;
    }, {});
  }, [filteredItems]);

  return (
    <div className="space-y-6 md:col-span-2">
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search registration, booking, payments, Multi-Day, invoices, or support"
          className="h-12 rounded-2xl pl-11"
          aria-label="Search frequently asked questions"
        />
      </div>

      {Object.keys(groupedItems).length ? (
        <div className="grid gap-6 lg:grid-cols-2">
          {Object.entries(groupedItems).map(([category, categoryItems]) => (
            <section key={category} className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
                {category}
              </h2>
              {categoryItems.map((item) => (
                <details key={item.question} className="group rounded-lg border border-border bg-background/80 p-4">
                  <summary className="cursor-pointer text-base font-semibold text-foreground marker:text-primary">
                    {item.question}
                  </summary>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{item.answer}</p>
                </details>
              ))}
            </section>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-background/80 p-6 text-center">
          <p className="font-semibold text-foreground">No FAQ answers matched your search.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Try a different keyword or contact ChefaChef support from the footer.
          </p>
        </div>
      )}
    </div>
  );
}
