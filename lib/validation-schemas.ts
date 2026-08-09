import { z } from 'zod';
import {
  COOKING_CLASS_TYPES,
  COUNTRY_OPTIONS,
  CUISINE_TYPES,
  DIETARY_REQUIREMENTS,
  EVENT_TYPES,
  LEGACY_EXPERIENCE_SERVICE_TYPES,
  REQUEST_SERVICE_TYPES,
  SERVICE_TYPES,
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

const requestBaseSchema = z.object({
  title: z.string().max(100, 'Title cannot exceed 100 characters').optional(),
  eventType: z.enum(eventTypeValues),
  serviceType: z.enum(requestServiceTypeValues),
  cuisinePreferences: z.array(z.enum(cuisineTypeValues)).min(1, 'Select at least one cuisine preference').max(3, 'Select up to 3 cuisine preferences'),
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
}).extend({
  eventType: z.literal('Multi-Day Chef Hire'),
  eventDates: z.array(futureDate).min(2, 'Select at least two dates').max(30, 'Select up to 30 dates'),
  dailyServiceTimes: z.string().min(3).max(2000),
  serviceNeedsPerDay: z.string().min(3).max(3000),
  accommodationTravel: z.string().max(2000).optional(),
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
  cuisinePreferences: z.array(z.enum(cuisineTypeValues)).max(3).default([]),
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
