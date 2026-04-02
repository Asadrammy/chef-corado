import { z } from 'zod';

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
export const requestSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(100),
  description: z.string().max(5000, 'Description cannot exceed 5000 characters').optional(),
  eventDate: futureDate,
  location: z.string().min(3, 'Location must be at least 3 characters').max(100),
  budget: priceSchema,
  details: z.string().min(10, 'Details must be at least 10 characters').max(5000),
});

// Experience validation
export const experienceSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(100),
  description: z.string().min(10, 'Description must be at least 10 characters').max(5000),
  price: priceSchema,
  duration: z.number().int().positive('Duration must be at least 1 minute'),
  eventType: z.string().min(1, 'Event type is required'),
  cuisineType: z.string().min(1, 'Cuisine type is required'),
  maxGuests: z.number().int().positive().optional(),
  minGuests: z.number().int().positive().optional(),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).optional(),
  includedServices: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  experienceImage: urlSchema,
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
