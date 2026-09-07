import * as crypto from 'crypto';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const Paystack = require('paystack');
import { v4 as uuidv4 } from 'uuid';
import { Prisma, PaymentStatus, RefundRequestStatus, BookingStatus, User } from '@prisma/client';
import { prisma } from '../../prisma';
import { env } from '../../config/env';
import { NotFoundError, UnauthorizedError, BadRequestError, ForbiddenError } from '../../utils/app-error';
import { sanitizePayment } from '../../utils/sanitize-user';
import * as mailService from '../mail/mail.service';
import type { z } from 'zod';
import type { initializePaymentSchema } from './schemas';

type InitializePaymentInput = z.infer<typeof initializePaymentSchema>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const paystack: any = Paystack(env.PAYSTACK_SECRET_KEY);

const POST_PAYMENT_INCLUDE = {
  booking: {
    include: {
      user: true,
      items: { include: { package: { include: { destination: true } }, destination: true } },
      travelers: true,
    },
  },
} satisfies Prisma.PaymentInclude;

async function sendPostPaymentEmails(paymentId: string, fallbackUser?: User): Promise<void> {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId }, include: POST_PAYMENT_INCLUDE });
  if (!payment?.booking) {
    console.warn(`sendPostPaymentEmails: no booking for payment ${paymentId}`);
    return;
  }

  const bookingOwner = payment.booking.user || fallbackUser;
  if (!bookingOwner) {
    console.warn(`sendPostPaymentEmails: missing owner user for payment ${paymentId} (booking ${payment.booking.id})`);
    return;
  }
  await mailService.sendOwnerPostPaymentSummary(bookingOwner, payment.booking, payment);
  await mailService.sendTravelerNotifications(payment.booking, payment, bookingOwner.email);
}

async function markRefundCompletedByPaymentReference(reference: string, responseData: unknown): Promise<void> {
  const payment = await prisma.payment.findUnique({ where: { paystackReference: reference } });
  if (!payment) return;

  await prisma.payment.update({
    where: { id: payment.id },
    data: { status: PaymentStatus.refunded, paystackResponse: responseData as Prisma.InputJsonValue },
  });
  if (payment.bookingId) {
    await prisma.booking.update({ where: { id: payment.bookingId }, data: { status: BookingStatus.cancelled } });
    const pendingRefund = await prisma.refundRequest.findFirst({
      where: { bookingId: payment.bookingId, status: RefundRequestStatus.approved },
      orderBy: { createdAt: 'desc' },
    });
    if (pendingRefund) {
      await prisma.refundRequest.update({
        where: { id: pendingRefund.id },
        data: { status: RefundRequestStatus.completed, resolvedAt: new Date() },
      });
    }
  }
}

export async function initialize(user: User, dto: InitializePaymentInput) {
  const booking = await prisma.booking.findFirst({ where: { id: dto.bookingId, userId: user.id } });
  if (!booking) throw new NotFoundError('Booking not found');

  if (booking.status !== BookingStatus.pending) {
    throw new BadRequestError('Only pending bookings can be paid for');
  }

  const amountKobo = Math.round(Number(booking.totalAmountNgn) * 100);
  if (dto.amount !== undefined && dto.amount !== amountKobo) {
    throw new BadRequestError('Amount does not match booking total');
  }

  const existingPayment = await prisma.payment.findUnique({ where: { bookingId: booking.id } });
  if (existingPayment?.status === PaymentStatus.succeeded) {
    throw new BadRequestError('This booking is already paid');
  }

  const reference = `STL-PAY-${uuidv4().split('-')[0].toUpperCase()}`;

  const response = await paystack.transaction.initialize({
    email: dto.email,
    amount: amountKobo,
    currency: dto.currency || 'NGN',
    reference,
    callback_url: dto.callbackUrl || `${env.FRONTEND_URL}/checkout/success`,
    metadata: { bookingId: dto.bookingId, userId: user.id },
  });

  const accessCode = response.data?.access_code;
  const amountNgn = amountKobo / 100;
  const currency = dto.currency || 'NGN';

  if (existingPayment) {
    await prisma.payment.update({
      where: { id: existingPayment.id },
      data: {
        paystackReference: reference,
        paystackAccessCode: accessCode,
        amountNgn,
        currency,
        status: PaymentStatus.pending,
      },
    });
  } else {
    await prisma.payment.create({
      data: {
        bookingId: dto.bookingId,
        userId: user.id,
        paystackReference: reference,
        paystackAccessCode: accessCode,
        amountNgn,
        currency,
        status: PaymentStatus.pending,
      },
    });
  }

  return {
    authorization_url: response.data?.authorization_url,
    access_code: accessCode,
    reference,
  };
}

