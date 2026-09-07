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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createFromCart = createFromCart;
exports.findMyBookings = findMyBookings;
exports.findOne = findOne;
exports.findOneForUser = findOneForUser;
exports.findAll = findAll;
exports.updateStatus = updateStatus;
exports.requestRefund = requestRefund;
exports.generateReceiptPdf = generateReceiptPdf;
const pdfkit_1 = __importDefault(require("pdfkit"));
const client_1 = require("@prisma/client");
const prisma_1 = require("../../prisma");
const app_error_1 = require("../../utils/app-error");
const sanitize_user_1 = require("../../utils/sanitize-user");
const cartService = __importStar(require("../cart/cart.service"));
const mailService = __importStar(require("../mail/mail.service"));
const BOOKING_INCLUDE = {
    items: { include: { package: { include: { destination: true } }, destination: true } },
    travelers: true,
    payment: true,
    refundRequests: true,
    user: true,
};
function assertBookingStatusTransition(current, next, payment) {
    if (current === client_1.BookingStatus.cancelled || current === client_1.BookingStatus.completed) {
        throw new app_error_1.BadRequestError(`Cannot change booking status from ${current}`);
    }
    if (next === client_1.BookingStatus.pending) {
        if (current === client_1.BookingStatus.confirmed && payment?.status === client_1.PaymentStatus.failed) {
            return;
        }
        throw new app_error_1.BadRequestError('Booking can only be set to pending when reverting from confirmed after a failed payment');
    }
    if (next === client_1.BookingStatus.confirmed) {
        if (current !== client_1.BookingStatus.pending) {
            throw new app_error_1.BadRequestError(`Cannot set status to confirmed from ${current}`);
        }
        if (!payment || payment.status !== client_1.PaymentStatus.succeeded) {
            throw new app_error_1.BadRequestError('Cannot confirm booking without a successful payment');
        }
        return;
    }
    if (next === client_1.BookingStatus.cancelled) {
        if (current !== client_1.BookingStatus.pending && current !== client_1.BookingStatus.confirmed) {
            throw new app_error_1.BadRequestError(`Cannot cancel booking from ${current}`);
        }
        return;
    }
    if (next === client_1.BookingStatus.completed) {
        if (current !== client_1.BookingStatus.confirmed) {
            throw new app_error_1.BadRequestError('Booking must be confirmed before it can be completed');
        }
        return;
    }
}
function generateReference() {
    const ts = Date.now().toString(36).toUpperCase();
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `STL-${ts}-${rand}`;
}
function validateTravelers(user, cartItems, dto) {
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
        throw new app_error_1.BadRequestError(`Traveler count exceeds package capacity (${totalCapacity})`);
    }
    const primaryCount = travelersInput.filter((traveler) => traveler.isPrimary).length;
    if (primaryCount > 1) {
        throw new app_error_1.BadRequestError('Only one traveler can be marked as primary');
    }
    const normalizedEmailSet = new Set();
    const travelers = travelersInput.map((traveler, index) => {
        const normalizedEmail = traveler.email?.trim().toLowerCase() ?? null;
        if (normalizedEmail) {
            if (normalizedEmailSet.has(normalizedEmail)) {
                throw new app_error_1.BadRequestError('Traveler emails must be unique');
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
async function createFromCart(user, dto) {
    const cart = await cartService.getOrCreateCart(user.id);
    if (!cart.items || cart.items.length === 0) {
        throw new app_error_1.NotFoundError('Your cart is empty');
    }
    const totalAmountNgn = cart.items.reduce((sum, item) => sum + Number(item.unitPriceNgn) * item.quantity, 0);
    const destinationImageUrl = cart.items.find((item) => item.package?.destination?.heroImageUrl)?.package?.destination?.heroImageUrl || null;
    const travelers = validateTravelers(user, cart.items, dto);
    const referenceNumber = generateReference();
    const booking = await prisma_1.prisma.booking.create({
        data: {
            userId: user.id,
            referenceNumber,
            status: client_1.BookingStatus.pending,
            totalAmountNgn,
            imageUrl: destinationImageUrl,
            travelers: { create: travelers },
        },
    });
    const bookingItemsData = cart.items.map((item) => {
        const snapshot = item.bundleSnapshot;
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
                ? {
                    ...snapshot,
                    savingsNgn,
                    savingsUsd: Math.max(0, snapshot.originalTotalUsd - snapshot.customizedTotalUsd),
                }
                : undefined,
            originalTotalNgn,
            customizedTotalNgn,
            savingsNgn,
        };
    });
    await prisma_1.prisma.bookingItem.createMany({ data: bookingItemsData });
    await cartService.clearCart(user.id);
    const fullBooking = await findOne(booking.id);
    await mailService.sendBookingInitiated(user, fullBooking);
    return fullBooking;
}
async function findMyBookings(userId) {
    return prisma_1.prisma.booking.findMany({
        where: { userId },
        include: BOOKING_INCLUDE,
        orderBy: { createdAt: 'desc' },
    });
}
async function findOne(id) {
    const booking = await prisma_1.prisma.booking.findUnique({ where: { id }, include: BOOKING_INCLUDE });
    if (!booking)
        throw new app_error_1.NotFoundError('Booking not found');
    return (0, sanitize_user_1.sanitizeBooking)(booking);
}
async function findOneForUser(id, userId, role) {
    const booking = await findOne(id);
    if (role !== client_1.UserRole.admin && booking.userId !== userId) {
        throw new app_error_1.ForbiddenError('You cannot access this booking');
    }
    return booking;
}
async function findAll(page = 1, limit = 20, status, filters) {
    const where = {};
    if (status)
        where.status = status;
    if (filters?.destinationId)
        where.items = { some: { destinationId: filters.destinationId } };
    if (filters?.userId)
        where.userId = filters.userId;
    if (filters?.from || filters?.to) {
        where.createdAt = {
            ...(filters.from ? { gte: new Date(filters.from) } : {}),
            ...(filters.to ? { lte: new Date(filters.to) } : {}),
        };
    }
    const [bookings, total] = await Promise.all([
        prisma_1.prisma.booking.findMany({
            where,
            include: BOOKING_INCLUDE,
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * limit,
            take: limit,
        }),
        prisma_1.prisma.booking.count({ where }),
    ]);
    return { bookings: bookings.map((b) => (0, sanitize_user_1.sanitizeBooking)(b)), total, page, limit };
}
async function updateStatus(id, status, _user) {
    const booking = await findOne(id);
    if (booking.status === status) {
        return booking;
    }
    const payment = await prisma_1.prisma.payment.findUnique({ where: { bookingId: id } });
    assertBookingStatusTransition(booking.status, status, payment);
    await prisma_1.prisma.booking.update({ where: { id }, data: { status } });
    const updated = await findOne(id);
    await mailService.sendBookingStatusUpdate(updated.user, updated);
    return updated;
}
async function requestRefund(id, user, reason) {
    const booking = await findOneForUser(id, user.id, user.role);
    if (booking.status !== client_1.BookingStatus.confirmed) {
        throw new app_error_1.BadRequestError('Only confirmed bookings can request refunds');
    }
    if (!booking.payment || booking.payment.status !== client_1.PaymentStatus.succeeded) {
        throw new app_error_1.BadRequestError('Only paid bookings can request refunds');
    }
    const existingOpen = await prisma_1.prisma.refundRequest.findFirst({
        where: { bookingId: id, status: client_1.RefundRequestStatus.pending },
    });
    if (existingOpen) {
        throw new app_error_1.BadRequestError('A refund request for this booking is already pending');
    }
    const refundRequest = await prisma_1.prisma.refundRequest.create({
        data: {
            bookingId: id,
            userId: user.id,
            reason: reason.trim(),
            requestedAmountNgn: booking.payment.amountNgn,
            status: client_1.RefundRequestStatus.pending,
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
async function generateReceiptPdf(id, user) {
    const booking = await findOneForUser(id, user.id, user.role);
    const doc = new pdfkit_1.default({ margin: 50, size: 'A4' });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    const done = new Promise((resolve) => {
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
    }
    else {
        travelers.forEach((traveler, index) => {
            const travelerLine = `${index + 1}. ${traveler.firstName} ${traveler.lastName}` +
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
//# sourceMappingURL=bookings.service.js.map