import { z } from "zod"

import { COUNTRY_OPTIONS } from "@/lib/request-options"
import { CHEF_CAREER_STAGE_VALUES, CHEF_SPECIALTY_VALUES } from "@/lib/chef-onboarding-options"
import { chefProfileImageReferenceSchema } from "@/lib/chef-profile-image-reference"

const countryCodes = COUNTRY_OPTIONS.map((option) => option.value) as [string, ...string[]]
const currencyCodes = [...new Set(COUNTRY_OPTIONS.map((option) => option.currency))] as [string, ...string[]]

export const chefProfileSchema = z.object({
  phone: z.string().min(7, "Phone must be at least 7 characters").optional(),
  firstName: z.string().min(1, "First name is required").optional(),
  surname: z.string().min(1, "Surname is required").optional(),
  bio: z.string().optional(),
  experience: z.number().int().min(0).optional(),
  location: z.string().min(1, "Location is required"),
  radius: z.number().min(1, "Radius must be at least 1 km").max(500, "Radius cannot exceed 500 km"),
  baseCountryCode: z.enum(countryCodes).default("GB"),
  preferredCurrency: z.enum(currencyCodes).default("GBP"),
  profileImage: chefProfileImageReferenceSchema.optional(),
  chefType: z.string().optional(),
  careerStage: z.enum(CHEF_CAREER_STAGE_VALUES).optional(),
  specialties: z.array(z.enum(CHEF_SPECIALTY_VALUES)).max(10).optional(),
  certifications: z.string().optional(),
  cuisineType: z.string().optional(),
  eventsPerMonth: z.number().int().min(0).optional(),
  stripeAccountId: z.string().optional(),
  stripeOnboardingComplete: z.boolean().optional(),
  rightToWorkUkConfirmed: z.boolean().optional(),
  foodHygieneLevel2Confirmed: z.boolean().optional(),
  foodHygieneCertificateUrl: z.string().optional(),
})
