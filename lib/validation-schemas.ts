import { z } from 'zod';
import {
  COOKING_CLASS_TYPES,
  COUNTRY_OPTIONS,
  CUISINE_TYPES,
  DIETARY_REQUIREMENTS,
  EVENT_TYPES,
  LEGACY_EXPERIENCE_SERVICE_TYPES,
  getServiceTypeOption,
  normalizeCuisineType,
  isCuisineType,
  REQUEST_SERVICE_TYPES,
  SERVICE_TYPES,
  calculateGuestComposition,
  validateServiceSpecificAnswers,
} from '@/lib/request-options';

// Common validation patterns
export const emailSchema = z.string().email('Invalid email address');
export const passwordSchema = z.string().min(6, 'Password must be at least 6 characters');
export const nameSchema = z.string().min(2, 'Name must be at least 2 characters').max(100);
export const phoneSchema = z.string().regex(/^\+?[\d\s\-()]+$/, 'Invalid phone number').optional();
export const urlSchema = z.string().url('Invalid URL').optional();
export const priceSchema = z.number().positive('Price must be greater than 0').finite();
export const dateSchema = z.string().refine((date) => !isNaN(Date.parse(date)), 'Invalid date');
export const futureDate = z.string().refine(
  (date) => new Date(date) > new Date(),
  'Date must be in the future'
);

// Booking validation
export const bookingSchema = z.object({
  experienceId: z.string().min(1, 'Experience ID is required'),
  clientId: z.string().min(1, 'Client ID is required'),
  chefId: z.string().min(1, 'Chef ID is required'),
  startDate: futureDate,
  endDate: futureDate,
  numberOfGuests: z.number().int().positive('Number of guests must be at least 1'),
  totalPrice: priceSchema,
  notes: z.string().max(1000, 'Notes cannot exceed 1000 characters').optional(),
});

// Request validation
const countryCodes = COUNTRY_OPTIONS.map((option) => option.value) as [string, ...string[]];
const eventTypeValues = [...EVENT_TYPES] as [string, ...string[]];
const requestServiceTypeValues = [...REQUEST_SERVICE_TYPES] as [string, ...string[]];
const serviceTypeValues = [...LEGACY_EXPERIENCE_SERVICE_TYPES] as [string, ...string[]];
const cookingClassTypeValues = [...COOKING_CLASS_TYPES] as [string, ...string[]];
const cuisineTypeValues = [...CUISINE_TYPES] as [string, ...string[]];
const dietaryRequirementValues = [...DIETARY_REQUIREMENTS] as [string, ...string[]];
const cuisineTypeSchema = z.string()
  .transform((value) => normalizeCuisineType(value))
  .refine((value): value is typeof CUISINE_TYPES[number] => isCuisineType(value), 'Select a supported cuisine');
const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use a valid 24-hour time');
export const budgetModeSchema = z.enum(['PER_DAY', 'TOTAL_EVENT']);

const requestBaseSchema = z.object({
  title: z.string().max(100, 'Title cannot exceed 100 characters').optional(),
  eventType: z.enum(eventTypeValues),
  serviceType: z.enum(requestServiceTypeValues),
  cuisinePreferences: z.array(cuisineTypeSchema).min(1, 'Select at least one cuisine preference').max(3, 'Select up to 3 cuisine preferences'),
  dietaryRequirements: z.array(z.enum(dietaryRequirementValues)).max(8, 'Select up to 8 dietary requirements').default([]),
  serviceSpecificAnswers: z.record(z.unknown()).optional(),
  serviceTier: z.string().max(100, 'Service tier cannot exceed 100 characters').optional(),
  pricingRuleVersion: z.string().max(100, 'Pricing rule version cannot exceed 100 characters').optional(),
  adultCount: z.number().int().min(0).max(300).optional(),
  childrenUnder10: z.number().int().min(0).max(200).optional(),
  billableGuestCount: z.number().min(0.5).max(300).multipleOf(0.5).optional(),
  actualAttendeeCount: z.number().int().min(1).max(500).optional(),
  pricingGuestCount: z.number().min(0.5).max(300).multipleOf(0.5).optional(),
  eventDates: z.array(futureDate).max(30, 'Select up to 30 dates').optional(),
  description: z.string().max(5000, 'Description cannot exceed 5000 characters').optional(),
  eventDate: futureDate,
  eventTime: z.string().min(1, 'Event time is required').max(50, 'Event time cannot exceed 50 characters'),
  location: z.string().min(3, 'Location must be at least 3 characters').max(100),
  country: z.enum(countryCodes),
  guestCount: z.number().int().min(1, 'Guest count must be at least 1').max(200, 'Guest count cannot exceed 200'),
  budget: priceSchema,
  details: z.string().max(5000, 'Details cannot exceed 5000 characters').optional(),
});

