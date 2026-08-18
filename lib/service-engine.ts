import { COUNTRY_BOOKING_RULES } from "@/lib/marketplace-rules";

export const SERVICE_ENGINE_VERSION = "2026-08-phase-2";
export const SERVICE_PRICING_VERSION = "2026-08-10-client-confirmed";

export type CountryCode = "GB" | "US" | "KE" | "IT";
export type CurrencyCode = "GBP" | "USD" | "KES" | "EUR";
export type BookingMode = "STANDARD" | "MULTI_DAY" | "FULL_TIME_PLACEMENT";
export type PricingStatus = "ACTIVE" | "DRAFT" | "CLIENT_CONFIRMATION_REQUIRED";

export const COUNTRY_OPTIONS = [
  { value: "GB", label: "United Kingdom", currency: "GBP", locale: "en-GB", postalCodeLabel: "Postcode" },
  { value: "US", label: "United States", currency: "USD", locale: "en-US", postalCodeLabel: "ZIP code" },
  { value: "KE", label: "Kenya", currency: "KES", locale: "en-KE", postalCodeLabel: "Postal code or area" },
  { value: "IT", label: "Italy", currency: "EUR", locale: "it-IT", postalCodeLabel: "CAP or city" },
] as const;

export const EVENT_TYPE_OPTIONS = [
  { id: "birthday", label: "Birthday", requiresTailoredDetails: false },
  { id: "anniversary", label: "Anniversary", requiresTailoredDetails: false },
  { id: "dinner_party", label: "Dinner Party", requiresTailoredDetails: false },
  { id: "family_event", label: "Family Event", requiresTailoredDetails: false },
  { id: "work_event", label: "Work Event", requiresTailoredDetails: false },
  { id: "holiday_gathering", label: "Holiday Gathering", requiresTailoredDetails: false },
  { id: "meal_prep", label: "Meal Prep", requiresTailoredDetails: false },
  { id: "hen_stag_do", label: "Hen / Stag Do", requiresTailoredDetails: false },
  { id: "new_years_eve", label: "New Year's Eve", requiresTailoredDetails: false },
  { id: "christmas", label: "Christmas", requiresTailoredDetails: false },
  { id: "multi_day_chef_hire", label: "Multi-Day Chef Hire", requiresTailoredDetails: true, bookingMode: "MULTI_DAY" },
  { id: "full_time_chef", label: "Full-Time Chef", requiresTailoredDetails: true, bookingMode: "FULL_TIME_PLACEMENT" },
  { id: "other", label: "Other", requiresTailoredDetails: false },
] as const;

export type ServiceQuestion = {
  id: string;
  label: string;
  type: "single_select" | "multi_select" | "text" | "textarea" | "number" | "date_range" | "checkbox";
  required?: boolean;
  options?: readonly string[];
  helperText?: string;
};

export type ServiceImageMetadata = {
  src: string;
  alt: string;
  source: string;
  photographer?: string;
  licence: "CLIENT_SUPPLIED_APPROVED" | "CLIENT_SUPPLIED_LICENCE_CONFIRMATION_PENDING" | "UNSPLASH_LICENSE" | "PLACEHOLDER_CLIENT_REVIEW_REQUIRED";
  licenceUrl?: string;
  suppliedByClient?: boolean;
  approvedAt?: string;
  notes: string;
};

export type ServicePricingRule = {
  id: string;
  serviceType: string;
  countryCode: CountryCode;
  currency: CurrencyCode;
  tier?: string;
  minimumSpend?: number;
  pricePerPersonMin?: number;
  pricePerPersonMax?: number;
  minGuests?: number;
  maxGuests?: number;
  warningCopy?: string;
  customerGuidance?: string;
  status: PricingStatus;
  version: string;
  evidenceSource: string;
  evidenceNotes: string;
};

export type PricingRuleLike = {
  id?: string | null;
  serviceType: string;
  countryCode: string;
  currency: string;
  tier?: string | null;
  minimumSpend?: number | null;
  pricePerPersonMin?: number | null;
  pricePerPersonMax?: number | null;
  minGuests?: number | null;
  maxGuests?: number | null;
  warningCopy?: string | null;
  customerGuidance?: string | null;
  status: string;
  version: string;
};

export type ServiceTypeConfig = {
  id: string;
  label: string;
  description: string;
  image: ServiceImageMetadata;
  enabled: boolean;
  supportedCountries: readonly CountryCode[];
  bookingMode: BookingMode;
  minGuests?: number;
  maxGuests?: number;
  serviceTiers: readonly string[];
  requiredQuestions: readonly ServiceQuestion[];
  optionalQuestions: readonly ServiceQuestion[];
  cuisineCompatibility: "GLOBAL" | "SERVICE_SPECIFIC";
  eventCompatibility: "STANDARD_EVENTS" | "MULTI_DAY_ONLY" | "FULL_TIME_ONLY";
  dietaryRequirements: boolean;
  pricingRules: readonly ServicePricingRule[];
  effectiveDate: string;
  version: string;
  status: "ACTIVE" | "DRAFT";
  sourceNotes: string;
};

