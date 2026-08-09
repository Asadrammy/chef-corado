export const TERMS_VERSION = "2026-04";
export const INSURANCE_VERSION = "2026-04";
export const PLATFORM_DEFAULT_COUNTRY = "GB";
export const PLATFORM_DEFAULT_CURRENCY = "GBP";
export const PLATFORM_DEFAULT_LOCALE = "en-GB";
export const COMMUNICATION_POLICY = "Keep all communication, booking coordination, and payments inside the platform. Sharing personal contact details or arranging active bookings outside the site is not allowed under the platform terms.";
export const COMMUNICATION_POLICY_EXTENDED = "All communication, booking coordination, proposals, and payment arrangements for active transactions must remain inside the platform. Sharing personal contact details, moving bookings off-platform, or attempting to bypass platform checkout is not allowed under the platform terms.";
export const CHEF_LEGAL_ACKNOWLEDGEMENT = "Chefs must confirm their legal right to work in the UK, confirm Level 2 Food Hygiene & Safety, and keep their legal acknowledgements current before offering services. Platform insurance is handled after approval by the website owner and is not uploaded by chefs in the dashboard.";
export const FUTURE_CALLING_PROVIDER = "Twilio Voice";

export {
  COUNTRY_OPTIONS,
  EVENT_TYPE_OPTIONS,
  SERVICE_ENGINE_VERSION as SERVICE_TYPE_REGISTRY_VERSION,
  SERVICE_TYPE_CONFIG as SERVICE_TYPE_OPTIONS,
  calculateGuestComposition,
  getBudgetWarning,
  getCountryOption,
  getCurrencyForCountry,
  getLocaleForCountry,
  getPricingRule,
  getServiceTypeConfig as getServiceTypeOption,
  getServiceTypeLabel,
} from "@/lib/service-engine";

import {
  COUNTRY_OPTIONS,
  EVENT_TYPE_OPTIONS,
  SERVICE_TYPE_CONFIG,
} from "@/lib/service-engine";

export const EVENT_TYPES = EVENT_TYPE_OPTIONS.map((option) => option.label) as [
  typeof EVENT_TYPE_OPTIONS[number]["label"],
  ...typeof EVENT_TYPE_OPTIONS[number]["label"][],
];

export const LEGACY_EXPERIENCE_SERVICE_TYPES = [
  "DINING",
  "COOKING_CLASS",
] as const;

export const REQUEST_SERVICE_TYPES = SERVICE_TYPE_CONFIG.map((option) => option.id) as [
  typeof SERVICE_TYPE_CONFIG[number]["id"],
  ...typeof SERVICE_TYPE_CONFIG[number]["id"][],
];

export const SERVICE_TYPES = LEGACY_EXPERIENCE_SERVICE_TYPES;

export const COOKING_CLASS_TYPES = [
  "Hands-On",
  "Demonstration",
  "Kids Class",
  "Private Group",
  "Corporate Team Building",
  "Other",
] as const;

export const CUISINE_TYPES = [
  "Italian",
  "Indian",
  "BBQ",
  "British",
  "Pan Asian",
  "Fine Dining",
  "Japanese",
  "Mexican",
  "Middle Eastern",
  "Chinese",
  "Mediterranean",
  "Thai",
  "Spanish",
  "Greek",
  "Caribbean",
  "Modern European",
  "Meal Prep-Lunch and Dinner",
  "French",
  "Canapè Party",
  "Fusion",
  "Turkish",
  "Korean",
  "Meal Prep",
  "Malaysian",
  "Brunch",
  "Christmas",
  "Afternoon Tea",
  "Vietnamese",
  "Sri Lankan",
  "Brazilian",
  "Portuguese",
  "Cooking Class",
  "Peruvian",
  "American",
  "Lebanese",
  "Vegetarian",
  "Vegan",
  "Latin America",
  "Scottish",
  "Polish",
  "Micro Biotic",
  "Macro Biotic",
  "Nigerian",
  "Creole",
  "Russian",
  "Iraqi",
  "Morocco",
  "Moroccan",
  "Scandinavian",
  "Iranian",
  "German",
  "African",
  "Tapas",
  "Kids",
  "Group Experiences",
  "Filipino",
  "Argentinian",
  "Afghan",
  "Pakistani",
  "Georgian",
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
export type ServiceType = typeof REQUEST_SERVICE_TYPES[number];
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

export function getEventTypeOptionByLabel(label?: string | null) {
  return EVENT_TYPE_OPTIONS.find((option) => option.label === label) ?? null;
}
