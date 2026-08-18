export const OFFICIAL_WEBSITE_URL = "https://chefachef.co.uk";

export function getConfiguredAppBaseUrl() {
  return process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_BASE_URL ?? OFFICIAL_WEBSITE_URL;
}
