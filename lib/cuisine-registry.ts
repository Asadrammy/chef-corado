export type CuisineKind = "cuisine" | "service_event" | "style" | "dietary_lifestyle"
export type CuisineDisplayContext = "request" | "multi_day" | "menu" | "profile" | "search" | "inspiration"

export type CuisineRegistryEntry = {
  id: string
  label: string
  normalizedValue: string
  aliases?: readonly string[]
  kind: CuisineKind
  displayContexts: readonly CuisineDisplayContext[]
}

const ALL_CONTEXTS: readonly CuisineDisplayContext[] = ["request", "multi_day", "menu", "profile", "search", "inspiration"]

export const CUISINE_REGISTRY = [
  { id: "italian", label: "Italian", normalizedValue: "Italian", kind: "cuisine" },
  { id: "indian", label: "Indian", normalizedValue: "Indian", kind: "cuisine" },
  { id: "bbq", label: "BBQ", normalizedValue: "BBQ", aliases: ["Barbecue", "Barbecue / BBQ"], kind: "service_event" },
  { id: "british", label: "British", normalizedValue: "British", kind: "cuisine" },
  { id: "pan-asian", label: "Pan Asian", normalizedValue: "Pan Asian", aliases: ["Pan-Asian"], kind: "cuisine" },
  { id: "fine-dining", label: "Fine Dining", normalizedValue: "Fine Dining", kind: "style" },
  { id: "japanese", label: "Japanese", normalizedValue: "Japanese", kind: "cuisine" },
  { id: "mexican", label: "Mexican", normalizedValue: "Mexican", kind: "cuisine" },
  { id: "middle-eastern", label: "Middle Eastern", normalizedValue: "Middle Eastern", kind: "cuisine" },
  { id: "chinese", label: "Chinese", normalizedValue: "Chinese", kind: "cuisine" },
  { id: "mediterranean", label: "Mediterranean", normalizedValue: "Mediterranean", kind: "cuisine" },
  { id: "thai", label: "Thai", normalizedValue: "Thai", kind: "cuisine" },
  { id: "spanish", label: "Spanish", normalizedValue: "Spanish", kind: "cuisine" },
  { id: "greek", label: "Greek", normalizedValue: "Greek", kind: "cuisine" },
  { id: "caribbean", label: "Caribbean", normalizedValue: "Caribbean", kind: "cuisine" },
  { id: "modern-european", label: "Modern European", normalizedValue: "Modern European", kind: "style" },
  { id: "meal-prep-lunch-dinner", label: "Meal Prep - Lunch & Dinner", normalizedValue: "Meal Prep - Lunch & Dinner", aliases: ["Meal Prep-Lunch and Dinner", "Meal Prep Lunch & Dinner", "Meal Prep - Lunch and Dinner", "Food Prep / Lunch & Dinner"], kind: "service_event" },
  { id: "french", label: "French", normalizedValue: "French", kind: "cuisine" },
  { id: "canape-party", label: "Canapé Party", normalizedValue: "Canapé Party", aliases: ["Canapè Party", "Canape Party", "Canap\u00c3\u00a9 Party", "CanapÃ© Party"], kind: "service_event" },
  { id: "fusion", label: "Fusion", normalizedValue: "Fusion", aliases: ["Asian Fusion"], kind: "style" },
  { id: "turkish", label: "Turkish", normalizedValue: "Turkish", kind: "cuisine" },
  { id: "korean", label: "Korean", normalizedValue: "Korean", kind: "cuisine" },
  { id: "meal-prep", label: "Meal Prep", normalizedValue: "Meal Prep", kind: "service_event" },
  { id: "malaysian", label: "Malaysian", normalizedValue: "Malaysian", kind: "cuisine" },
  { id: "brunch", label: "Brunch", normalizedValue: "Brunch", kind: "service_event" },
  { id: "christmas", label: "Christmas", normalizedValue: "Christmas", kind: "service_event" },
  { id: "afternoon-tea", label: "Afternoon Tea", normalizedValue: "Afternoon Tea", kind: "service_event" },
  { id: "vietnamese", label: "Vietnamese", normalizedValue: "Vietnamese", kind: "cuisine" },
  { id: "sri-lankan", label: "Sri Lankan", normalizedValue: "Sri Lankan", kind: "cuisine" },
  { id: "brazilian", label: "Brazilian", normalizedValue: "Brazilian", kind: "cuisine" },
  { id: "portuguese", label: "Portuguese", normalizedValue: "Portuguese", kind: "cuisine" },
  { id: "cooking-class", label: "Cooking Class", normalizedValue: "Cooking Class", kind: "service_event" },
  { id: "peruvian", label: "Peruvian", normalizedValue: "Peruvian", kind: "cuisine" },
  { id: "american", label: "American", normalizedValue: "American", kind: "cuisine" },
  { id: "lebanese", label: "Lebanese", normalizedValue: "Lebanese", kind: "cuisine" },
  { id: "vegetarian", label: "Vegetarian", normalizedValue: "Vegetarian", kind: "dietary_lifestyle" },
  { id: "vegan", label: "Vegan", normalizedValue: "Vegan", kind: "dietary_lifestyle" },
  { id: "latin-american", label: "Latin American", normalizedValue: "Latin American", aliases: ["Latin America"], kind: "cuisine" },
  { id: "scottish", label: "Scottish", normalizedValue: "Scottish", kind: "cuisine" },
  { id: "polish", label: "Polish", normalizedValue: "Polish", kind: "cuisine" },
  { id: "macro-biotic", label: "Macro Biotic", normalizedValue: "Macro Biotic", aliases: ["Micro Biotic"], kind: "dietary_lifestyle" },
  { id: "nigerian", label: "Nigerian", normalizedValue: "Nigerian", kind: "cuisine" },
  { id: "creole-cajun", label: "Creole / Cajun", normalizedValue: "Creole / Cajun", aliases: ["Creole", "Cajun/Creole", "Cajun / Creole"], kind: "cuisine" },
  { id: "russian", label: "Russian", normalizedValue: "Russian", kind: "cuisine" },
  { id: "iraqi", label: "Iraqi", normalizedValue: "Iraqi", kind: "cuisine" },
  { id: "moroccan", label: "Moroccan", normalizedValue: "Moroccan", aliases: ["Morocco"], kind: "cuisine" },
  { id: "scandinavian", label: "Scandinavian", normalizedValue: "Scandinavian", kind: "cuisine" },
  { id: "iranian", label: "Iranian", normalizedValue: "Iranian", kind: "cuisine" },
  { id: "german", label: "German", normalizedValue: "German", kind: "cuisine" },
  { id: "african", label: "African", normalizedValue: "African", kind: "cuisine" },
  { id: "tapas", label: "Tapas", normalizedValue: "Tapas", kind: "style" },
  { id: "kids", label: "Kids", normalizedValue: "Kids", kind: "service_event" },
  { id: "group-experiences", label: "Group Experiences", normalizedValue: "Group Experiences", kind: "service_event" },
  { id: "filipino", label: "Filipino", normalizedValue: "Filipino", kind: "cuisine" },
  { id: "argentinian", label: "Argentinian", normalizedValue: "Argentinian", kind: "cuisine" },
  { id: "afghan", label: "Afghan", normalizedValue: "Afghan", kind: "cuisine" },
  { id: "pakistani", label: "Pakistani", normalizedValue: "Pakistani", kind: "cuisine" },
  { id: "georgian", label: "Georgian", normalizedValue: "Georgian", kind: "cuisine" },
] satisfies readonly Omit<CuisineRegistryEntry, "displayContexts">[]

