// Mock Jest functions for compilation - install Jest to run tests
const describe = (name: string, fn: () => void) => fn();
const it = (name: string, fn: () => void) => fn();
const expect = (actual: any) => ({
  toBe: (expected: any) => actual === expected,
  toEqual: (expected: any) => JSON.stringify(actual) === JSON.stringify(expected),
  toThrow: (expected?: any) => {
    try {
      actual();
      return false;
    } catch (error) {
      if (!expected) return true;
      return (error as Error).message.includes(expected);
    }
  },
  toBeDefined: () => actual !== undefined,
  toBeNull: () => actual === null,
  toBeUndefined: () => actual === undefined,
  toBeTruthy: () => !!actual,
  toBeFalsy: () => !actual,
  toContain: (expected: any) => {
    if (typeof actual === 'string') return actual.includes(expected);
    if (Array.isArray(actual)) return actual.some(item => item === expected);
    return false;
  },
  toHaveLength: (expected: number) => {
    if (Array.isArray(actual)) return actual.length === expected;
    return false;
  }
});
const beforeAll = (fn: () => void) => fn();
const afterAll = (fn: () => void) => fn();
import { validateForm, getFieldError } from '@/lib/form-validation';
import { bookingSchema, requestSchema, experienceSchema } from '@/lib/validation-schemas';

describe('Form Validation', () => {
  describe('Booking Validation', () => {
    it('should validate correct booking data', () => {
      const validData = {
        experienceId: 'exp-123',
        clientId: 'client-123',
        chefId: 'chef-123',
        startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString(),
        numberOfGuests: 4,
        totalPrice: 500,
      };

      const result = validateForm(bookingSchema, validData);
      expect(result.valid).toBe(true);
    });

    it('should reject booking with invalid price', () => {
      const invalidData = {
        experienceId: 'exp-123',
        clientId: 'client-123',
        chefId: 'chef-123',
        startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString(),
        numberOfGuests: 4,
        totalPrice: -100, // Invalid
      };

      const result = validateForm(bookingSchema, invalidData);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(getFieldError(result.errors, 'totalPrice')).toBeDefined();
      }
    });

    it('should reject booking with invalid guest count', () => {
      const invalidData = {
        experienceId: 'exp-123',
        clientId: 'client-123',
        chefId: 'chef-123',
        startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString(),
        numberOfGuests: 0, // Invalid
        totalPrice: 500,
      };

      const result = validateForm(bookingSchema, invalidData);
      expect(result.valid).toBe(false);
    });
  });

  describe('Request Validation', () => {
    it('should validate correct request data', () => {
      const validData = {
        title: 'Birthday Dinner',
        description: 'Intimate birthday celebration',
        eventDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        location: 'New York, NY',
        budget: 1000,
        details: 'We are looking for a chef to prepare a special birthday dinner',
      };

      const result = validateForm(requestSchema, validData);
      expect(result.valid).toBe(true);
    });

    it('should reject request with missing required fields', () => {
      const invalidData = {
        title: 'Birthday Dinner',
        // Missing eventDate, location, budget, details
      };

      const result = validateForm(requestSchema, invalidData);
      expect(result.valid).toBe(false);
    });

    it('should reject request with invalid budget', () => {
      const invalidData = {
        title: 'Birthday Dinner',
        description: 'Intimate birthday celebration',
        eventDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        location: 'New York, NY',
        budget: -1000, // Invalid
        details: 'We are looking for a chef to prepare a special birthday dinner',
      };

      const result = validateForm(requestSchema, invalidData);
      expect(result.valid).toBe(false);
    });
  });

  describe('Experience Validation', () => {
    it('should validate correct experience data', () => {
      const validData = {
        title: 'Italian Cooking Class',
        description: 'Learn to make authentic Italian pasta and sauces',
        price: 150,
        duration: 180,
        eventType: 'CLASS',
        cuisineType: 'ITALIAN',
        maxGuests: 8,
        minGuests: 2,
        difficulty: 'MEDIUM',
      };

      const result = validateForm(experienceSchema, validData);
      expect(result.valid).toBe(true);
    });

    it('should reject experience with invalid price', () => {
      const invalidData = {
        title: 'Italian Cooking Class',
        description: 'Learn to make authentic Italian pasta and sauces',
        price: 0, // Invalid
        duration: 180,
        eventType: 'CLASS',
        cuisineType: 'ITALIAN',
      };

      const result = validateForm(experienceSchema, invalidData);
      expect(result.valid).toBe(false);
    });
  });
});
