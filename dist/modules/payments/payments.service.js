"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.initialize = initialize;
exports.verify = verify;
exports.handleWebhook = handleWebhook;
exports.getHistory = getHistory;
exports.getAllPayments = getAllPayments;
exports.updateStatus = updateStatus;
exports.approveRefundRequest = approveRefundRequest;
exports.rejectRefundRequest = rejectRefundRequest;
exports.getRefundRequests = getRefundRequests;
const crypto = __importStar(require("crypto"));
// eslint-disable-next-line @typescript-eslint/no-var-requires
const Paystack = require('paystack');
const uuid_1 = require("uuid");
const client_1 = require("@prisma/client");
const prisma_1 = require("../../prisma");
const env_1 = require("../../config/env");
const app_error_1 = require("../../utils/app-error");
const sanitize_user_1 = require("../../utils/sanitize-user");
const mailService = __importStar(require("../mail/mail.service"));
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const paystack = Paystack(env_1.env.PAYSTACK_SECRET_KEY);
const POST_PAYMENT_INCLUDE = {
    booking: {
        include: {
            user: true,
            items: { include: { package: { include: { destination: true } }, destination: true } },
            travelers: true,
        },
    },
};
async function sendPostPaymentEmails(paymentId, fallbackUser) {
    const payment = await prisma_1.prisma.payment.findUnique({ where: { id: paymentId }, include: POST_PAYMENT_INCLUDE });
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
async function markRefundCompletedByPaymentReference(reference, responseData) {
    const payment = await prisma_1.prisma.payment.findUnique({ where: { paystackReference: reference } });
    if (!payment)
        return;
    await prisma_1.prisma.payment.update({
        where: { id: payment.id },
        data: { status: client_1.PaymentStatus.refunded, paystackResponse: responseData },
    });
    if (payment.bookingId) {
        await prisma_1.prisma.booking.update({ where: { id: payment.bookingId }, data: { status: client_1.BookingStatus.cancelled } });
        const pendingRefund = await prisma_1.prisma.refundRequest.findFirst({
            where: { bookingId: payment.bookingId, status: client_1.RefundRequestStatus.approved },
            orderBy: { createdAt: 'desc' },
        });
        if (pendingRefund) {
            await prisma_1.prisma.refundRequest.update({
                where: { id: pendingRefund.id },
                data: { status: client_1.RefundRequestStatus.completed, resolvedAt: new Date() },
            });
        }
    }
}
async function initialize(user, dto) {
    const booking = await prisma_1.prisma.booking.findFirst({ where: { id: dto.bookingId, userId: user.id } });
    if (!booking)
        throw new app_error_1.NotFoundError('Booking not found');
    if (booking.status !== client_1.BookingStatus.pending) {
        throw new app_error_1.BadRequestError('Only pending bookings can be paid for');
    }
    const amountKobo = Math.round(Number(booking.totalAmountNgn) * 100);
    if (dto.amount !== undefined && dto.amount !== amountKobo) {
        throw new app_error_1.BadRequestError('Amount does not match booking total');
    }
    const existingPayment = await prisma_1.prisma.payment.findUnique({ where: { bookingId: booking.id } });
    if (existingPayment?.status === client_1.PaymentStatus.succeeded) {
        throw new app_error_1.BadRequestError('This booking is already paid');
    }
    const reference = `STL-PAY-${(0, uuid_1.v4)().split('-')[0].toUpperCase()}`;
    const response = await paystack.transaction.initialize({
        email: dto.email,
        amount: amountKobo,
        currency: dto.currency || 'NGN',
        reference,
        callback_url: dto.callbackUrl || `${env_1.env.FRONTEND_URL}/checkout/success`,
        metadata: { bookingId: dto.bookingId, userId: user.id },
    });
    const accessCode = response.data?.access_code;
    const amountNgn = amountKobo / 100;
    const currency = dto.currency || 'NGN';
    if (existingPayment) {
        await prisma_1.prisma.payment.update({
            where: { id: existingPayment.id },
            data: {
                paystackReference: reference,
                paystackAccessCode: accessCode,
                amountNgn,
                currency,
                status: client_1.PaymentStatus.pending,
            },
        });
    }
    else {
        await prisma_1.prisma.payment.create({
            data: {
                bookingId: dto.bookingId,
                userId: user.id,
                paystackReference: reference,
                paystackAccessCode: accessCode,
                amountNgn,
                currency,
                status: client_1.PaymentStatus.pending,
            },
        });
    }
    return {
        authorization_url: response.data?.authorization_url,
        access_code: accessCode,
        reference,
    };
}
async function verify(reference, user) {
    const payment = await prisma_1.prisma.payment.findUnique({ where: { paystackReference: reference }, include: { booking: true } });
    if (!payment)
        throw new app_error_1.NotFoundError('Payment record not found');
    if (payment.userId !== user.id) {
        throw new app_error_1.ForbiddenError('This payment does not belong to the current user');
    }
    if (payment.status === client_1.PaymentStatus.succeeded) {
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
        throw new app_error_1.BadRequestError('Payment verification failed');
    }
    await prisma_1.prisma.payment.update({
        where: { id: payment.id },
        data: {
            status: client_1.PaymentStatus.succeeded,
            channel: data.channel,
            paidAt: new Date(data.paid_at),
            paystackResponse: data,
        },
    });
    if (payment.bookingId) {
        await prisma_1.prisma.booking.update({ where: { id: payment.bookingId }, data: { status: client_1.BookingStatus.confirmed } });
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
async function handleWebhook(payload, signature) {
    const secret = env_1.env.PAYSTACK_WEBHOOK_SECRET;
    if (!secret) {
        throw new app_error_1.UnauthorizedError('Webhook secret is not configured');
    }
    const hash = crypto.createHmac('sha512', secret).update(JSON.stringify(payload)).digest('hex');
    if (hash !== signature)
        throw new app_error_1.UnauthorizedError('Invalid webhook signature');
    const event = payload.event;
    const data = payload.data;
    console.log(`Paystack webhook: ${event}`);
    if (event === 'charge.success') {
        const payment = await prisma_1.prisma.payment.findUnique({ where: { paystackReference: data.reference } });
        if (payment && payment.status !== client_1.PaymentStatus.succeeded) {
            await prisma_1.prisma.payment.update({
                where: { id: payment.id },
                data: { status: client_1.PaymentStatus.succeeded, paidAt: new Date(), paystackResponse: data },
            });
            if (payment.bookingId) {
                await prisma_1.prisma.booking.update({ where: { id: payment.bookingId }, data: { status: client_1.BookingStatus.confirmed } });
            }
            const user = await prisma_1.prisma.user.findUnique({ where: { id: payment.userId } });
            await sendPostPaymentEmails(payment.id, user || undefined);
        }
    }
    else if (event === 'refund.processed' || event === 'charge.refund') {
        await markRefundCompletedByPaymentReference(data.reference, data);
    }
    else if (event === 'charge.dispute.create') {
        await mailService.sendAdminAlert('charge.dispute', data);
    }
    return { received: true };
}
async function getHistory(userId) {
    return prisma_1.prisma.payment.findMany({
        where: { userId },
        include: { booking: true },
        orderBy: { createdAt: 'desc' },
    });
}
async function getAllPayments(filters = {}) {
    const page = Number.isFinite(filters.page) ? Number(filters.page) : 1;
    const limit = Number.isFinite(filters.limit) ? Number(filters.limit) : 20;
    const where = {};
    if (filters.status)
        where.status = filters.status;
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
        prisma_1.prisma.payment.findMany({
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
        prisma_1.prisma.payment.count({ where }),
    ]);
    return {
        payments: payments.map((p) => (0, sanitize_user_1.sanitizePayment)(p)),
        total,
        page,
        limit,
    };
}
async function updateStatus(paymentId, status) {
    const payment = await prisma_1.prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment)
        throw new app_error_1.NotFoundError('Payment not found');
    const paidAt = status === client_1.PaymentStatus.succeeded ? (payment.paidAt ?? new Date()) : null;
    await prisma_1.prisma.payment.update({ where: { id: paymentId }, data: { status, paidAt } });
    if (payment.bookingId) {
        if (status === client_1.PaymentStatus.succeeded) {
            await prisma_1.prisma.booking.update({ where: { id: payment.bookingId }, data: { status: client_1.BookingStatus.confirmed } });
        }
        else if (status === client_1.PaymentStatus.refunded) {
            await prisma_1.prisma.booking.update({ where: { id: payment.bookingId }, data: { status: client_1.BookingStatus.cancelled } });
        }
        else if (status === client_1.PaymentStatus.refund_pending) {
            await prisma_1.prisma.booking.update({ where: { id: payment.bookingId }, data: { status: client_1.BookingStatus.confirmed } });
        }
        else if (status === client_1.PaymentStatus.failed) {
            await prisma_1.prisma.booking.update({ where: { id: payment.bookingId }, data: { status: client_1.BookingStatus.pending } });
        }
    }
    return prisma_1.prisma.payment.findUnique({
        where: { id: paymentId },
        include: { booking: { include: { user: true, items: { include: { package: { include: { destination: true } } } } } } },
    });
}
async function approveRefundRequest(refundRequestId, admin) {
    const refund = await prisma_1.prisma.refundRequest.findUnique({ where: { id: refundRequestId }, include: { booking: true } });
    if (!refund)
        throw new app_error_1.NotFoundError('Refund request not found');
    if (refund.status !== client_1.RefundRequestStatus.pending) {
        throw new app_error_1.BadRequestError('Only pending refund requests can be approved');
    }
    const payment = await prisma_1.prisma.payment.findFirst({
        where: { bookingId: refund.bookingId },
        orderBy: { createdAt: 'desc' },
    });
    if (!payment || payment.status !== client_1.PaymentStatus.succeeded) {
        throw new app_error_1.BadRequestError('Booking has no successful payment to refund');
    }
    await prisma_1.prisma.refundRequest.update({
        where: { id: refund.id },
        data: { status: client_1.RefundRequestStatus.approved, adminId: admin.id, resolvedAt: new Date() },
    });
    await prisma_1.prisma.payment.update({ where: { id: payment.id }, data: { status: client_1.PaymentStatus.refund_pending } });
    try {
        const paystackRefund = await paystack.refund.create({
            transaction: payment.paystackReference,
            amount: Math.round(Number(refund.requestedAmountNgn) * 100),
        });
        const refundReference = paystackRefund?.data?.reference || paystackRefund?.data?.refund_reference || null;
        await prisma_1.prisma.refundRequest.update({
            where: { id: refund.id },
            data: { paystackRefundReference: refundReference },
        });
        return prisma_1.prisma.refundRequest.findUnique({ where: { id: refund.id }, include: { booking: true, user: true } });
    }
    catch (error) {
        await prisma_1.prisma.refundRequest.update({
            where: { id: refund.id },
            data: { status: client_1.RefundRequestStatus.failed, failureReason: error.message },
        });
        await prisma_1.prisma.payment.update({ where: { id: payment.id }, data: { status: client_1.PaymentStatus.succeeded } });
        throw new app_error_1.BadRequestError('Paystack refund failed to initialize');
    }
}
async function rejectRefundRequest(refundRequestId, admin, reason) {
    const refund = await prisma_1.prisma.refundRequest.findUnique({ where: { id: refundRequestId } });
    if (!refund)
        throw new app_error_1.NotFoundError('Refund request not found');
    if (refund.status !== client_1.RefundRequestStatus.pending) {
        throw new app_error_1.BadRequestError('Only pending refund requests can be rejected');
    }
    await prisma_1.prisma.refundRequest.update({
        where: { id: refund.id },
        data: {
            status: client_1.RefundRequestStatus.rejected,
            adminId: admin.id,
            resolvedAt: new Date(),
            failureReason: reason.trim(),
        },
    });
    return prisma_1.prisma.refundRequest.findUnique({ where: { id: refund.id }, include: { booking: true, user: true } });
}
async function getRefundRequests(filters = {}) {
    const page = Number.isFinite(filters.page) ? Number(filters.page) : 1;
    const limit = Number.isFinite(filters.limit) ? Number(filters.limit) : 20;
    const where = {};
    if (filters.status)
        where.status = filters.status;
    const [requests, total] = await Promise.all([
        prisma_1.prisma.refundRequest.findMany({
            where,
            include: { booking: true, user: true },
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * limit,
            take: limit,
        }),
        prisma_1.prisma.refundRequest.count({ where }),
    ]);
    return { requests, total, page, limit };
}
//# sourceMappingURL=payments.service.js.map