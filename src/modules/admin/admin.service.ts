import { PaymentStatus } from '@prisma/client';
import { prisma } from '../../prisma';
import { BadRequestError } from '../../utils/app-error';
import { sanitizeBooking } from '../../utils/sanitize-user';
import * as usersService from '../users/users.service';
import * as mailService from '../mail/mail.service';

export interface AdminSendEmailInput {
  toEmail?: string;
  userId?: string;
  broadcastToAll?: boolean;
  subject: string;
  htmlBody: string;
}

export async function getStats() {
  const totalBookings = await prisma.booking.count();
  const totalUsers = await usersService.countUsers();
  const succeeded = await prisma.payment.findMany({ where: { status: PaymentStatus.succeeded } });
  const revenueNgn = succeeded.reduce((sum, p) => sum + Number(p.amountNgn), 0);
  const recentBookings = await prisma.booking.findMany({
    include: { user: true, payment: true },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });
  return {
    totalBookings,
    totalUsers,
    revenueNgn,
    recentBookings: recentBookings.map((b) => sanitizeBooking(b)),
  };
}

export async function sendEmail(dto: AdminSendEmailInput) {
  if (dto.broadcastToAll) {
    const emails = await usersService.getVerifiedUserEmails();
    for (const email of emails) {
      await mailService.sendHtmlEmail(email, dto.subject, dto.htmlBody);
    }
    return { message: `Sent to ${emails.length} verified users.` };
  }
  let to: string | null = dto.toEmail || null;
  if (!to && dto.userId) {
    to = await usersService.findEmailById(dto.userId);
  }
  if (!to) throw new BadRequestError('Provide toEmail, userId, or broadcastToAll');
  await mailService.sendHtmlEmail(to, dto.subject, dto.htmlBody);
  return { message: 'Email sent successfully.' };
}
