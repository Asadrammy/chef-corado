import { Metadata } from "next";
import { APPROVED_PUBLIC_CONTACT } from "@/lib/marketplace-rules";
import { getConfiguredAppBaseUrl } from "@/lib/site-config";

export type PublicNavItem = {
  label: string;
  href: string;
};

export type FooterItem = {
  label: string;
  href?: string;
  value?: string;
  note?: string;
  disabled?: boolean;
};

export type FooterSection = {
  title: string;
  items: FooterItem[];
};

export const publicNavItems: PublicNavItem[] = [
  { label: "Browse Chefs", href: "/browse-chefs" },
  { label: "Experiences", href: "/experiences" },
  { label: "Reviews", href: "/reviews" },
  { label: "Gift Cards", href: "/gift-cards" },
  { label: "Pricing", href: "/pricing" },
];

export const authNavItems = {
  customerLogin: { label: "Customer Login", href: "/login?role=CLIENT" },
  customerSignup: { label: "Customer Signup", href: "/register?role=CLIENT" },
  chefLogin: { label: "Chef Login", href: "/login?role=CHEF" },
  chefSignup: { label: "Chef Signup", href: "/register?role=CHEF" },
  adminLogin: { label: "Admin Login", href: "/login?role=ADMIN" },
};

export const publicCtaItems = {
  becomeChef: { label: "Become a Chef", href: "/become-a-chef" },
  findLocalChef: { label: "Find Local Chef", href: "/find-local-chef" },
};

function configuredFooterItem(label: string, href?: string | null, note = "Configuration required", value?: string | null): FooterItem {
  const link = href?.trim();
  const displayValue = value?.trim();
  return link ? { label, href: link, value: displayValue } : { label, note, disabled: true, value: displayValue };
}

function activeFooterItem(label: string, href?: string | null, value?: string | null): FooterItem | null {
  const link = href?.trim();
  if (!link) return null;
  const displayValue = value?.trim();
  return { label, href: link, value: displayValue };
}

const contactPhone = process.env.NEXT_PUBLIC_CONTACT_PHONE?.trim() || APPROVED_PUBLIC_CONTACT.phone;
const contactEmail = process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim() || APPROVED_PUBLIC_CONTACT.email;
const contactWhatsappActive = process.env.NEXT_PUBLIC_CONTACT_WHATSAPP_ACTIVE === "true";
const contactWhatsapp = contactWhatsappActive
  ? process.env.NEXT_PUBLIC_CONTACT_WHATSAPP_URL?.trim() || APPROVED_PUBLIC_CONTACT.whatsappUrl
  : "";
const socialFacebook = process.env.NEXT_PUBLIC_SOCIAL_FACEBOOK_URL?.trim() || APPROVED_PUBLIC_CONTACT.facebookUrl;
const socialInstagram = process.env.NEXT_PUBLIC_SOCIAL_INSTAGRAM_URL?.trim() || APPROVED_PUBLIC_CONTACT.instagramUrl;
const socialX = process.env.NEXT_PUBLIC_SOCIAL_X_URL?.trim() || APPROVED_PUBLIC_CONTACT.xUrl;
const socialYoutube = process.env.NEXT_PUBLIC_SOCIAL_YOUTUBE_URL?.trim() || APPROVED_PUBLIC_CONTACT.youtubeUrl;

const contactItems = [
  activeFooterItem("WhatsApp", contactWhatsapp, APPROVED_PUBLIC_CONTACT.phoneDisplay),
  configuredFooterItem("Telephone", contactPhone ? `tel:${contactPhone}` : null, "Configuration required", APPROVED_PUBLIC_CONTACT.phoneDisplay),
  configuredFooterItem("Email", contactEmail ? `mailto:${contactEmail}` : null, "Configuration required", contactEmail),
].filter((item): item is FooterItem => Boolean(item));

const socialItems = [
  activeFooterItem("Facebook", socialFacebook),
  activeFooterItem("Instagram", socialInstagram),
  activeFooterItem("X/Twitter", socialX),
  activeFooterItem("YouTube", socialYoutube),
].filter((item): item is FooterItem => Boolean(item));

export const footerSections: FooterSection[] = [
  {
    title: "Main",
    items: [
      { label: "Our Story", href: "/our-story" },
      { label: "Private Chefs", href: "/browse-chefs" },
      { label: "Explore Chefs", href: "/browse-chefs" },
      { label: "Gift Cards", href: "/gift-cards" },
      { label: "FAQ", href: "/faq" },
    ],
  },
  {
    title: "Community",
    items: [
      { label: "Chef Register", href: "/register?role=CHEF" },
      { label: "Careers", href: "/careers" },
      { label: "Property Manager Affiliate", href: "/property-manager-affiliate" },
      { label: "Be a Venue Partner", href: "/be-a-venue-partner" },
      { label: "Blog", href: "/blog" },
    ],
  },
  {
    title: "Contact",
    items: contactItems,
  },
  {
    title: "Social",
    items: socialItems,
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

export const appBaseUrl = getConfiguredAppBaseUrl();

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
      siteName: "ChefaChef",
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

export async function fetchFromApp<T>(path: string, timeoutMs = 2500): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(getAbsoluteUrl(path), {
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch ${path}`);
    }

    return response.json() as Promise<T>;
  } finally {
    clearTimeout(timeout);
  }
}
