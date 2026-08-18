export const TERMS_VERSION = "2026-04";
export const INSURANCE_VERSION = "2026-04";
export const PLATFORM_DEFAULT_COUNTRY = "GB";
export const PLATFORM_DEFAULT_CURRENCY = "GBP";
export const PLATFORM_DEFAULT_LOCALE = "en-GB";
export const COMMUNICATION_POLICY = "Keep all communication, booking coordination, and payments inside the platform. Sharing personal contact details or arranging active bookings outside the site is not allowed under the platform terms.";
export const COMMUNICATION_POLICY_EXTENDED = "All communication, booking coordination, proposals, and payment arrangements for active transactions must remain inside the platform. Sharing personal contact details, moving bookings off-platform, or attempting to bypass platform checkout is not allowed under the platform terms.";
export const CHEF_LEGAL_ACKNOWLEDGEMENT = "Chefs must confirm their legal right to work in the UK, confirm Level 2 Food Hygiene & Safety, and keep their legal acknowledgements current before offering services. ChefaChef maintains platform-level public liability coverage for qualifying official platform bookings; private or off-platform work is not covered by that booking policy.";
export const FUTURE_CALLING_PROVIDER = "Twilio Voice";

export {
  COUNTRY_OPTIONS,
  EVENT_TYPE_OPTIONS,
  SERVICE_ENGINE_VERSION as SERVICE_TYPE_REGISTRY_VERSION,
  SERVICE_TYPE_CONFIG as SERVICE_TYPE_OPTIONS,
  CHILD_BILLING_RULE_COPY,
  calculateGuestComposition,
  getBudgetWarning,
  getCountryOption,
  getCurrencyForCountry,
  getLocaleForCountry,
  getPricingRule,
  resolvePricingState,
  getServiceTypeConfig as getServiceTypeOption,
  getServiceTypeLabel,
  validateServiceSpecificAnswers,
} from "@/lib/service-engine";

export {
  CUISINE_ALIASES,
  CUISINE_OPTIONS,
  CUISINE_REGISTRY,
  CUISINE_REGISTRY_VERSION,
  CUISINE_TYPES,
  getCuisineOptionsForContext,
  isCuisineType,
  normalizeCuisineType,
} from "@/lib/cuisine-registry";

import {
  COUNTRY_OPTIONS,
  EVENT_TYPE_OPTIONS,
  SERVICE_TYPE_CONFIG,
} from "@/lib/service-engine";
import { CUISINE_TYPES } from "@/lib/cuisine-registry";

// Canonical cuisine labels now live in lib/cuisine-registry.ts and include Canap\u00e9 Party, British, Pan Asian, and Afternoon Tea.

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