export const CUISINE_REGISTRY_VERSION = "2026-08-13-client-coverage"

export const CUISINE_OPTIONS = CUISINE_REGISTRY.map((entry) => ({
  ...entry,
  displayContexts: ALL_CONTEXTS,
})) satisfies readonly CuisineRegistryEntry[]

export const CUISINE_TYPES = CUISINE_OPTIONS.map((entry) => entry.label) as [
  typeof CUISINE_OPTIONS[number]["label"],
  ...typeof CUISINE_OPTIONS[number]["label"][],
]

const aliasEntries = CUISINE_OPTIONS.flatMap((entry) => [
  [entry.label, entry.label],
  [entry.normalizedValue, entry.label],
  ...(entry.aliases ?? []).map((alias) => [alias, entry.label] as const),
])

export const CUISINE_ALIASES = Object.fromEntries(aliasEntries) as Record<string, typeof CUISINE_TYPES[number]>

export function normalizeCuisineType(value: string) {
  const trimmed = value.trim()
  const direct = CUISINE_ALIASES[trimmed]
  if (direct) return direct

  const lower = trimmed.toLowerCase()
  const match = Object.entries(CUISINE_ALIASES).find(([alias]) => alias.toLowerCase() === lower)
  return match?.[1] ?? trimmed
}

export function isCuisineType(value: string): value is typeof CUISINE_TYPES[number] {
  return (CUISINE_TYPES as readonly string[]).includes(normalizeCuisineType(value))
}

export function getCuisineOptionsForContext(context: CuisineDisplayContext) {
  return CUISINE_OPTIONS.filter((entry) => entry.displayContexts.includes(context))
}
