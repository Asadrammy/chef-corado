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
        eventType: 'Birthday',
        serviceType: 'FOUR_FIVE_COURSE_MEAL',
        serviceTier: 'Casual dining',
        cuisinePreferences: ['Italian'],
        dietaryRequirements: [],
        description: 'Intimate birthday celebration',
        eventDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        eventTime: '19:00',
        location: 'New York, NY',
        country: 'US',
        guestCount: 5,
        adultCount: 5,
        childrenUnder10: 0,
        actualAttendeeCount: 5,
        billableGuestCount: 5,
        pricingGuestCount: 5,
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

    it('should normalize legacy cuisine labels and enforce required service questions', () => {
      const baseData = {
        title: 'Sharing buffet',
        eventType: 'Hen / Stag Do',
        serviceType: 'SHARING_BUFFET',
        serviceTier: 'Casual dining',
        cuisinePreferences: ['Canap\u00e8 Party'],
        dietaryRequirements: [],
        eventDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        eventTime: '19:00',
        location: 'London',
        country: 'GB',
        guestCount: 8,
        adultCount: 8,
        childrenUnder10: 0,
        actualAttendeeCount: 8,
        billableGuestCount: 8,
        pricingGuestCount: 8,
        budget: 600,
      };

      expect(validateForm(requestSchema, baseData).valid).toBe(false);
      expect(validateForm(requestSchema, {
        ...baseData,
        serviceSpecificAnswers: {
          setupDetails: 'Long buffet table with two hours of setup access.',
        },
      }).valid).toBe(true);
    });
  });

  describe('Experience Validation', () => {
    it('should validate correct experience data', () => {
      const validData = {
        title: 'Italian Cooking Class',
        description: 'Learn to make authentic Italian pasta and sauces',
        price: 150,
        duration: 180,
        eventType: 'Dinner Party',
        cuisineType: 'Italian',
        maxGuests: 8,
        minGuests: 2,
        serviceType: 'DINING',
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
