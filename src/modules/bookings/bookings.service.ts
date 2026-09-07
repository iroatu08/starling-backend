import PDFDocument from 'pdfkit';
import { Prisma, BookingStatus, PaymentStatus, RefundRequestStatus, UserRole, User } from '@prisma/client';
import { prisma } from '../../prisma';
import { NotFoundError, ForbiddenError, BadRequestError } from '../../utils/app-error';
import { sanitizeBooking } from '../../utils/sanitize-user';
import { BookingBundleSnapshot } from '../../types/bundle-snapshot';
import * as cartService from '../cart/cart.service';
import * as mailService from '../mail/mail.service';
import type { z } from 'zod';
import type { createBookingSchema } from './schemas';

type CreateBookingInput = z.infer<typeof createBookingSchema>;

const BOOKING_INCLUDE = {
  items: { include: { package: { include: { destination: true } }, destination: true } },
  travelers: true,
  payment: true,
  refundRequests: true,
  user: true,
} satisfies Prisma.BookingInclude;

function assertBookingStatusTransition(
  current: BookingStatus,
  next: BookingStatus,
  payment: { status: PaymentStatus } | null,
): void {
  if (current === BookingStatus.cancelled || current === BookingStatus.completed) {
    throw new BadRequestError(`Cannot change booking status from ${current}`);
  }

  if (next === BookingStatus.pending) {
    if (current === BookingStatus.confirmed && payment?.status === PaymentStatus.failed) {
      return;
    }
    throw new BadRequestError('Booking can only be set to pending when reverting from confirmed after a failed payment');
  }

  if (next === BookingStatus.confirmed) {
    if (current !== BookingStatus.pending) {
      throw new BadRequestError(`Cannot set status to confirmed from ${current}`);
    }
    if (!payment || payment.status !== PaymentStatus.succeeded) {
      throw new BadRequestError('Cannot confirm booking without a successful payment');
    }
    return;
  }

  if (next === BookingStatus.cancelled) {
    if (current !== BookingStatus.pending && current !== BookingStatus.confirmed) {
      throw new BadRequestError(`Cannot cancel booking from ${current}`);
    }
    return;
  }

  if (next === BookingStatus.completed) {
    if (current !== BookingStatus.confirmed) {
      throw new BadRequestError('Booking must be confirmed before it can be completed');
    }
    return;
  }
}

function generateReference(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `STL-${ts}-${rand}`;
}

interface CartItemForTravelers {
  quantity: number;
  package?: { maxCapacity?: number } | null;
}

function validateTravelers(
  user: User,
  cartItems: CartItemForTravelers[],
  dto?: CreateBookingInput,
): Prisma.BookingTravelerCreateWithoutBookingInput[] {
  const travelersInput = dto?.travelers ?? [];
  if (!travelersInput.length) {
    return [
      {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone ?? null,
        isPrimary: true,
        sortOrder: 0,
      },
    ];
  }

  const totalCapacity = cartItems.reduce((sum, item) => {
    const cap = Number(item.package?.maxCapacity ?? 0);
    return cap > 0 ? sum + cap * item.quantity : sum;
  }, 0);
  if (totalCapacity > 0 && travelersInput.length > totalCapacity) {
    throw new BadRequestError(`Traveler count exceeds package capacity (${totalCapacity})`);
  }

  const primaryCount = travelersInput.filter((traveler) => traveler.isPrimary).length;
  if (primaryCount > 1) {
    throw new BadRequestError('Only one traveler can be marked as primary');
  }

  const normalizedEmailSet = new Set<string>();
  const travelers = travelersInput.map((traveler, index) => {
    const normalizedEmail = traveler.email?.trim().toLowerCase() ?? null;
    if (normalizedEmail) {
      if (normalizedEmailSet.has(normalizedEmail)) {
        throw new BadRequestError('Traveler emails must be unique');
      }
      normalizedEmailSet.add(normalizedEmail);
    }

    return {
      firstName: traveler.firstName.trim(),
      lastName: traveler.lastName.trim(),
      email: normalizedEmail,
      phone: traveler.phone?.trim() || null,
      isPrimary: traveler.isPrimary ?? index === 0,
      sortOrder: index,
    };
  });

  if (!travelers.some((traveler) => traveler.isPrimary)) {
    travelers[0].isPrimary = true;
  }
  return travelers;
}

