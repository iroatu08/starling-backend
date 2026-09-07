"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toPublicUser = toPublicUser;
exports.sanitizeBooking = sanitizeBooking;
exports.sanitizePayment = sanitizePayment;
function toPublicUser(user) {
    const { passwordHash: _ph, refreshTokenHash: _rt, verificationToken: _vt, resetPasswordToken: _rpt, resetPasswordExpires: _rpe, ...rest } = user;
    return rest;
}
function sanitizeBooking(booking) {
    if (!booking?.user)
        return booking;
    return { ...booking, user: toPublicUser(booking.user) };
}
function sanitizePayment(payment) {
    if (!payment?.booking)
        return payment;
    return { ...payment, booking: sanitizeBooking(payment.booking) };
}
//# sourceMappingURL=sanitize-user.js.map