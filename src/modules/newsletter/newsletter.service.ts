import { prisma } from '../../prisma';

export async function subscribe(dto: { email: string }) {
  const email = dto.email.toLowerCase().trim();
  const existing = await prisma.newsletterSubscriber.findUnique({ where: { email } });
  if (existing) {
    return { message: 'You are already subscribed.' };
  }
  await prisma.newsletterSubscriber.create({ data: { email } });
  return { message: 'Thanks for subscribing!' };
}