export const requestSchema = requestBaseSchema.superRefine((data, context) => {
  const serviceConfig = getServiceTypeOption(data.serviceType);
  if (!serviceConfig?.enabled) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['serviceType'],
      message: 'Select a supported service type',
    });
  }

  if (serviceConfig?.serviceTiers.length && (!data.serviceTier || !serviceConfig.serviceTiers.includes(data.serviceTier))) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['serviceTier'],
      message: 'Choose a supported service tier for this service',
    });
  }

  const guestComposition = calculateGuestComposition({
    adultCount: data.adultCount,
    childrenUnder10: data.childrenUnder10,
    fallbackGuestCount: data.guestCount,
  });

  if (data.actualAttendeeCount != null && data.actualAttendeeCount !== guestComposition.actualAttendeeCount) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['actualAttendeeCount'],
      message: 'Actual attendee count must match the platform guest-count rule',
    });
  }

  if (data.billableGuestCount != null && data.billableGuestCount !== guestComposition.billableGuestCount) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['billableGuestCount'],
      message: 'Billable guest count must use the platform child billing rule',
    });
  }

  if (serviceConfig?.minGuests != null && guestComposition.pricingGuestCount < serviceConfig.minGuests) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['guestCount'],
      message: `${serviceConfig.label} requires at least ${serviceConfig.minGuests} billable guests`,
    });
  }

  if (serviceConfig?.maxGuests != null && guestComposition.pricingGuestCount > serviceConfig.maxGuests) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['guestCount'],
      message: `${serviceConfig.label} supports up to ${serviceConfig.maxGuests} billable guests`,
    });
  }

  for (const question of validateServiceSpecificAnswers(data.serviceType, data.serviceSpecificAnswers)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['serviceSpecificAnswers', question.id],
      message: `${question.label} is required for ${serviceConfig?.label ?? 'this service'}`,
    });
  }

  // Cooking class student count validation
  if (data.serviceType === 'COOKING_CLASS') {
    if (data.guestCount < 2) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['guestCount'],
        message: 'Cooking classes require at least 2 students',
      });
    }
    if (data.guestCount > 20) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['guestCount'],
        message: 'Cooking classes cannot exceed 20 students for quality instruction',
      });
    }
  }

  if (data.guestCount < 1 && (data.adultCount ?? 0) < 1) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['adultCount'],
      message: 'At least one adult or billable organiser is required',
    });
  }

  if (data.eventType === 'Multi-Day Chef Hire') {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['eventType'],
      message: 'Multi-Day Chef Hire uses the separate multi-day enquiry workflow and cannot be published as a normal one-day request.',
    });
  }

  if (data.eventType === 'Full-Time Chef') {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['eventType'],
      message: 'Full-Time Chef uses the separate placement enquiry workflow and cannot be published as a normal one-day request.',
    });
  }
});

