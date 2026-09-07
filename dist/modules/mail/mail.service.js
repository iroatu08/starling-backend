"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendWelcome = sendWelcome;
exports.sendVerificationEmail = sendVerificationEmail;
exports.sendBookingInitiated = sendBookingInitiated;
exports.sendOwnerPostPaymentSummary = sendOwnerPostPaymentSummary;
exports.sendTravelerNotifications = sendTravelerNotifications;
exports.sendPasswordReset = sendPasswordReset;
exports.sendBookingStatusUpdate = sendBookingStatusUpdate;
exports.sendContactAutoReply = sendContactAutoReply;
exports.sendHtmlEmail = sendHtmlEmail;
exports.sendAdminAlert = sendAdminAlert;
const resend_1 = require("resend");
const pdfkit_1 = __importDefault(require("pdfkit"));
const env_1 = require("../../config/env");
const template_renderer_1 = require("./template-renderer");
const booking_email_groups_util_1 = require("./booking-email-groups.util");
const resend = new resend_1.Resend(env_1.env.RESEND_API_KEY);
const mailFrom = env_1.env.MAIL_FROM;
async function sendWithResend(to, subject, html, attachments) {
    const { error } = await resend.emails.send({
        from: mailFrom,
        to,
        subject,
        html,
        attachments: attachments?.map((attachment) => ({
            filename: attachment.filename,
            content: attachment.content,
        })),
    });
    if (error) {
        throw new Error(error.message);
    }
}
async function sendTemplate(to, subject, templateRef, context, attachments) {
    const html = await (0, template_renderer_1.renderTemplate)(templateRef, context);
    await sendWithResend(to, subject, html, attachments);
}
async function buildOwnerReceiptPdf(user, booking, payment) {
    const doc = new pdfkit_1.default({ margin: 42, size: 'A4' });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    const done = new Promise((resolve) => doc.on('end', () => resolve(Buffer.concat(chunks))));
    doc.fontSize(20).text('Starlings Hospitality');
    doc.moveDown(0.5);
    doc.fontSize(14).text('Payment confirmation receipt');
    doc.moveDown(0.8);
    doc.fontSize(11).text(`Owner: ${user.firstName} ${user.lastName}`);
    doc.text(`Owner email: ${user.email}`);
    doc.text(`Booking reference: ${booking.referenceNumber}`);
    doc.text(`Payment reference: ${payment.paystackReference}`);
    doc.text(`Paid at: ${payment.paidAt}`);
    doc.moveDown(0.8);
    doc.fontSize(12).text('Travelers', { underline: true });
    (booking.travelers ?? []).forEach((traveler, index) => {
        doc.fontSize(10).text(`${index + 1}. ${traveler.firstName} ${traveler.lastName} (${traveler.email || 'No email'})`);
    });
    doc.moveDown(0.8);
    doc.fontSize(12).text('Items', { underline: true });
    const pdfGroups = (0, booking_email_groups_util_1.buildDestinationGroupsForEmail)(booking.items ?? []);
    pdfGroups.forEach((group, groupIndex) => {
        doc.moveDown(0.4);
        doc.fontSize(11).text(`${groupIndex + 1}. ${group.destinationName}${group.country ? ` · ${group.country}` : ''}`);
        doc.fontSize(10);
        group.lines.forEach((line, lineIndex) => {
            doc.text(`   ${lineIndex + 1}. ${line.title} ×${line.quantity} — NGN ${line.lineTotalNgn}`);
        });
        doc.fontSize(9).text(`   Subtotal: NGN ${group.subtotalNgn}`);
    });
    doc.moveDown(0.8);
    doc.fontSize(12).text(`Total paid: NGN ${booking.totalAmountNgn}`);
    doc.end();
    return done;
}
async function sendWelcome(user) {
    try {
        await sendTemplate(user.email, 'Welcome to Starlings Hospitality!', 'welcome', { firstName: user.firstName });
    }
    catch (error) {
        console.error(`Failed to send welcome email to ${user.email}`, error);
    }
}
async function sendVerificationEmail(user, token) {
    try {
        await sendTemplate(user.email, 'Verify your Starlings account', 'verify-email', {
            firstName: user.firstName,
            verifyUrl: `${env_1.env.FRONTEND_URL}/verify?token=${token}`,
        });
    }
    catch (error) {
        console.error(`Failed to send verification email to ${user.email}`, error);
    }
}
async function sendBookingInitiated(user, booking) {
    try {
        await sendTemplate(user.email, `Booking created — Ref #${booking.referenceNumber}`, 'booking-status', {
            firstName: user.firstName,
            referenceNumber: booking.referenceNumber,
            status: 'pending_payment',
        });
    }
    catch (error) {
        console.error(`Failed to send booking initiated email to ${user.email}`, error);
    }
}
async function sendOwnerPostPaymentSummary(user, booking, payment) {
    try {
        const travelers = booking.travelers ?? [];
        const destinationGroups = (0, booking_email_groups_util_1.buildDestinationGroupsForEmail)(booking.items ?? []);
        const context = {
            ownerFirstName: user.firstName,
            ownerLastName: user.lastName,
            ownerEmail: user.email,
            ownerPhone: user.phone ?? '',
            bookingReference: booking.referenceNumber,
            paystackReference: payment.paystackReference,
            paidAt: payment.paidAt,
            amountNgn: Number(payment.amountNgn),
            bookingCreatedAt: booking.createdAt,
            travelers: travelers.map((traveler) => ({
                firstName: traveler.firstName,
                lastName: traveler.lastName,
                email: traveler.email || '—',
                phone: traveler.phone || '—',
                isPrimary: traveler.isPrimary,
            })),
            items: booking.items ?? [],
            destinationGroups,
            destinationsSummary: (0, booking_email_groups_util_1.buildDestinationsSummary)(destinationGroups),
            totalAmountNgn: Number(booking.totalAmountNgn),
        };
        let pdfAttachment = null;
        try {
            pdfAttachment = await buildOwnerReceiptPdf(user, booking, payment);
        }
        catch (pdfErr) {
            const err = pdfErr;
            console.warn(`Receipt PDF failed for ${booking.referenceNumber}; sending owner email without attachment: ${err.message}`);
        }
        const attachments = pdfAttachment
            ? [{ filename: `receipt-${booking.referenceNumber}.pdf`, content: pdfAttachment }]
            : [];
        await sendTemplate(user.email, `Payment confirmed — Ref #${booking.referenceNumber}`, 'booking-owner-paid', context, attachments.length > 0 ? attachments : undefined);
    }
    catch (error) {
        console.error(`Failed to send owner payment summary to ${user.email}`, error);
    }
}
async function sendTravelerNotifications(booking, payment, ownerEmail) {
    const travelers = booking.travelers ?? [];
    const destinationGroups = (0, booking_email_groups_util_1.buildDestinationGroupsForEmail)(booking.items ?? []);
    const destinationsSummary = (0, booking_email_groups_util_1.buildDestinationsSummary)(destinationGroups);
    for (const traveler of travelers) {
        const to = traveler.email?.trim().toLowerCase();
        if (!to || to === ownerEmail.trim().toLowerCase())
            continue;
        try {
            await sendTemplate(to, `Your Starlings booking details — Ref #${booking.referenceNumber}`, 'traveler-booking-notice', {
                firstName: traveler.firstName,
                lastName: traveler.lastName,
                bookingReference: booking.referenceNumber,
                paystackReference: payment.paystackReference,
                paidAt: payment.paidAt,
                totalAmountNgn: Number(booking.totalAmountNgn),
                itemCount: booking.items?.length ?? 0,
                destinationsSummary,
                isPrimary: traveler.isPrimary,
            });
        }
        catch (error) {
            console.error(`Failed to send traveler notice to ${to}`, error);
        }
    }
}
async function sendPasswordReset(user, token) {
    try {
        await sendTemplate(user.email, 'Reset your Starlings password', 'password-reset', {
            firstName: user.firstName,
            resetUrl: `${env_1.env.FRONTEND_URL}/reset-password?token=${token}`,
            expiresIn: '1 hour',
        });
    }
    catch (error) {
        console.error(`Failed to send password reset to ${user.email}`, error);
    }
}
async function sendBookingStatusUpdate(user, booking) {
    try {
        await sendTemplate(user.email, `Booking Update — Ref #${booking.referenceNumber}`, 'booking-status', {
            firstName: user.firstName,
            referenceNumber: booking.referenceNumber,
            status: booking.status,
        });
    }
    catch (error) {
        console.error(`Failed to send booking status update to ${user.email}`, error);
    }
}
async function sendContactAutoReply(submission) {
    try {
        await sendTemplate(submission.email, 'We received your message — Starlings Hospitality', 'contact-received', {
            name: submission.name,
        });
    }
    catch (error) {
        console.error(`Failed to send contact auto-reply to ${submission.email}`, error);
    }
}
async function sendHtmlEmail(to, subject, html) {
    try {
        await sendWithResend(to, subject, html);
    }
    catch (error) {
        console.error(`Failed to send HTML email to ${to}`, error);
        throw error;
    }
}
async function sendAdminAlert(type, payload) {
    try {
        await sendTemplate(env_1.env.ADMIN_EMAIL, `[Starlings Admin] ${type}`, 'admin-alert', {
            type,
            payload: JSON.stringify(payload, null, 2),
        });
    }
    catch (error) {
        console.error(`Failed to send admin alert: ${type}`, error);
    }
}
//# sourceMappingURL=mail.service.js.map