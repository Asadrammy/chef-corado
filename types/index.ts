export const Role = {
  CLIENT: 'CLIENT',
  CHEF: 'CHEF',
  ADMIN: 'ADMIN',
} as const;

export type Role = typeof Role[keyof typeof Role];

export const BookingStatus = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;

export type BookingStatus = typeof BookingStatus[keyof typeof BookingStatus];

export const ProposalStatus = {
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  ACCEPTED_PENDING_PAYMENT: 'ACCEPTED_PENDING_PAYMENT',
  REJECTED: 'REJECTED',
  BOOKED: 'BOOKED',
  EXPIRED: 'EXPIRED',
  WITHDRAWN: 'WITHDRAWN',
} as const;

export type ProposalStatus = typeof ProposalStatus[keyof typeof ProposalStatus];

export const PaymentStatus = {
  PENDING: 'PENDING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  HELD: 'HELD',
  RELEASED: 'RELEASED',
  PAID: 'PAID',
} as const;

export type PaymentStatus = typeof PaymentStatus[keyof typeof PaymentStatus];
