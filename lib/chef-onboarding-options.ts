export const CHEF_CAREER_STAGE_OPTIONS = [
  {
    value: "EXPERIENCED_PRIVATE_CHEF",
    label: "I’m a private chef, with experience and seeking more clients",
    shortLabel: "Experienced private chef",
  },
  {
    value: "RESTAURANT_TO_PRIVATE_CHEF",
    label: "I have restaurant experience as a chef and I want to explore the private chef world",
    shortLabel: "Restaurant chef entering private work",
  },
  {
    value: "ASPIRING_CHEF_NO_EXPERIENCE",
    label: "I want to become a chef but I have no experience",
    shortLabel: "Aspiring chef",
  },
] as const

export type ChefCareerStage = typeof CHEF_CAREER_STAGE_OPTIONS[number]["value"]

export const CHEF_SPECIALTY_OPTIONS = [
  { value: "PRIVATE_DINING", label: "Private Dining" },
  { value: "EVENTS", label: "Events" },
  { value: "MEAL_PREP", label: "Meal Prep" },
  { value: "CULINARY_INSTRUCTION", label: "Culinary Instruction" },
  { value: "PASTRY", label: "Pastry" },
] as const

export type ChefSpecialty = typeof CHEF_SPECIALTY_OPTIONS[number]["value"]

export const CHEF_CAREER_STAGE_VALUES = CHEF_CAREER_STAGE_OPTIONS.map((option) => option.value) as [
  ChefCareerStage,
  ...ChefCareerStage[],
]

export const CHEF_SPECIALTY_VALUES = CHEF_SPECIALTY_OPTIONS.map((option) => option.value) as [
  ChefSpecialty,
  ...ChefSpecialty[],
]

const legacyChefTypeToSpecialty: Record<string, ChefSpecialty> = {
  PRIVATE_CHEF: "PRIVATE_DINING",
  EVENT_CHEF: "EVENTS",
  MEAL_PREP: "MEAL_PREP",
  CULINARY_INSTRUCTOR: "CULINARY_INSTRUCTION",
  PASTRY_CHEF: "PASTRY",
}

const specialtyLabels = new Map(CHEF_SPECIALTY_OPTIONS.map((option) => [option.value, option.label]))
const careerStageLabels = new Map(CHEF_CAREER_STAGE_OPTIONS.map((option) => [option.value, option.label]))
const careerStageShortLabels = new Map(CHEF_CAREER_STAGE_OPTIONS.map((option) => [option.value, option.shortLabel]))

export function isChefCareerStage(value?: string | null): value is ChefCareerStage {
  return CHEF_CAREER_STAGE_OPTIONS.some((option) => option.value === value)
}

export function isChefSpecialty(value?: string | null): value is ChefSpecialty {
  return CHEF_SPECIALTY_OPTIONS.some((option) => option.value === value)
}

export function deriveCareerStageFromLegacyChefType(chefType?: string | null): ChefCareerStage | undefined {
  return chefType === "PRIVATE_CHEF" ? "EXPERIENCED_PRIVATE_CHEF" : undefined
}

export function normalizeChefCareerStage(value?: string | null, legacyChefType?: string | null) {
  if (isChefCareerStage(value)) return value
  return deriveCareerStageFromLegacyChefType(legacyChefType)
}

export function decodeChefSpecialties(raw?: string | string[] | null, legacyChefType?: string | null): ChefSpecialty[] {
  const values = Array.isArray(raw) ? raw : parseStoredSpecialties(raw)
  const normalized = values.filter(isChefSpecialty)

  if (normalized.length > 0) {
    return Array.from(new Set(normalized))
  }

  const legacySpecialty = legacyChefType ? legacyChefTypeToSpecialty[legacyChefType] : undefined
  return legacySpecialty ? [legacySpecialty] : []
}

export function encodeChefSpecialties(values?: string[] | null) {
  const normalized = Array.from(new Set((values ?? []).filter(isChefSpecialty)))
  return normalized.length > 0 ? JSON.stringify(normalized) : null
}

export function getChefCareerStageLabel(value?: string | null, fallback = "Not specified") {
  return isChefCareerStage(value) ? careerStageLabels.get(value) ?? fallback : fallback
}

export function getChefCareerStageShortLabel(value?: string | null, fallback = "Not specified") {
  return isChefCareerStage(value) ? careerStageShortLabels.get(value) ?? fallback : fallback
}

export function getChefSpecialtyLabel(value?: string | null) {
  return isChefSpecialty(value) ? specialtyLabels.get(value) ?? value : value ?? ""
}

function parseStoredSpecialties(raw?: string | null) {
  if (!raw) return []

  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is string => typeof item === "string")
    }
  } catch {
    // Legacy profiles sometimes store comma-separated free text.
  }

  return raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
}