const supportedCountries = ["GB", "US", "KE", "IT"] as const;

export const CHILD_BILLING_RULE_COPY =
  "Every two kids under 10 years old will be equated to one adult and will be charged as such.";

const approvedClientImage = (fileName: string, alt: string, notes: string, photographer?: string): ServiceImageMetadata => ({
  src: `/images/service-types/${fileName}.jpg`,
  alt,
  source: "Client-supplied approved image",
  photographer,
  licence: "CLIENT_SUPPLIED_LICENCE_CONFIRMATION_PENDING",
  suppliedByClient: true,
  approvedAt: "2026-08-10",
  notes: `${notes} Production licence evidence should remain attached to the service asset record before launch.`,
});

const licensedLocalImage = (fileName: string, alt: string, photographer: string, source: string): ServiceImageMetadata => ({
  src: `/images/service-types/${fileName}.jpg`,
  alt,
  source,
  photographer,
  licence: "UNSPLASH_LICENSE",
  licenceUrl: "https://unsplash.com/license",
  notes: "Licensed image stored locally to avoid remote image loading failures in the booking flow.",
});

const standardQuestions = {
  cuisine: {
    id: "cuisinePreferences",
    label: "Cuisine preferences",
    type: "multi_select",
    required: true,
  },
  dietary: {
    id: "dietaryRequirements",
    label: "Dietary requirements",
    type: "multi_select",
    required: false,
  },
  notes: {
    id: "notes",
    label: "Tell us more",
    type: "textarea",
    required: false,
  },
} as const;

const activeGbPricing = (
  serviceType: string,
  minimumSpend: number,
  pricePerPersonMin: number,
  pricePerPersonMax: number,
  minGuests: number,
  customerGuidance: string,
): ServicePricingRule => ({
  id: `${serviceType.toLowerCase()}_gbp_2026_08_active`,
  serviceType,
  countryCode: "GB",
  currency: "GBP",
  minimumSpend,
  pricePerPersonMin,
  pricePerPersonMax,
  minGuests,
  status: "ACTIVE",
  version: "2026-08-phase-2-uk-pricing-v1",
  warningCopy: `Your budget is below the current ${minimumSpend} GBP minimum guidance for this service.`,
  customerGuidance,
  evidenceSource: "Phase 2 UK pricing activation evidence and client booking-flow requirement list",
  evidenceNotes: "Customer-facing guidance mirrors the active UK/GBP ServicePricingRule activation values.",
});

const activeUsPricing = (
  serviceType: string,
  minGuests: number,
  maxGuests: number,
  customerGuidance?: string,
): ServicePricingRule => ({
  id: `${serviceType.toLowerCase()}_usd_2026_08_10_active`,
  serviceType,
  countryCode: "US",
  currency: "USD",
  minimumSpend: 500,
  pricePerPersonMin: 57,
  pricePerPersonMax: 99,
  minGuests,
  maxGuests,
  status: "ACTIVE",
  version: SERVICE_PRICING_VERSION,
  warningCopy: "Your budget is below the client-confirmed USA guidance of $500 minimum spend or $75 per person.",
  customerGuidance: customerGuidance ?? COUNTRY_BOOKING_RULES.US.pricing,
  evidenceSource: "CLIENT REQUIREMENTS 10 AUGUST 2026.docx",
  evidenceNotes: "Client supplied USA pricing guidance for future market readiness. This pricing guidance does not activate USA bookings or checkout.",
});

const activeItalyPricing = (
  serviceType: string,
  minGuests: number,
  maxGuests: number,
  pricePerPersonMin = 48,
  pricePerPersonMax = 100,
  customerGuidance?: string,
): ServicePricingRule => ({
  id: `${serviceType.toLowerCase()}_eur_2026_08_10_active`,
  serviceType,
  countryCode: "IT",
  currency: "EUR",
  pricePerPersonMin,
  pricePerPersonMax,
  minGuests,
  maxGuests,
  status: "ACTIVE",
  version: SERVICE_PRICING_VERSION,
  customerGuidance: customerGuidance ?? COUNTRY_BOOKING_RULES.IT.pricing,
  evidenceSource: "CLIENT REQUIREMENTS 10 AUGUST 2026.docx",
  evidenceNotes: "Client supplied Italy pricing guidance for future market readiness. This pricing guidance does not activate Italy bookings or checkout. No Italy minimum spend was supplied.",
});