export const multiDayRequestSchema = requestBaseSchema.omit({
  eventDate: true,
  eventDates: true,
  budget: true,
}).extend({
  eventType: z.literal('Multi-Day Chef Hire'),
  eventDates: z.array(futureDate).min(2, 'Select at least two dates').max(30, 'Select up to 30 dates'),
  budgetMode: budgetModeSchema,
  totalBudget: priceSchema.optional(),
  defaultDailyBudget: priceSchema.optional(),
  budget: priceSchema.optional(),
  dateRequirements: z.array(z.object({
    date: futureDate,
    startTime: timeSchema,
    endTime: timeSchema.optional().or(z.literal('')),
    serviceType: z.enum(requestServiceTypeValues),
    serviceTier: z.string().max(100).optional().or(z.literal('')),
    cuisinePreferences: z.array(cuisineTypeSchema).min(1, 'Select at least one cuisine preference').max(3, 'Select up to 3 cuisine preferences'),
    dietaryRequirements: z.array(z.enum(dietaryRequirementValues)).max(8, 'Select up to 8 dietary requirements').default([]),
    serviceSpecificAnswers: z.record(z.unknown()).optional(),
    adultCount: z.number().int().min(0).max(300),
    childrenUnder10: z.number().int().min(0).max(200).default(0),
    actualAttendeeCount: z.number().int().min(1).max(500).optional(),
    billableGuestCount: z.number().min(0.5).max(300).multipleOf(0.5).optional(),
    pricingGuestCount: z.number().min(0.5).max(300).multipleOf(0.5).optional(),
    budget: priceSchema.optional(),
    notes: z.string().max(2000).optional().or(z.literal('')),
  })).min(2, 'Add requirements for each selected date').max(30, 'Add up to 30 service dates'),
  dailyServiceTimes: z.string().max(2000).optional(),
  serviceNeedsPerDay: z.string().max(3000).optional(),
  accommodationTravel: z.string().max(2000).optional(),
}).superRefine((data, context) => {
  const uniqueDates = [...new Set(data.eventDates)];
  if (uniqueDates.length !== data.eventDates.length) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['eventDates'],
      message: 'Selected dates must be unique',
    });
  }

  const sortedEventDates = uniqueDates.sort();
  const requirementDates = data.dateRequirements.map((day) => day.date);
  const uniqueRequirementDates = [...new Set(requirementDates)];
  if (uniqueRequirementDates.length !== requirementDates.length) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['dateRequirements'],
      message: 'Each selected date can only have one requirement block',
    });
  }

  const sortedRequirementDates = uniqueRequirementDates.sort();
  if (sortedEventDates.join('|') !== sortedRequirementDates.join('|')) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['dateRequirements'],
      message: 'Daily requirements must match the selected service dates',
    });
  }

  if (data.budgetMode === 'TOTAL_EVENT' && data.totalBudget == null) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['totalBudget'],
      message: 'Enter the total budget for all selected days',
    });
  }

  if (data.budgetMode === 'PER_DAY' && data.defaultDailyBudget == null && data.dateRequirements.some((day) => day.budget == null)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['defaultDailyBudget'],
      message: 'Enter a daily budget or add a budget for each selected day',
    });
  }

  data.dateRequirements.forEach((day, index) => {
    const serviceConfig = getServiceTypeOption(day.serviceType);
    if (!serviceConfig?.enabled) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['dateRequirements', index, 'serviceType'],
        message: 'Select a supported service type',
      });
      return;
    }

    if (!serviceConfig.supportedCountries.includes(data.country as never)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['dateRequirements', index, 'serviceType'],
        message: `${serviceConfig.label} is not available in the selected country`,
      });
    }

    if (serviceConfig.serviceTiers.length && (!day.serviceTier || !serviceConfig.serviceTiers.includes(day.serviceTier))) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['dateRequirements', index, 'serviceTier'],
        message: 'Choose a supported tier for this service date',
      });
    }

    const guestComposition = calculateGuestComposition({
      adultCount: day.adultCount,
      childrenUnder10: day.childrenUnder10,
      fallbackGuestCount: day.adultCount,
    });

    if (day.actualAttendeeCount != null && day.actualAttendeeCount !== guestComposition.actualAttendeeCount) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['dateRequirements', index, 'actualAttendeeCount'],
        message: 'Actual attendee count must match the platform guest-count rule',
      });
    }

    if (day.billableGuestCount != null && day.billableGuestCount !== guestComposition.billableGuestCount) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['dateRequirements', index, 'billableGuestCount'],
        message: 'Billable guest count must use the platform child billing rule',
      });
    }

    if (serviceConfig.minGuests != null && guestComposition.pricingGuestCount < serviceConfig.minGuests) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['dateRequirements', index, 'adultCount'],
        message: `${serviceConfig.label} requires at least ${serviceConfig.minGuests} billable guests`,
      });
    }

    if (serviceConfig.maxGuests != null && guestComposition.pricingGuestCount > serviceConfig.maxGuests) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['dateRequirements', index, 'adultCount'],
        message: `${serviceConfig.label} supports up to ${serviceConfig.maxGuests} billable guests`,
      });
    }

    for (const question of validateServiceSpecificAnswers(day.serviceType, day.serviceSpecificAnswers)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['dateRequirements', index, 'serviceSpecificAnswers', question.id],
        message: `${question.label} is required for ${serviceConfig.label}`,
      });
    }
  });
});

