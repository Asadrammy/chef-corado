import { type ClassValue, clsx } from "clsx";
import { Metadata } from "next";
import { twMerge } from "tailwind-merge";
import { getConfiguredAppBaseUrl } from "@/lib/site-config";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateAvatarFallback(string: string) {
  const names = string.split(" ").filter((name: string) => name);
  const mapped = names.map((name: string) => name.charAt(0).toUpperCase());

  return mapped.join("");
}

export function generateMeta({
  title,
  description,
}: {
  title: string;
  description: string;
}): Metadata {
  const baseUrl = getConfiguredAppBaseUrl();
  const imageUrl = new URL("/seo.jpg", baseUrl).toString();

  return {
    metadataBase: new URL(baseUrl),
    title: `${title} - ChefaChef`,
    description: description,
    openGraph: {
      title: `${title} - ChefaChef`,
      description,
      url: baseUrl,
      siteName: "ChefaChef",
      images: [imageUrl],
    }
  };
}