const activeKenyaPricing = (
  serviceType: string,
  minimumSpend: number,
  pricePerPersonMin: number | undefined,
  pricePerPersonMax: number | undefined,
  minGuests: number,
  maxGuests: number,
  customerGuidance: string,
): ServicePricingRule => ({
  id: `${serviceType.toLowerCase()}_kes_2026_08_10_active`,
  serviceType,
  countryCode: "KE",
  currency: "KES",
  minimumSpend,
  pricePerPersonMin,
  pricePerPersonMax,
  minGuests,
  maxGuests,
  status: "ACTIVE",
  version: SERVICE_PRICING_VERSION,
  warningCopy: `Your budget is below the client-confirmed Kenya guidance of ${minimumSpend} KES for this service category.`,
  customerGuidance,
  evidenceSource: "CLIENT REQUIREMENTS 10 AUGUST 2026.docx",
  evidenceNotes: "Client supplied Kenya pricing guidance for future market readiness. This pricing guidance does not activate Kenya bookings or checkout.",
});

const kenyaMinimumSpendByService: Record<string, number> = {
  THREE_COURSE_MEAL: 10000,
  FOUR_FIVE_COURSE_MEAL: 10000,
  SIX_NINE_COURSE_MEAL: 10000,
  SHARING_PLATES: 20000,
  SHARING_BUFFET: 20000,
  CANAPES_AND_DRINKS: 20000,
  BARBECUE_BBQ: 20000,
  BRUNCH: 10000,
  GRAZING_TABLE: 20000,
  COOKING_CLASS: 10000,
  AFTERNOON_TEA: 10000,
  KIDS_PARTY: 20000,
  DELIVERY_PLATTER: 10000,
};

const standardCountryPricing = (serviceType: string, gbRule: ServicePricingRule, minGuests: number, maxGuests: number) => [
  gbRule,
  activeUsPricing(serviceType, minGuests, maxGuests),
  activeItalyPricing(serviceType, minGuests, maxGuests),
  activeKenyaPricing(serviceType, kenyaMinimumSpendByService[serviceType] ?? 10000, 2500, 4000, minGuests, maxGuests, COUNTRY_BOOKING_RULES.KE.pricing),
] as const;