export async function verify(reference: string, user: User) {
  const payment = await prisma.payment.findUnique({ where: { paystackReference: reference }, include: { booking: true } });
  if (!payment) throw new NotFoundError('Payment record not found');
  if (payment.userId !== user.id) {
    throw new ForbiddenError('This payment does not belong to the current user');
  }

  if (payment.status === PaymentStatus.succeeded) {
    console.log(`verify: payment already succeeded for ${reference}, skipping Paystack and emails`);
    return {
      status: 'success',
      amount: Number(payment.amountNgn),
      reference,
      bookingId: payment.bookingId,
      alreadyProcessed: true,
    };
  }

  const response = await paystack.transaction.verify(reference);
  const data = response.data;

  if (!data || data.status !== 'success') {
    throw new BadRequestError('Payment verification failed');
  }

  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: PaymentStatus.succeeded,
      channel: data.channel,
      paidAt: new Date(data.paid_at),
      paystackResponse: data,
    },
  });

  if (payment.bookingId) {
    await prisma.booking.update({ where: { id: payment.bookingId }, data: { status: BookingStatus.confirmed } });
  }
  await sendPostPaymentEmails(payment.id, user);

  return {
    status: 'success',
    amount: data.amount / 100,
    reference,
    bookingId: payment.bookingId,
    alreadyProcessed: false,
  };
}

/** Paystack webhook. Signature check replays the exact behavior of the old Nest handler: HMAC over `JSON.stringify(parsedBody)`. */
export async function handleWebhook(payload: Record<string, unknown>, signature: string) {
  const secret = env.PAYSTACK_WEBHOOK_SECRET;
  if (!secret) {
    throw new UnauthorizedError('Webhook secret is not configured');
  }
  const hash = crypto.createHmac('sha512', secret).update(JSON.stringify(payload)).digest('hex');

  if (hash !== signature) throw new UnauthorizedError('Invalid webhook signature');

  const event = payload.event as string;
  const data = payload.data as Record<string, unknown>;

  console.log(`Paystack webhook: ${event}`);

  if (event === 'charge.success') {
    const payment = await prisma.payment.findUnique({ where: { paystackReference: data.reference as string } });
    if (payment && payment.status !== PaymentStatus.succeeded) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.succeeded, paidAt: new Date(), paystackResponse: data as Prisma.InputJsonValue },
      });
      if (payment.bookingId) {
        await prisma.booking.update({ where: { id: payment.bookingId }, data: { status: BookingStatus.confirmed } });
      }
      const user = await prisma.user.findUnique({ where: { id: payment.userId } });
      await sendPostPaymentEmails(payment.id, user || undefined);
    }
  } else if (event === 'refund.processed' || event === 'charge.refund') {
    await markRefundCompletedByPaymentReference(data.reference as string, data);
  } else if (event === 'charge.dispute.create') {
    await mailService.sendAdminAlert('charge.dispute', data);
  }

  return { received: true };
}

export async function getHistory(userId: string) {
  return prisma.payment.findMany({
    where: { userId },
    include: { booking: true },
    orderBy: { createdAt: 'desc' },
  });
}

export interface AdminPaymentsFilters {
  page?: number;
  limit?: number;
  status?: PaymentStatus;
  search?: string;
}

