export const TERMS_VERSION = "2026-04";
export const INSURANCE_VERSION = "2026-04";
export const PLATFORM_DEFAULT_COUNTRY = "GB";
export const PLATFORM_DEFAULT_CURRENCY = "GBP";
export const PLATFORM_DEFAULT_LOCALE = "en-GB";
export const COMMUNICATION_POLICY = "Keep all communication, booking coordination, and payments inside the platform. Sharing personal contact details or arranging active bookings outside the site is not allowed under the platform terms.";
export const COMMUNICATION_POLICY_EXTENDED = "All communication, booking coordination, proposals, and payment arrangements for active transactions must remain inside the platform. Sharing personal contact details, moving bookings off-platform, or attempting to bypass platform checkout is not allowed under the platform terms.";
export const CHEF_LEGAL_ACKNOWLEDGEMENT = "Chefs must acknowledge the platform's insurance and legal requirements before offering services. Keep your acknowledgement current so your profile, bookings, and payout readiness remain compliant.";
export const FUTURE_CALLING_PROVIDER = "Twilio Voice";

export const COUNTRY_OPTIONS = [
  { value: "GB", label: "United Kingdom", currency: "GBP", locale: "en-GB" },
  { value: "US", label: "United States", currency: "USD", locale: "en-US" },
] as const;

export const EVENT_TYPES = [
  "Birthday",
  "Get Together",
  "Anniversary",
  "Corporate Event",
  "Family Dinner",
  "Wedding",
  "Cooking Class",
  "Other",
] as const;

export const SERVICE_TYPES = [
  "DINING",
  "COOKING_CLASS",
] as const;

export const COOKING_CLASS_TYPES = [
  "Hands-On",
  "Demonstration",
  "Kids Class",
  "Private Group",
  "Corporate Team Building",
  "Other",
] as const;

export const CUISINE_TYPES = [
  "British",
  "Italian",
  "French",
  "Mediterranean",
  "Indian",
  "Japanese",
  "Chinese",
  "Thai",
  "Mexican",
  "Middle Eastern",
  "African",
  "Caribbean",
  "American",
  "Vegetarian",
  "Vegan",
  "Fusion",
  "Other",
] as const;

export const DIETARY_REQUIREMENTS = [
  "Vegetarian",
  "Vegan",
  "Gluten Free",
  "Dairy Free",
  "Nut Free",
  "Halal",
  "Kosher",
  "Pescatarian",
  "Low Carb",
  "No Pork",
  "No Shellfish",
  "Other",
] as const;

export type CountryCode = typeof COUNTRY_OPTIONS[number]["value"];
export type EventType = typeof EVENT_TYPES[number];
export type ServiceType = typeof SERVICE_TYPES[number];
export type CookingClassType = typeof COOKING_CLASS_TYPES[number];
export type CuisineType = typeof CUISINE_TYPES[number];
export type DietaryRequirement = typeof DIETARY_REQUIREMENTS[number];

export function isCurrentTermsVersion(version?: string | null) {
  return version === TERMS_VERSION;
}

export function isCurrentInsuranceVersion(version?: string | null) {
  return version === INSURANCE_VERSION;
}

export function formatAcceptanceStatus(date?: string | Date | null, version?: string | null, currentVersion?: string) {
  return {
    accepted: Boolean(date),
    current: Boolean(date) && (!currentVersion || version === currentVersion),
    acceptedAt: date ? new Date(date) : null,
    version: version ?? null,
  };
}

export function getCountryOption(countryCode?: string) {
  return COUNTRY_OPTIONS.find((option) => option.value === countryCode) ?? COUNTRY_OPTIONS[0];
}

export function getCurrencyForCountry(countryCode?: string) {
  return getCountryOption(countryCode).currency;
}

export function getLocaleForCountry(countryCode?: string) {
  return getCountryOption(countryCode).locale;
}