export const SERVICE_TYPE_CONFIG: readonly ServiceTypeConfig[] = [
  {
    id: "THREE_COURSE_MEAL",
    label: "3-Course Meal",
    description: "A classic private dining menu with three planned courses.",
    image: licensedLocalImage("three-course-meal", "Plated three-course private dining service", "Jay Wennington", "https://unsplash.com/photos/restaurant-table-and-chairs-setup-1414235077428-338989a2e8c0"),
    enabled: true,
    supportedCountries,
    bookingMode: "STANDARD",
    minGuests: 2,
    maxGuests: 200,
    serviceTiers: ["Casual dining", "Fine dining", "Signature chef"],
    requiredQuestions: [
      { id: "serviceTier", label: "Dining tier", type: "single_select", required: true, options: ["Casual dining", "Fine dining", "Signature chef"] },
      standardQuestions.cuisine,
      standardQuestions.dietary,
    ],
    optionalQuestions: [
      { id: "menuPreferences", label: "Menu preferences", type: "textarea" },
      standardQuestions.notes,
    ],
    cuisineCompatibility: "GLOBAL",
    eventCompatibility: "STANDARD_EVENTS",
    dietaryRequirements: true,
    pricingRules: standardCountryPricing("THREE_COURSE_MEAL", activeGbPricing("THREE_COURSE_MEAL", 350, 55, 85, 2, "Typical UK three-course private dining guidance. Chefs may quote higher for premium ingredients, weekends, or added staff."), 2, 200),
    effectiveDate: "2026-08-04",
    version: SERVICE_ENGINE_VERSION,
    status: "ACTIVE",
    sourceNotes: "Client required distinct requirements for each food type; active UK/GBP pricing guidance is configured.",
  },
  {
    id: "FOUR_FIVE_COURSE_MEAL",
    label: "4-5-Course Meal",
    description: "A longer hosted meal with four to five courses.",
    image: licensedLocalImage("four-five-course-meal", "Four to five course private dining menu", "Nick Karvounis", "https://unsplash.com/photos/food-on-white-ceramic-plate-1559339352-11d035aa65de"),
    enabled: true,
    supportedCountries,
    bookingMode: "STANDARD",
    minGuests: 2,
    maxGuests: 200,
    serviceTiers: ["Casual dining", "Fine dining", "Signature chef"],
    requiredQuestions: [
      { id: "serviceTier", label: "Dining tier", type: "single_select", required: true, options: ["Casual dining", "Fine dining", "Signature chef"] },
      standardQuestions.cuisine,
      standardQuestions.dietary,
    ],
    optionalQuestions: [
      { id: "courseStyle", label: "Course style or pacing", type: "textarea" },
      standardQuestions.notes,
    ],
    cuisineCompatibility: "GLOBAL",
    eventCompatibility: "STANDARD_EVENTS",
    dietaryRequirements: true,
    pricingRules: standardCountryPricing("FOUR_FIVE_COURSE_MEAL", activeGbPricing("FOUR_FIVE_COURSE_MEAL", 500, 80, 120, 2, "Longer multi-course private dining requires more preparation, service time, and premium ingredients."), 2, 200),
    effectiveDate: "2026-08-04",
    version: SERVICE_ENGINE_VERSION,
    status: "ACTIVE",
    sourceNotes: "Active UK/GBP pricing guidance is configured separately from three-course and tasting-menu dining.",
  },
  {
    id: "SIX_NINE_COURSE_MEAL",
    label: "6-9-Course Meal",
    description: "A premium tasting-menu style private dining experience.",
    image: licensedLocalImage("six-nine-course-meal", "Six to nine course tasting menu", "Alex Knight", "https://unsplash.com/photos/closeup-photo-of-sushi-1579871494447-9811cf80d66c"),
    enabled: true,
    supportedCountries,
    bookingMode: "STANDARD",
    minGuests: 2,
    maxGuests: 120,
    serviceTiers: ["Fine dining", "Signature chef"],
    requiredQuestions: [
      { id: "serviceTier", label: "Dining tier", type: "single_select", required: true, options: ["Fine dining", "Signature chef"] },
      standardQuestions.cuisine,
      standardQuestions.dietary,
    ],
    optionalQuestions: [
      { id: "tastingMenuStyle", label: "Tasting menu preferences", type: "textarea" },
      standardQuestions.notes,
    ],
    cuisineCompatibility: "GLOBAL",
    eventCompatibility: "STANDARD_EVENTS",
    dietaryRequirements: true,
    pricingRules: standardCountryPricing("SIX_NINE_COURSE_MEAL", activeGbPricing("SIX_NINE_COURSE_MEAL", 700, 100, 190, 2, "Tasting menus require specialist preparation and are priced above standard dinner-party formats."), 2, 120),
    effectiveDate: "2026-08-04",
    version: SERVICE_ENGINE_VERSION,
    status: "ACTIVE",
    sourceNotes: "Active UK/GBP pricing guidance is configured for tasting-menu style dining.",
  },
  {
    id: "SHARING_PLATES",
    label: "Sharing Plates",
    description: "Small plates served for the table to share.",
    image: licensedLocalImage("sharing-plates", "Sharing plates private dining service", "Toa Heftiba", "https://unsplash.com/photos/food-on-table-1544025162-d76694265947"),
    enabled: true,
    supportedCountries,
    bookingMode: "STANDARD",
    minGuests: 2,
    maxGuests: 200,
    serviceTiers: ["Casual dining", "Fine dining"],
    requiredQuestions: [
      { id: "serviceTier", label: "Service tier", type: "single_select", required: true, options: ["Casual dining", "Fine dining"] },
      standardQuestions.cuisine,
      standardQuestions.dietary,
    ],
    optionalQuestions: [
      { id: "sharingStyle", label: "Sharing style", type: "textarea" },
      standardQuestions.notes,
    ],
    cuisineCompatibility: "GLOBAL",
    eventCompatibility: "STANDARD_EVENTS",
    dietaryRequirements: true,
    pricingRules: standardCountryPricing("SHARING_PLATES", activeGbPricing("SHARING_PLATES", 400, 40, 70, 4, "Sharing plates are priced separately from buffet service and may vary by cuisine and staffing."), 4, 200),
    effectiveDate: "2026-08-04",
    version: SERVICE_ENGINE_VERSION,
    status: "ACTIVE",
    sourceNotes: "Kept distinct from Sharing Buffet as requested.",
  },
  {
    id: "SHARING_BUFFET",
    label: "Sharing Buffet",
    description: "Buffet-style service with dishes arranged for guests to serve or share.",
    image: approvedClientImage("sharing-buffet", "Guests sharing buffet dishes at an outdoor table", "Client approved current/supplied service image for use on 10 August 2026."),
    enabled: true,
    supportedCountries,
    bookingMode: "STANDARD",
    minGuests: 6,
    maxGuests: 250,
    serviceTiers: ["Casual dining", "Fine dining"],
    requiredQuestions: [
      { id: "serviceTier", label: "Tier or style", type: "single_select", required: true, options: ["Casual dining", "Fine dining"] },
      standardQuestions.cuisine,
      standardQuestions.dietary,
      { id: "setupDetails", label: "Service and setup details", type: "textarea", required: true },
    ],
    optionalQuestions: [standardQuestions.notes],
    cuisineCompatibility: "GLOBAL",
    eventCompatibility: "STANDARD_EVENTS",
    dietaryRequirements: true,
    pricingRules: standardCountryPricing("SHARING_BUFFET", activeGbPricing("SHARING_BUFFET", 320, 40, 70, 6, "Buffet pricing is distinct from sharing plates and reflects setup, volume, and service style."), 6, 250),
    effectiveDate: "2026-08-04",
    version: SERVICE_ENGINE_VERSION,
    status: "ACTIVE",
    sourceNotes: "Dedicated sequence based on client simulation document.",
  },
  {
    id: "CANAPES_AND_DRINKS",
    label: "Canapés and Drinks",
    description: "Canapés paired with drinks service for receptions or parties.",
    image: licensedLocalImage("canapes-and-drinks", "Canapés reception service", "Anna Pelzer", "https://unsplash.com/photos/bowl-of-vegetable-salads-1546069901-ba9599a7e63c"),
    enabled: true,
    supportedCountries,
    bookingMode: "STANDARD",
    minGuests: 6,
    maxGuests: 300,
    serviceTiers: ["Reception", "Premium reception"],
    requiredQuestions: [
      { id: "serviceTier", label: "Reception style", type: "single_select", required: true, options: ["Reception", "Premium reception"] },
      standardQuestions.cuisine,
      standardQuestions.dietary,
    ],
    optionalQuestions: [
      { id: "drinksService", label: "Drinks service needs", type: "textarea" },
      standardQuestions.notes,
    ],
    cuisineCompatibility: "GLOBAL",
    eventCompatibility: "STANDARD_EVENTS",
    dietaryRequirements: true,
    pricingRules: standardCountryPricing("CANAPES_AND_DRINKS", activeGbPricing("CANAPES_AND_DRINKS", 300, 40, 75, 6, "Canapes pricing is separate from seated dining because staffing, reception format, and drinks support may be involved."), 6, 300),
    effectiveDate: "2026-08-04",
    version: SERVICE_ENGINE_VERSION,
    status: "ACTIVE",
    sourceNotes: "Client-facing label is Canapés and Drinks; internal service id remains CANAPES_AND_DRINKS for backend compatibility.",
  },
  {
    id: "BARBECUE_BBQ",
    label: "Barbecue (BBQ)",
    description: "Outdoor or grill-led service for relaxed group dining.",
    image: approvedClientImage("barbecue-bbq", "Meat and vegetables cooking on a barbecue grill", "Client approved current/supplied service image for use on 10 August 2026."),
    enabled: true,
    supportedCountries,
    bookingMode: "STANDARD",
    minGuests: 4,
    maxGuests: 250,
    serviceTiers: ["Casual BBQ", "Premium BBQ"],
    requiredQuestions: [
      { id: "serviceTier", label: "BBQ style", type: "single_select", required: true, options: ["Casual BBQ", "Premium BBQ"] },
      { id: "indoorOutdoor", label: "Indoor or outdoor", type: "single_select", required: true, options: ["Outdoor", "Indoor backup", "Mixed"] },
      { id: "equipmentAvailable", label: "Equipment available", type: "single_select", required: true, options: ["Chef should bring equipment", "Venue has grill/equipment", "Not sure"] },
      standardQuestions.dietary,
    ],
    optionalQuestions: [
      { id: "proteinsPreferences", label: "Proteins or menu preferences", type: "textarea" },
      { id: "weatherPlan", label: "Weather contingency notes", type: "textarea" },
      standardQuestions.notes,
    ],
    cuisineCompatibility: "GLOBAL",
    eventCompatibility: "STANDARD_EVENTS",
    dietaryRequirements: true,
    pricingRules: standardCountryPricing("BARBECUE_BBQ", activeGbPricing("BARBECUE_BBQ", 500, 30, 65, 10, "BBQ pricing depends on equipment, outdoor setup, menu complexity, and whether the chef brings grill equipment."), 4, 250),
    effectiveDate: "2026-08-04",
    version: SERVICE_ENGINE_VERSION,
    status: "ACTIVE",
    sourceNotes: "Client supplied BBQ image. Active UK/GBP BBQ pricing guidance is configured.",
  },
  {
    id: "BRUNCH",
    label: "Brunch",
    description: "Late-morning and daytime menus for hosted gatherings.",
    image: approvedClientImage("brunch", "Brunch dishes and coffee arranged on a table", "Client approved current/supplied service image for use on 10 August 2026.", "Duncan Shaffer"),
    enabled: true,
    supportedCountries,
    bookingMode: "STANDARD",
    minGuests: 2,
    maxGuests: 150,
    serviceTiers: ["Relaxed brunch", "Premium brunch"],
    requiredQuestions: [
      { id: "serviceTier", label: "Brunch style", type: "single_select", required: true, options: ["Relaxed brunch", "Premium brunch"] },
      { id: "servingFormat", label: "Serving format", type: "single_select", required: true, options: ["Plated", "Buffet", "Family-style"] },
      standardQuestions.cuisine,
      standardQuestions.dietary,
    ],
    optionalQuestions: [
      { id: "beverages", label: "Beverage preferences", type: "textarea" },
      standardQuestions.notes,
    ],
    cuisineCompatibility: "GLOBAL",
    eventCompatibility: "STANDARD_EVENTS",
    dietaryRequirements: true,
    pricingRules: standardCountryPricing("BRUNCH", activeGbPricing("BRUNCH", 300, 35, 60, 4, "Brunch guidance covers chef-led breakfast or brunch service and is not reused from dinner pricing."), 2, 150),
    effectiveDate: "2026-08-04",
    version: SERVICE_ENGINE_VERSION,
    status: "ACTIVE",
    sourceNotes: "Client supplied image; filename indicates Unsplash photographer.",
  },
  {
    id: "GRAZING_TABLE",
    label: "Grazing Table",
    description: "Styled table spreads with grazing, antipasti, fruit, cheese, or themed platters.",
    image: approvedClientImage("grazing-table", "Grazing table board with cheese, charcuterie, fruit, and crackers", "Client approved current/supplied service image for use on 10 August 2026."),
    enabled: true,
    supportedCountries,
    bookingMode: "STANDARD",
    minGuests: 4,
    maxGuests: 250,
    serviceTiers: ["Grazing table"],
    requiredQuestions: [
      { id: "stylingRequirements", label: "Styling and setup requirements", type: "textarea", required: true },
      standardQuestions.cuisine,
      standardQuestions.dietary,
    ],
    optionalQuestions: [
      { id: "setupAccess", label: "Setup access details", type: "textarea" },
      standardQuestions.notes,
    ],
    cuisineCompatibility: "GLOBAL",
    eventCompatibility: "STANDARD_EVENTS",
    dietaryRequirements: true,
    pricingRules: standardCountryPricing("GRAZING_TABLE", activeGbPricing("GRAZING_TABLE", 490, 15, 28, 8, "Grazing Table pricing includes styling/setup expectations and is separate from buffet service."), 4, 250),
    effectiveDate: "2026-08-04",
    version: SERVICE_ENGINE_VERSION,
    status: "ACTIVE",
    sourceNotes: "Dedicated sequence based on grazing simulation; pricing figures in screenshots are not fully readable from extracted text.",
  },
  {
    id: "COOKING_CLASS",
    label: "Cooking Class",
    description: "Hands-on or demonstration-led teaching sessions.",
    image: licensedLocalImage("cooking-class", "Cooking class with chef instruction", "Conscious Design", "https://unsplash.com/photos/person-holding-stainless-steel-fork-1556910103-1c02745aae4d"),
    enabled: true,
    supportedCountries,
    bookingMode: "STANDARD",
    minGuests: 2,
    maxGuests: 20,
    serviceTiers: ["Hands-on", "Demonstration", "Team building"],
    requiredQuestions: [
      { id: "classStyle", label: "Class style", type: "single_select", required: true, options: ["Hands-on", "Demonstration", "Team building"] },
      { id: "experienceLevel", label: "Experience level", type: "single_select", required: true, options: ["Beginner", "Intermediate", "Advanced", "Mixed"] },
      standardQuestions.cuisine,
      standardQuestions.dietary,
    ],
    optionalQuestions: [
      { id: "equipmentVenue", label: "Equipment and venue notes", type: "textarea" },
      standardQuestions.notes,
    ],
    cuisineCompatibility: "GLOBAL",
    eventCompatibility: "STANDARD_EVENTS",
    dietaryRequirements: true,
    pricingRules: standardCountryPricing("COOKING_CLASS", activeGbPricing("COOKING_CLASS", 680, 85, 130, 2, "Cooking Class pricing is based on tuition, ingredients, class duration, and equipment requirements."), 2, 20),
    effectiveDate: "2026-08-04",
    version: SERVICE_ENGINE_VERSION,
    status: "ACTIVE",
    sourceNotes: "Student count wording remains supported.",
  },
  {
    id: "AFTERNOON_TEA",
    label: "Afternoon Tea",
    description: "Tea service with savoury bites, cakes, scones, or patisserie.",
    image: licensedLocalImage("afternoon-tea", "Afternoon tea service", "Miti", "https://unsplash.com/photos/clear-glass-cup-filled-with-tea-1544787219-7f47ccb76574"),
    enabled: true,
    supportedCountries,
    bookingMode: "STANDARD",
    minGuests: 2,
    maxGuests: 120,
    serviceTiers: ["Classic", "Celebration", "Premium"],
    requiredQuestions: [
      { id: "serviceTier", label: "Afternoon tea style", type: "single_select", required: true, options: ["Classic", "Celebration", "Premium"] },
      standardQuestions.dietary,
    ],
    optionalQuestions: [
      { id: "teaPreferences", label: "Tea and patisserie preferences", type: "textarea" },
      standardQuestions.notes,
    ],
    cuisineCompatibility: "SERVICE_SPECIFIC",
    eventCompatibility: "STANDARD_EVENTS",
    dietaryRequirements: true,
    pricingRules: standardCountryPricing("AFTERNOON_TEA", activeGbPricing("AFTERNOON_TEA", 290, 40, 60, 4, "Afternoon Tea is priced independently from brunch and dinner services."), 2, 120),
    effectiveDate: "2026-08-04",
    version: SERVICE_ENGINE_VERSION,
    status: "ACTIVE",
    sourceNotes: "Licensed image and active UK/GBP Afternoon Tea pricing guidance are configured.",
  },
  {
    id: "KIDS_PARTY",
    label: "Kids Party",
    description: "Food and service tailored for children's parties.",
    image: approvedClientImage("kids-party", "Kids party dessert table with cake, balloons, cupcakes, and decorations", "Client approved current/supplied service image for use on 10 August 2026.", "Yulia Gapeenko"),
    enabled: true,
    supportedCountries,
    bookingMode: "STANDARD",
    minGuests: 2,
    maxGuests: 150,
    serviceTiers: ["Kids party"],
    requiredQuestions: [
      { id: "ageRange", label: "Children's age range", type: "text", required: true },
      { id: "allergySafety", label: "Allergy and safety notes", type: "textarea", required: true },
      { id: "servingFormat", label: "Serving format", type: "single_select", required: true, options: ["Buffet", "Individual portions", "Interactive food activity"] },
    ],
    optionalQuestions: [
      { id: "partyTheme", label: "Theme or preferences", type: "textarea" },
      standardQuestions.notes,
    ],
    cuisineCompatibility: "SERVICE_SPECIFIC",
    eventCompatibility: "STANDARD_EVENTS",
    dietaryRequirements: true,
    pricingRules: standardCountryPricing("KIDS_PARTY", activeGbPricing("KIDS_PARTY", 150, 9, 18, 8, "Kids Party guidance uses child-friendly catering references and the under-10 billing rule."), 2, 150),
    effectiveDate: "2026-08-04",
    version: SERVICE_ENGINE_VERSION,
    status: "ACTIVE",
    sourceNotes: "Uses client supplied Yulia Gapeenko image; alternate kids cake asset preserved outside registry.",
  },
  {
    id: "DELIVERY_PLATTER",
    label: "Delivery Platter",
    description: "Prepared platters arranged for delivery or light setup.",
    image: licensedLocalImage("delivery-platter", "Delivery platter arrangement", "Brooke Lark", "https://unsplash.com/photos/variety-of-foods-on-table-1504674900247-0877df9cc836"),
    enabled: true,
    supportedCountries,
    bookingMode: "STANDARD",
    minGuests: 2,
    maxGuests: 300,
    serviceTiers: ["Delivery", "Delivery with setup"],
    requiredQuestions: [
      { id: "platterType", label: "Platter type", type: "single_select", required: true, options: ["Cold platter", "Hot platter", "Mixed platter", "Dessert platter"] },
      { id: "deliveryInstructions", label: "Delivery and access instructions", type: "textarea", required: true },
      standardQuestions.dietary,
    ],
    optionalQuestions: [standardQuestions.notes],
    cuisineCompatibility: "GLOBAL",
    eventCompatibility: "STANDARD_EVENTS",
    dietaryRequirements: true,
    pricingRules: standardCountryPricing("DELIVERY_PLATTER", activeGbPricing("DELIVERY_PLATTER", 120, 8, 20, 8, "Delivery Platter pricing is for prepared platter or drop-off style service and does not imply staffed event catering."), 2, 300),
    effectiveDate: "2026-08-04",
    version: SERVICE_ENGINE_VERSION,
    status: "ACTIVE",
    sourceNotes: "Delivery-specific questions, licensed image, and active UK/GBP Delivery Platter pricing guidance are configured.",
  },
] as const;