export async function createFromCart(user: User, dto?: CreateBookingInput) {
  const cart = await cartService.getOrCreateCart(user.id);
  if (!cart.items || cart.items.length === 0) {
    throw new NotFoundError('Your cart is empty');
  }

  const totalAmountNgn = cart.items.reduce((sum, item) => sum + Number(item.unitPriceNgn) * item.quantity, 0);

  const destinationImageUrl =
    cart.items.find((item) => item.package?.destination?.heroImageUrl)?.package?.destination?.heroImageUrl || null;

  const travelers = validateTravelers(user, cart.items, dto);
  const referenceNumber = generateReference();

  const booking = await prisma.booking.create({
    data: {
      userId: user.id,
      referenceNumber,
      status: BookingStatus.pending,
      totalAmountNgn,
      imageUrl: destinationImageUrl,
      travelers: { create: travelers },
    },
  });

  const bookingItemsData = cart.items.map((item) => {
    const snapshot = item.bundleSnapshot as unknown as BookingBundleSnapshot | null;
    const originalTotalNgn = snapshot?.originalTotalNgn ?? Number(item.unitPriceNgn);
    const customizedTotalNgn = snapshot?.customizedTotalNgn ?? Number(item.unitPriceNgn);
    const savingsNgn = snapshot ? Math.max(0, originalTotalNgn - customizedTotalNgn) : 0;

    return {
      bookingId: booking.id,
      destinationId: item.destinationId ?? null,
      packageId: item.packageId ?? null,
      quantity: item.quantity,
      unitPriceNgn: item.unitPriceNgn,
      bundleSnapshot: snapshot
        ? ({
            ...snapshot,
            savingsNgn,
            savingsUsd: Math.max(0, snapshot.originalTotalUsd - snapshot.customizedTotalUsd),
          } as object)
        : undefined,
      originalTotalNgn,
      customizedTotalNgn,
      savingsNgn,
    };
  });
  await prisma.bookingItem.createMany({ data: bookingItemsData });

  await cartService.clearCart(user.id);

  const fullBooking = await findOne(booking.id);
  await mailService.sendBookingInitiated(user, fullBooking);

  return fullBooking;
}

export async function findMyBookings(userId: string) {
  return prisma.booking.findMany({
    where: { userId },
    include: BOOKING_INCLUDE,
    orderBy: { createdAt: 'desc' },
  });
}

export async function findOne(id: string) {
  const booking = await prisma.booking.findUnique({ where: { id }, include: BOOKING_INCLUDE });
  if (!booking) throw new NotFoundError('Booking not found');
  return sanitizeBooking(booking);
}

export async function findOneForUser(id: string, userId: string, role: UserRole) {
  const booking = await findOne(id);
  if (role !== UserRole.admin && booking.userId !== userId) {
    throw new ForbiddenError('You cannot access this booking');
  }
  return booking;
}

export interface AdminBookingFilters {
  destinationId?: string;
  userId?: string;
  from?: string;
  to?: string;
}

export async function findAll(page = 1, limit = 20, status?: BookingStatus, filters?: AdminBookingFilters) {
  const where: Prisma.BookingWhereInput = {};
  if (status) where.status = status;
  if (filters?.destinationId) where.items = { some: { destinationId: filters.destinationId } };
  if (filters?.userId) where.userId = filters.userId;
  if (filters?.from || filters?.to) {
    where.createdAt = {
      ...(filters.from ? { gte: new Date(filters.from) } : {}),
      ...(filters.to ? { lte: new Date(filters.to) } : {}),
    };
  }

  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      include: BOOKING_INCLUDE,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.booking.count({ where }),
  ]);

  return { bookings: bookings.map((b) => sanitizeBooking(b)), total, page, limit };
}

