import { Metadata } from "next";

export type PublicNavItem = {
  label: string;
  href: string;
};

export type FooterSection = {
  title: string;
  items: PublicNavItem[];
};

export const publicNavItems: PublicNavItem[] = [
  { label: "Browse Chefs", href: "/browse-chefs" },
  { label: "Experiences", href: "/experiences" },
  { label: "Reviews", href: "/reviews" },
  { label: "Gift Cards", href: "/gift-cards" },
  { label: "Pricing", href: "/pricing" },
  { label: "Find Local Chef", href: "/find-local-chef" },
];

export const authNavItems = {
  customerLogin: { label: "Customer Login", href: "/login?role=CLIENT" },
  customerSignup: { label: "Customer Signup", href: "/register?role=CLIENT" },
  chefLogin: { label: "Chef Login", href: "/login?role=CHEF" },
  chefSignup: { label: "Chef Signup", href: "/register?role=CHEF" },
};

export const footerSections: FooterSection[] = [
  {
    title: "Main",
    items: [
      { label: "Our Story", href: "/our-story" },
      { label: "Find Local Chef", href: "/find-local-chef" },
      { label: "Browse Chefs", href: "/browse-chefs" },
      { label: "Gift Cards", href: "/gift-cards" },
      { label: "FAQ", href: "/faq" },
    ],
  },
  {
    title: "Community",
    items: [
      { label: "Become a Chef", href: "/become-a-chef" },
      { label: "Careers", href: "/careers" },
      { label: "Property Manager Affiliate", href: "/property-manager-affiliate" },
      { label: "Be a Venue Partner", href: "/be-a-venue-partner" },
      { label: "Blog", href: "/blog" },
    ],
  },
  {
    title: "Contact",
    items: [
      { label: "WhatsApp", href: "https://wa.me/447000000000" },
      { label: "Telephone", href: "tel:+447000000000" },
      { label: "Email", href: "mailto:hello@chefmarketplace.com" },
    ],
  },
  {
    title: "Social",
    items: [
      { label: "Facebook", href: "https://facebook.com" },
      { label: "Instagram", href: "https://instagram.com" },
      { label: "Twitter/X", href: "https://x.com" },
      { label: "YouTube", href: "https://youtube.com" },
    ],
  },
];

export const publicRoutePrefixes = [
  "/browse-chefs",
  "/find-local-chef",
  "/pricing",
  "/gift-cards",
  "/become-a-chef",
  "/our-story",
  "/faq",
  "/blog",
  "/careers",
  "/property-manager-affiliate",
  "/be-a-venue-partner",
  "/reviews",
  "/chefs",
  "/experiences",
  "/privacy",
  "/terms",
];

export const publicExactRoutes = [
  "/",
  "/login",
  "/register",
  "/account-banned",
  "/legal/acceptance",
];

export const homepageCuisineHighlights = [
  {
    title: "Mediterranean",
    description: "Sunlit coastal menus, seafood, herbs, and generous sharing courses for elegant celebrations.",
    href: "/browse-chefs?query=Mediterranean",
    image: "/images/marketplace/cuisine-mediterranean.png",
  },
  {
    title: "Modern European",
    description: "Refined plated dining, tasting menus, wine-paired evenings, and chef-led service at home.",
    href: "/browse-chefs?query=European",
    image: "/images/marketplace/cuisine-modern-european.png",
  },
  {
    title: "Asian Fusion",
    description: "Layered sharing plates, hand-finished details, and intimate dinner-party theatre.",
    href: "/browse-chefs?query=Asian",
    image: "/images/marketplace/cuisine-asian-fusion.png",
  },
];

export const appBaseUrl = process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

export function getAbsoluteUrl(path: string) {
  return new URL(path, appBaseUrl).toString();
}

export function buildPublicMetadata({
  title,
  description,
  path,
}: {
  title: string;
  description: string;
  path: string;
}): Metadata {
  const url = getAbsoluteUrl(path);

  return {
    title,
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title,
      description,
      url,
      siteName: "Chef Marketplace",
      images: [
        {
          url: getAbsoluteUrl("/images/marketplace/seo-private-dining.png"),
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      locale: "en_GB",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [getAbsoluteUrl("/images/marketplace/seo-private-dining.png")],
    },
  };
}

export async function fetchFromApp<T>(path: string): Promise<T> {
  const response = await fetch(getAbsoluteUrl(path), {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${path}`);
  }

  return response.json() as Promise<T>;
}