export const MULTI_DAY_SERVICE_CONFIG = {
  bookingMode: "MULTI_DAY" as const,
  requiredQuestions: [
    { id: "eventDates", label: "Multiple dates or date range", type: "date_range", required: true },
    { id: "dailyServiceTimes", label: "Daily service times", type: "textarea", required: true },
    { id: "serviceNeedsPerDay", label: "Service needs per day", type: "textarea", required: true },
    { id: "accommodationTravel", label: "Accommodation or travel requirements", type: "textarea" },
  ] satisfies ServiceQuestion[],
};

export const FULL_TIME_CHEF_CONFIG = {
  bookingMode: "FULL_TIME_PLACEMENT" as const,
  requiredQuestions: [
    { id: "desiredStartDate", label: "Desired start date", type: "text", required: true },
    { id: "expectedDuration", label: "Expected duration", type: "text", required: true },
    { id: "placementType", label: "Temporary or permanent", type: "single_select", required: true, options: ["Temporary", "Permanent"] },
    { id: "liveInPreference", label: "Live-in or live-out", type: "single_select", required: true, options: ["Live-in", "Live-out", "Flexible"] },
    { id: "workingDays", label: "Working days", type: "text", required: true },
    { id: "workingHours", label: "Working hours", type: "text", required: true },
  ] satisfies ServiceQuestion[],
};

