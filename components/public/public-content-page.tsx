import Link from "next/link";
import Image from "next/image";
import { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { PublicPageHero } from "@/components/public/public-page-hero";

export function PublicContentPage({
  eyebrow,
  title,
  description,
  children,
  primaryCta,
  secondaryCta,
  image,
  imageAlt,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  primaryCta?: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
  image?: string;
  imageAlt?: string;
}) {
  return (
    <div className="bg-background">
      <PublicPageHero
        eyebrow={eyebrow}
        title={title}
        description={description}
        actions={
          primaryCta || secondaryCta ? (
            <>
              {primaryCta ? (
                <Button asChild className="brand-gradient-button border-0 shadow-lg shadow-primary/20">
                  <Link href={primaryCta.href}>{primaryCta.label}</Link>
                </Button>
              ) : null}
              {secondaryCta ? (
                <Button asChild variant="outline" className="border-border/70 bg-background/80">
                  <Link href={secondaryCta.href}>{secondaryCta.label}</Link>
                </Button>
              ) : null}
            </>
          ) : undefined
        }
      />
      <section className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
        <div className="grid overflow-hidden rounded-[32px] border border-border/60 bg-background/90 shadow-sm shadow-black/5 lg:grid-cols-[0.95fr_1.05fr]">
          {image ? (
            <div className="relative min-h-[260px] lg:min-h-full">
              <Image src={image} alt={imageAlt ?? title} fill className="object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
            </div>
          ) : null}
          <div className="grid gap-6 p-7 sm:p-8 md:grid-cols-2">
            {children}
          </div>
        </div>
      </section>
    </div>
  );
}