export async function getAllPayments(filters: AdminPaymentsFilters = {}) {
  const page = Number.isFinite(filters.page) ? Number(filters.page) : 1;
  const limit = Number.isFinite(filters.limit) ? Number(filters.limit) : 20;

  const where: Prisma.PaymentWhereInput = {};
  if (filters.status) where.status = filters.status;

  const search = filters.search?.trim();
  if (search) {
    where.OR = [
      { paystackReference: { contains: search, mode: 'insensitive' } },
      { booking: { referenceNumber: { contains: search, mode: 'insensitive' } } },
      { booking: { user: { email: { contains: search, mode: 'insensitive' } } } },
      { booking: { user: { firstName: { contains: search, mode: 'insensitive' } } } },
      { booking: { user: { lastName: { contains: search, mode: 'insensitive' } } } },
      { booking: { items: { some: { package: { title: { contains: search, mode: 'insensitive' } } } } } },
      { booking: { items: { some: { package: { destination: { name: { contains: search, mode: 'insensitive' } } } } } } },
    ];
  }

  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      include: {
        booking: {
          include: {
            user: true,
            items: { include: { package: { include: { destination: true } } } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.payment.count({ where }),
  ]);

  return {
    payments: payments.map((p) => sanitizePayment(p)),
    total,
    page,
    limit,
  };
}

export async function updateStatus(paymentId: string, status: PaymentStatus) {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment) throw new NotFoundError('Payment not found');

  const paidAt = status === PaymentStatus.succeeded ? (payment.paidAt ?? new Date()) : null;
  await prisma.payment.update({ where: { id: paymentId }, data: { status, paidAt } });

  if (payment.bookingId) {
    if (status === PaymentStatus.succeeded) {
      await prisma.booking.update({ where: { id: payment.bookingId }, data: { status: BookingStatus.confirmed } });
    } else if (status === PaymentStatus.refunded) {
      await prisma.booking.update({ where: { id: payment.bookingId }, data: { status: BookingStatus.cancelled } });
    } else if (status === PaymentStatus.refund_pending) {
      await prisma.booking.update({ where: { id: payment.bookingId }, data: { status: BookingStatus.confirmed } });
    } else if (status === PaymentStatus.failed) {
      await prisma.booking.update({ where: { id: payment.bookingId }, data: { status: BookingStatus.pending } });
    }
  }

  return prisma.payment.findUnique({
    where: { id: paymentId },
    include: { booking: { include: { user: true, items: { include: { package: { include: { destination: true } } } } } } },
  });
}

export async function approveRefundRequest(refundRequestId: string, admin: User) {
  const refund = await prisma.refundRequest.findUnique({ where: { id: refundRequestId }, include: { booking: true } });
  if (!refund) throw new NotFoundError('Refund request not found');
  if (refund.status !== RefundRequestStatus.pending) {
    throw new BadRequestError('Only pending refund requests can be approved');
  }

  const payment = await prisma.payment.findFirst({
    where: { bookingId: refund.bookingId },
    orderBy: { createdAt: 'desc' },
  });
  if (!payment || payment.status !== PaymentStatus.succeeded) {
    throw new BadRequestError('Booking has no successful payment to refund');
  }

  await prisma.refundRequest.update({
    where: { id: refund.id },
    data: { status: RefundRequestStatus.approved, adminId: admin.id, resolvedAt: new Date() },
  });
  await prisma.payment.update({ where: { id: payment.id }, data: { status: PaymentStatus.refund_pending } });

  try {
    const paystackRefund = await paystack.refund.create({
      transaction: payment.paystackReference,
      amount: Math.round(Number(refund.requestedAmountNgn) * 100),
    });
    const refundReference = paystackRefund?.data?.reference || paystackRefund?.data?.refund_reference || null;
    await prisma.refundRequest.update({
      where: { id: refund.id },
      data: { paystackRefundReference: refundReference },
    });
    return prisma.refundRequest.findUnique({ where: { id: refund.id }, include: { booking: true, user: true } });
  } catch (error) {
    await prisma.refundRequest.update({
      where: { id: refund.id },
      data: { status: RefundRequestStatus.failed, failureReason: (error as Error).message },
    });
    await prisma.payment.update({ where: { id: payment.id }, data: { status: PaymentStatus.succeeded } });
    throw new BadRequestError('Paystack refund failed to initialize');
  }
}

export async function rejectRefundRequest(refundRequestId: string, admin: User, reason: string) {
  const refund = await prisma.refundRequest.findUnique({ where: { id: refundRequestId } });
  if (!refund) throw new NotFoundError('Refund request not found');
  if (refund.status !== RefundRequestStatus.pending) {
    throw new BadRequestError('Only pending refund requests can be rejected');
  }
  await prisma.refundRequest.update({
    where: { id: refund.id },
    data: {
      status: RefundRequestStatus.rejected,
      adminId: admin.id,
      resolvedAt: new Date(),
      failureReason: reason.trim(),
    },
  });
  return prisma.refundRequest.findUnique({ where: { id: refund.id }, include: { booking: true, user: true } });
}

export interface AdminRefundFilters {
  page?: number;
  limit?: number;
  status?: RefundRequestStatus;
}

export async function getRefundRequests(filters: AdminRefundFilters = {}) {
  const page = Number.isFinite(filters.page) ? Number(filters.page) : 1;
  const limit = Number.isFinite(filters.limit) ? Number(filters.limit) : 20;

  const where: Prisma.RefundRequestWhereInput = {};
  if (filters.status) where.status = filters.status;

  const [requests, total] = await Promise.all([
    prisma.refundRequest.findMany({
      where,
      include: { booking: true, user: true },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.refundRequest.count({ where }),
  ]);

  return { requests, total, page, limit };
}