export async function updateStatus(id: string, status: BookingStatus, _user: User) {
  const booking = await findOne(id);
  if (booking.status === status) {
    return booking;
  }

  const payment = await prisma.payment.findUnique({ where: { bookingId: id } });
  assertBookingStatusTransition(booking.status, status, payment);

  await prisma.booking.update({ where: { id }, data: { status } });
  const updated = await findOne(id);
  await mailService.sendBookingStatusUpdate(updated.user!, updated);
  return updated;
}

export async function requestRefund(id: string, user: User, reason: string) {
  const booking = await findOneForUser(id, user.id, user.role);
  if (booking.status !== BookingStatus.confirmed) {
    throw new BadRequestError('Only confirmed bookings can request refunds');
  }
  if (!booking.payment || booking.payment.status !== PaymentStatus.succeeded) {
    throw new BadRequestError('Only paid bookings can request refunds');
  }

  const existingOpen = await prisma.refundRequest.findFirst({
    where: { bookingId: id, status: RefundRequestStatus.pending },
  });
  if (existingOpen) {
    throw new BadRequestError('A refund request for this booking is already pending');
  }

  const refundRequest = await prisma.refundRequest.create({
    data: {
      bookingId: id,
      userId: user.id,
      reason: reason.trim(),
      requestedAmountNgn: booking.payment.amountNgn,
      status: RefundRequestStatus.pending,
    },
  });
  await mailService.sendAdminAlert('refund.requested', {
    bookingId: booking.id,
    referenceNumber: booking.referenceNumber,
    userId: user.id,
    reason: refundRequest.reason,
    requestedAmountNgn: refundRequest.requestedAmountNgn,
  });
  return refundRequest;
}

export async function generateReceiptPdf(id: string, user: User): Promise<{ fileName: string; buffer: Buffer }> {
  const booking = await findOneForUser(id, user.id, user.role);

  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  const chunks: Buffer[] = [];
  doc.on('data', (chunk) => chunks.push(chunk as Buffer));
  const done = new Promise<Buffer>((resolve) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
  });

  doc.fontSize(20).text('Starlings Hospitality', { align: 'left' });
  doc.moveDown(0.4);
  doc.fontSize(14).text('Booking Receipt');
  doc.moveDown(0.8);
  doc.fontSize(11).text(`Reference: ${booking.referenceNumber}`);
  doc.text(`Created: ${new Date(booking.createdAt).toLocaleString()}`);
  doc.text(`Status: ${booking.status}`);
  if (booking.payment?.paystackReference) {
    doc.text(`Payment reference: ${booking.payment.paystackReference}`);
  }
  doc.moveDown(0.8);
  doc.fontSize(12).text('Travelers', { underline: true });
  const travelers = booking.travelers ?? [];
  if (!travelers.length) {
    doc.fontSize(10).text('No traveler data recorded');
  } else {
    travelers.forEach((traveler, index) => {
      const travelerLine =
        `${index + 1}. ${traveler.firstName} ${traveler.lastName}` +
        `${traveler.isPrimary ? ' (Primary)' : ''}` +
        ` — ${traveler.email || 'No email'}` +
        `${traveler.phone ? ` / ${traveler.phone}` : ''}`;
      doc.fontSize(10).text(travelerLine);
    });
  }
  doc.moveDown(0.8);
  doc.fontSize(12).text('Line items', { underline: true });
  booking.items.forEach((item, index) => {
    const title = item.package?.title || item.destination?.name || 'Booking item';
    const lineTotal = Number(item.unitPriceNgn) * item.quantity;
    doc.fontSize(10).text(`${index + 1}. ${title} x${item.quantity} — NGN ${lineTotal}`);
  });
  doc.moveDown(0.8);
  doc.fontSize(12).text(`Total: NGN ${booking.totalAmountNgn}`);
  doc.end();

  const buffer = await done;
  return {
    fileName: `receipt-${booking.referenceNumber}.pdf`,
    buffer,
  };
}