export const fullTimeChefEnquirySchema = z.object({
  location: z.string().min(3).max(100),
  country: z.enum(countryCodes),
  desiredStartDate: futureDate,
  expectedDuration: z.string().min(2).max(120),
  placementType: z.enum(['Temporary', 'Permanent']),
  liveInPreference: z.enum(['Live-in', 'Live-out', 'Flexible']),
  workingDays: z.string().min(2).max(200),
  workingHours: z.string().min(2).max(200),
  householdSize: z.number().int().min(1).max(100).optional(),
  adultCount: z.number().int().min(0).max(100).optional(),
  childrenUnder10: z.number().int().min(0).max(100).optional(),
  responsibilities: z.string().max(3000).optional(),
  cuisinePreferences: z.array(cuisineTypeSchema).max(3).default([]),
  dietaryRequirements: z.array(z.enum(dietaryRequirementValues)).max(8).default([]),
  budgetAmount: priceSchema.optional(),
  budgetPeriod: z.enum(['Weekly', 'Monthly', 'Annual']).optional(),
  travelRequirements: z.string().max(2000).optional(),
  legalWorkRequirements: z.string().max(2000).optional(),
  notes: z.string().max(5000).optional(),
});

export const registerSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
  role: z.enum(['CLIENT', 'CHEF']).default('CLIENT'),
  acceptedTerms: z.literal(true, {
    errorMap: () => ({ message: 'You must accept the Terms & Conditions' }),
  }),
  acceptedCompliance: z.boolean().optional(),
}).superRefine((data, context) => {
  if (data.role === 'CHEF' && data.acceptedCompliance !== true) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['acceptedCompliance'],
      message: 'Chefs must acknowledge the legal and compliance requirement',
    });
  }
});

// Experience validation
export const experienceSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(100),
  description: z.string().min(10, 'Description must be at least 10 characters').max(5000),
  price: priceSchema,
  currency: z.string().length(3).default('GBP'),
  duration: z.number().int().positive('Duration must be at least 1 minute'),
  eventType: z.enum(eventTypeValues),
  cuisineType: z.enum(cuisineTypeValues),
  maxGuests: z.number().int().positive().optional(),
  minGuests: z.number().int().positive().optional(),
  serviceType: z.enum(serviceTypeValues).default('DINING'),
  offersCookingClasses: z.boolean().optional(),
  classType: z.enum(cookingClassTypeValues).optional(),
  pricePerStudent: z.number().positive().optional(),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).optional(),
  includedServices: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  experienceImage: urlSchema,
}).superRefine((data, context) => {
  const isCookingClass = data.serviceType === 'COOKING_CLASS' || data.eventType === 'Cooking Class' || data.offersCookingClasses;

  if (isCookingClass && !data.classType) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['classType'],
      message: 'Class type is required for cooking classes',
    });
  }

  if (isCookingClass && !data.pricePerStudent) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['pricePerStudent'],
      message: 'Price per student is required for cooking classes',
    });
  }
});

// Profile validation
export const profileSchema = z.object({
  bio: z.string().max(1000, 'Bio cannot exceed 1000 characters').optional(),
  experience: z.number().int().min(0).optional(),
  location: z.string().min(1, 'Location is required').max(100),
  radius: z.number().min(1, 'Radius must be at least 1 km').max(500, 'Radius cannot exceed 500 km'),
  profileImage: urlSchema,
});

// Message validation
export const messageSchema = z.object({
  conversationId: z.string().min(1, 'Conversation ID is required'),
  content: z.string().min(1, 'Message cannot be empty').max(5000),
  attachments: z.array(urlSchema).optional(),
});

// Payment validation
export const paymentSchema = z.object({
  bookingId: z.string().min(1, 'Booking ID is required'),
  amount: priceSchema,
  paymentMethod: z.enum(['CARD', 'BANK_TRANSFER', 'WALLET']),
});

// Review validation
export const reviewSchema = z.object({
  bookingId: z.string().min(1, 'Booking ID is required'),
  rating: z.number().int().min(1, 'Rating must be at least 1').max(5, 'Rating cannot exceed 5'),
  comment: z.string().min(10, 'Comment must be at least 10 characters').max(1000),
});
