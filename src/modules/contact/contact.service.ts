import { prisma } from '../../prisma';
import * as mailService from '../mail/mail.service';

export async function submit(dto: { name: string; email: string; subject?: string; message: string; budget?: string }) {
  const submission = await prisma.contactSubmission.create({ data: dto });

  await mailService.sendContactAutoReply(submission);
  await mailService.sendAdminAlert('New Contact Submission', {
    name: dto.name,
    email: dto.email,
    subject: dto.subject,
    message: dto.message,
    budget: dto.budget,
  });

  return { message: 'Thank you for your message. We will be in touch shortly.' };
}

export async function findAll(page = 1, limit = 20) {
  const [submissions, total] = await Promise.all([
    prisma.contactSubmission.findMany({
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.contactSubmission.count(),
  ]);
  return { submissions, total, page, limit };
}

export async function markRead(id: string) {
  await prisma.contactSubmission.update({ where: { id }, data: { isRead: true } });
  return { message: 'Marked as read' };
}