export function getServiceTypeConfig(serviceType?: string | null) {
  return SERVICE_TYPE_CONFIG.find((service) => service.id === serviceType) ?? null;
}

export function getServiceTypeLabel(serviceType?: string | null, fallback?: string | null) {
  return getServiceTypeConfig(serviceType)?.label ?? fallback ?? "Service type not specified";
}

export function getCountryOption(countryCode?: string | null) {
  return COUNTRY_OPTIONS.find((option) => option.value === countryCode) ?? COUNTRY_OPTIONS[0];
}

export function getCurrencyForCountry(countryCode?: string | null) {
  return getCountryOption(countryCode).currency;
}

export function getLocaleForCountry(countryCode?: string | null) {
  return getCountryOption(countryCode).locale;
}

export function getPricingRule(serviceType: string, countryCode: string, tier?: string | null) {
  const service = getServiceTypeConfig(serviceType);
  if (!service) return null;

  return service.pricingRules.find((rule) =>
    rule.countryCode === countryCode &&
    (!rule.tier || !tier || rule.tier === tier)
  ) ?? service.pricingRules.find((rule) => rule.countryCode === countryCode) ?? null;
}

export function validateServiceSpecificAnswers(
  serviceType: string,
  answers?: Record<string, unknown> | null,
) {
  const service = getServiceTypeConfig(serviceType);
  if (!service) return [{ id: "serviceType", label: "Service type" }];

  const provided = answers ?? {};
  const sharedQuestionIds = new Set(["cuisinePreferences", "dietaryRequirements", "serviceTier"]);

  return service.requiredQuestions
    .filter((question) => question.required && !sharedQuestionIds.has(question.id))
    .filter((question) => {
      const value = provided[question.id];
      if (Array.isArray(value)) return value.length === 0;
      if (typeof value === "string") return value.trim().length === 0;
      return value == null;
    })
    .map((question) => ({ id: question.id, label: question.label }));
}

