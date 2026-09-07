import type { User, Booking, Payment } from '@prisma/client';

/** Safe subset of `User` for API responses (no secrets or auth tokens). */
export type PublicUser = Omit<
  User,
  'passwordHash' | 'refreshTokenHash' | 'verificationToken' | 'resetPasswordToken' | 'resetPasswordExpires'
>;

export function toPublicUser(user: User): PublicUser {
  const {
    passwordHash: _ph,
    refreshTokenHash: _rt,
    verificationToken: _vt,
    resetPasswordToken: _rpt,
    resetPasswordExpires: _rpe,
    ...rest
  } = user;
  return rest;
}

type BookingWithUser = Booking & { user?: User | null; [key: string]: unknown };

export function sanitizeBooking<T extends BookingWithUser>(booking: T): T {
  if (!booking?.user) return booking;
  return { ...booking, user: toPublicUser(booking.user) };
}

type PaymentWithBooking = Payment & { booking?: BookingWithUser | null; [key: string]: unknown };

export function sanitizePayment<T extends PaymentWithBooking>(payment: T): T {
  if (!payment?.booking) return payment;
  return { ...payment, booking: sanitizeBooking(payment.booking) };
}
