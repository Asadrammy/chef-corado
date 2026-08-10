import Link from "next/link";
import { Globe, Mail, MessageCircle, Phone } from "lucide-react";

import { footerSections } from "@/lib/public-site";

const footerIcons = {
  Email: Mail,
  Facebook: Globe,
  Instagram: Globe,
  Telephone: Phone,
  WhatsApp: MessageCircle,
  "X/Twitter": Globe,
  YouTube: Globe,
};

export function PublicFooter() {
  return (
    <footer className="border-t border-border/50 bg-[#07111f] text-white" aria-label="Public site footer">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-12 px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-2 xl:grid-cols-5">
          <div className="xl:col-span-1">
            <div className="max-w-sm space-y-4">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-white/60">ChefaChef</p>
              <h2 className="text-2xl font-semibold tracking-tight text-white">Private dining, beautifully hosted.</h2>
              <p className="text-sm leading-6 text-white/68">
                Discover vetted chefs, compare cuisines, and plan intimate dinners, milestone celebrations, and chef-led experiences with a calmer sense of occasion.
              </p>
              <div className="rounded-3xl border border-white/10 bg-white/6 p-4 text-sm text-white/72">
                <p className="font-semibold text-white">Concierge enquiries</p>
                <p className="mt-1">For special requests, gifting, venues, and partnership introductions.</p>
              </div>
            </div>
          </div>

          {footerSections.map((section) => (
            <nav key={section.title} className="space-y-5" aria-label={`${section.title} footer links`}>
              <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-white/72">{section.title}</h3>
              <ul className="space-y-3.5 text-sm text-white/60">
                {section.items.map((item) => {
                  const Icon = footerIcons[item.label as keyof typeof footerIcons];
                  const external = item.href?.startsWith("http") || item.href?.startsWith("mailto:") || item.href?.startsWith("tel:");
                  const content = (
                    <span className="inline-flex min-h-5 items-center gap-2">
                      {Icon ? <Icon className="h-4 w-4 shrink-0" aria-hidden="true" /> : null}
                      <span>{item.label}</span>
                      {item.value ? <span className="text-xs text-white/45">{item.value}</span> : null}
                      {item.note ? <span className="text-xs text-white/35">{item.note}</span> : null}
                    </span>
                  );

                  return (
                    <li key={`${section.title}-${item.label}-${item.href ?? item.note}`}>
                      {item.href ? (
                        <Link
                          href={item.href}
                          target={external ? "_blank" : undefined}
                          rel={external ? "noopener noreferrer" : undefined}
                          className="transition-colors hover:text-white"
                        >
                          {content}
                        </Link>
                      ) : (
                        <span className="cursor-default text-white/38" aria-disabled="true">
                          {content}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </nav>
          ))}
        </div>

        <div className="flex flex-col gap-4 border-t border-white/10 pt-8 text-sm text-white/55 md:flex-row md:items-center md:justify-between">
          <p>Copyright {new Date().getFullYear()} ChefaChef. Private chef discovery and beautifully hosted events.</p>
          <div className="flex flex-wrap items-center gap-4" aria-label="Legal footer links">
            <Link href="/privacy" className="transition-colors hover:text-white">Privacy</Link>
            <Link href="/terms/client" className="transition-colors hover:text-white">Client Terms</Link>
            <Link href="/terms/chef" className="transition-colors hover:text-white">Chef Terms</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