export function resolvePricingState(input: {
  serviceType: string;
  countryCode: string;
  tier?: string | null;
  budget?: number | null;
  activeRule?: PricingRuleLike | null;
}) {
  const currency = getCurrencyForCountry(input.countryCode);
  const rule = input.activeRule ?? getPricingRule(input.serviceType, input.countryCode, input.tier);

  if (!rule) {
    return {
      currency,
      rule: null,
      pricingStatus: "LOCAL_QUOTE_REQUIRED",
      budgetStatus: "LOCAL_QUOTE_REQUIRED",
      budgetWarning: "Pricing for this market is pending approval, so the request will be treated as a local quote enquiry.",
    };
  }

  const minimumSpend = rule.minimumSpend ?? null;
  const belowMinimum = minimumSpend != null && input.budget != null && input.budget < minimumSpend;

  return {
    currency,
    rule,
    pricingStatus: "ACTIVE_RULE_APPLIED",
    budgetStatus: belowMinimum ? "BELOW_MINIMUM_ALLOW_ENQUIRY" : "WITHIN_GUIDANCE",
    budgetWarning: belowMinimum
      ? rule.warningCopy ?? "Your budget is below the active guidance for this service. You may submit the enquiry, but chefs can quote only if the commercial terms work."
      : null,
  };
}

export function calculateGuestComposition(input: {
  adultCount?: number | null;
  childrenUnder10?: number | null;
  fallbackGuestCount?: number | null;
}) {
  const adultCount = Number.isFinite(Number(input.adultCount))
    ? Math.max(0, Math.trunc(Number(input.adultCount)))
    : Math.max(1, Math.trunc(Number(input.fallbackGuestCount ?? 1)));
  const childrenUnder10 = Number.isFinite(Number(input.childrenUnder10))
    ? Math.max(0, Math.trunc(Number(input.childrenUnder10)))
    : 0;
  const actualAttendeeCount = adultCount + childrenUnder10;
  const billableGuestCount = adultCount + childrenUnder10 / 2;

  return {
    adultCount,
    childrenUnder10,
    actualAttendeeCount,
    billableGuestCount,
    pricingGuestCount: billableGuestCount,
  };
}

export function getBudgetWarning(input: {
  serviceType: string;
  countryCode: string;
  tier?: string | null;
  budget: number;
}) {
  const rule = getPricingRule(input.serviceType, input.countryCode, input.tier);
  if (!rule?.minimumSpend) return null;

  return input.budget < rule.minimumSpend ? rule.warningCopy ?? "Your budget is below the current guidance for this service." : null;
}
