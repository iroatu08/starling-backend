import { Resend } from 'resend';
import PDFDocument from 'pdfkit';
import type { User, Payment, BookingTraveler, ContactSubmission } from '@prisma/client';
import { env } from '../../config/env';
import { renderTemplate } from './template-renderer';
import { buildDestinationGroupsForEmail, buildDestinationsSummary, BookingItemWithRelations } from './booking-email-groups.util';

const resend = new Resend(env.RESEND_API_KEY);
const mailFrom = env.MAIL_FROM;

interface MailAttachment {
  filename: string;
  content: Buffer;
}

/** Booking shape needed by the mail functions below (varies per call site's Prisma `include`). */
export interface BookingForMail {
  id: string;
  referenceNumber: string;
  status: string;
  totalAmountNgn: unknown;
  createdAt: Date;
  items?: BookingItemWithRelations[];
  travelers?: BookingTraveler[];
}

async function sendWithResend(to: string, subject: string, html: string, attachments?: MailAttachment[]): Promise<void> {
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

async function sendTemplate(
  to: string,
  subject: string,
  templateRef: string,
  context: Record<string, unknown>,
  attachments?: MailAttachment[],
): Promise<void> {
  const html = await renderTemplate(templateRef, context);
  await sendWithResend(to, subject, html, attachments);
}

async function buildOwnerReceiptPdf(user: User, booking: BookingForMail, payment: Payment): Promise<Buffer> {
  const doc = new PDFDocument({ margin: 42, size: 'A4' });
  const chunks: Buffer[] = [];
  doc.on('data', (chunk) => chunks.push(chunk as Buffer));
  const done = new Promise<Buffer>((resolve) => doc.on('end', () => resolve(Buffer.concat(chunks))));

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
    doc.fontSize(10).text(
      `${index + 1}. ${traveler.firstName} ${traveler.lastName} (${traveler.email || 'No email'})`,
    );
  });
  doc.moveDown(0.8);
  doc.fontSize(12).text('Items', { underline: true });
  const pdfGroups = buildDestinationGroupsForEmail(booking.items ?? []);
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

export async function sendWelcome(user: User): Promise<void> {
  try {
    await sendTemplate(user.email, 'Welcome to Starlings Hospitality!', 'welcome', { firstName: user.firstName });
  } catch (error) {
    console.error(`Failed to send welcome email to ${user.email}`, error);
  }
}

export async function sendVerificationEmail(user: User, token: string): Promise<void> {
  try {
    await sendTemplate(user.email, 'Verify your Starlings account', 'verify-email', {
      firstName: user.firstName,
      verifyUrl: `${env.FRONTEND_URL}/verify?token=${token}`,
    });
  } catch (error) {
    console.error(`Failed to send verification email to ${user.email}`, error);
  }
}

export async function sendBookingInitiated(user: User, booking: BookingForMail): Promise<void> {
  try {
    await sendTemplate(user.email, `Booking created — Ref #${booking.referenceNumber}`, 'booking-status', {
      firstName: user.firstName,
      referenceNumber: booking.referenceNumber,
      status: 'pending_payment',
    });
  } catch (error) {
    console.error(`Failed to send booking initiated email to ${user.email}`, error);
  }
}

export async function sendOwnerPostPaymentSummary(user: User, booking: BookingForMail, payment: Payment): Promise<void> {
  try {
    const travelers = booking.travelers ?? [];
    const destinationGroups = buildDestinationGroupsForEmail(booking.items ?? []);
    const context: Record<string, unknown> = {
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
      destinationsSummary: buildDestinationsSummary(destinationGroups),
      totalAmountNgn: Number(booking.totalAmountNgn),
    };

    let pdfAttachment: Buffer | null = null;
    try {
      pdfAttachment = await buildOwnerReceiptPdf(user, booking, payment);
    } catch (pdfErr) {
      const err = pdfErr as Error;
      console.warn(`Receipt PDF failed for ${booking.referenceNumber}; sending owner email without attachment: ${err.message}`);
    }

    const attachments: MailAttachment[] = pdfAttachment
      ? [{ filename: `receipt-${booking.referenceNumber}.pdf`, content: pdfAttachment }]
      : [];

    await sendTemplate(
      user.email,
      `Payment confirmed — Ref #${booking.referenceNumber}`,
      'booking-owner-paid',
      context,
      attachments.length > 0 ? attachments : undefined,
    );
  } catch (error) {
    console.error(`Failed to send owner payment summary to ${user.email}`, error);
  }
}

export async function sendTravelerNotifications(booking: BookingForMail, payment: Payment, ownerEmail: string): Promise<void> {
  const travelers = booking.travelers ?? [];
  const destinationGroups = buildDestinationGroupsForEmail(booking.items ?? []);
  const destinationsSummary = buildDestinationsSummary(destinationGroups);
  for (const traveler of travelers) {
    const to = traveler.email?.trim().toLowerCase();
    if (!to || to === ownerEmail.trim().toLowerCase()) continue;
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
    } catch (error) {
      console.error(`Failed to send traveler notice to ${to}`, error);
    }
  }
}

export async function sendPasswordReset(user: User, token: string): Promise<void> {
  try {
    await sendTemplate(user.email, 'Reset your Starlings password', 'password-reset', {
      firstName: user.firstName,
      resetUrl: `${env.FRONTEND_URL}/reset-password?token=${token}`,
      expiresIn: '1 hour',
    });
  } catch (error) {
    console.error(`Failed to send password reset to ${user.email}`, error);
  }
}

export async function sendBookingStatusUpdate(user: User, booking: BookingForMail): Promise<void> {
  try {
    await sendTemplate(user.email, `Booking Update — Ref #${booking.referenceNumber}`, 'booking-status', {
      firstName: user.firstName,
      referenceNumber: booking.referenceNumber,
      status: booking.status,
    });
  } catch (error) {
    console.error(`Failed to send booking status update to ${user.email}`, error);
  }
}

export async function sendContactAutoReply(submission: ContactSubmission): Promise<void> {
  try {
    await sendTemplate(submission.email, 'We received your message — Starlings Hospitality', 'contact-received', {
      name: submission.name,
    });
  } catch (error) {
    console.error(`Failed to send contact auto-reply to ${submission.email}`, error);
  }
}

export async function sendHtmlEmail(to: string, subject: string, html: string): Promise<void> {
  try {
    await sendWithResend(to, subject, html);
  } catch (error) {
    console.error(`Failed to send HTML email to ${to}`, error);
    throw error;
  }
}

export async function sendAdminAlert(type: string, payload: Record<string, unknown>): Promise<void> {
  try {
    await sendTemplate(env.ADMIN_EMAIL, `[Starlings Admin] ${type}`, 'admin-alert', {
      type,
      payload: JSON.stringify(payload, null, 2),
    });
  } catch (error) {
    console.error(`Failed to send admin alert: ${type}`, error);
  }
}
