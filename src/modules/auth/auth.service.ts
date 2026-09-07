import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import type { User } from '@prisma/client';
import type { Response } from 'express';
import { prisma } from '../../prisma';
import { env } from '../../config/env';
import { toPublicUser } from '../../utils/sanitize-user';
import * as mailService from '../mail/mail.service';
import { ConflictError, NotFoundError, UnauthorizedError, BadRequestError } from '../../utils/app-error';
import { z } from 'zod';
import { registerSchema } from './schemas';

type RegisterInput = z.infer<typeof registerSchema>;
type LoginInput = { email: string; password: string };

async function generateTokens(user: User) {
  const payload = { sub: user.id, email: user.email, role: user.role };

  const [accessToken, refreshToken] = await Promise.all([
    new Promise<string>((resolve, reject) => {
      jwt.sign(
        payload,
        env.JWT_ACCESS_SECRET,
        { expiresIn: env.JWT_ACCESS_EXPIRES_IN } as jwt.SignOptions,
        (err, token) => (err || !token ? reject(err) : resolve(token)),
      );
    }),
    new Promise<string>((resolve, reject) => {
      jwt.sign(
        payload,
        env.JWT_REFRESH_SECRET,
        { expiresIn: env.JWT_REFRESH_EXPIRES_IN } as jwt.SignOptions,
        (err, token) => (err || !token ? reject(err) : resolve(token)),
      );
    }),
  ]);

  return { accessToken, refreshToken };
}

async function storeRefreshToken(userId: string, token: string) {
  const hash = await bcrypt.hash(token, 10);
  await prisma.user.update({ where: { id: userId }, data: { refreshTokenHash: hash } });
}

function setRefreshCookie(res: Response, token: string) {
  res.cookie('refresh_token', token, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
}

export async function register(dto: RegisterInput) {
  const existing = await prisma.user.findUnique({ where: { email: dto.email } });
  if (existing) throw new ConflictError('Email already registered');

  const passwordHash = await bcrypt.hash(dto.password, 12);
  const verificationToken = uuidv4();
  const { password: _pw, ...rest } = dto;

  const user = await prisma.user.create({
    data: { ...rest, passwordHash, verificationToken },
  });

  await mailService.sendVerificationEmail(user, verificationToken);
  await mailService.sendWelcome(user);

  return { message: 'Registration successful. Please check your email to verify your account.' };
}

export async function login(dto: LoginInput, res: Response) {
  const user = await prisma.user.findUnique({ where: { email: dto.email } });
  if (!user) throw new UnauthorizedError('Invalid credentials');

  const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
  if (!isMatch) throw new UnauthorizedError('Invalid credentials');

  if (!user.isVerified) throw new UnauthorizedError('Please verify your email first');
  if (!user.isActive) throw new UnauthorizedError('Account is deactivated');

  const tokens = await generateTokens(user);
  await storeRefreshToken(user.id, tokens.refreshToken);
  setRefreshCookie(res, tokens.refreshToken);

  return { accessToken: tokens.accessToken, user: toPublicUser(user) };
}

export async function refresh(user: User, res: Response) {
  const tokens = await generateTokens(user);
  await storeRefreshToken(user.id, tokens.refreshToken);
  setRefreshCookie(res, tokens.refreshToken);
  return { accessToken: tokens.accessToken };
}

export async function logout(user: User, res: Response) {
  await prisma.user.update({ where: { id: user.id }, data: { refreshTokenHash: null } });
  res.clearCookie('refresh_token');
  return { message: 'Logged out successfully' };
}

export async function verifyEmail(token: string) {
  const user = await prisma.user.findFirst({ where: { verificationToken: token } });
  if (!user) throw new NotFoundError('Invalid or expired verification token');

  await prisma.user.update({
    where: { id: user.id },
    data: { isVerified: true, verificationToken: null },
  });

  return { message: 'Email verified successfully. You can now log in.' };
}

export async function forgotPassword(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  // Always return success to avoid user enumeration
  if (!user) return { message: 'If that email exists, a reset link has been sent.' };

  const token = uuidv4();
  const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await prisma.user.update({
    where: { id: user.id },
    data: { resetPasswordToken: token, resetPasswordExpires: expires },
  });

  await mailService.sendPasswordReset(user, token);
  return { message: 'If that email exists, a reset link has been sent.' };
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundError('User not found');
  const match = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!match) throw new UnauthorizedError('Current password is incorrect');
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await bcrypt.hash(newPassword, 12) },
  });
  return { message: 'Password updated successfully.' };
}

export async function resetPassword(token: string, newPassword: string) {
  const user = await prisma.user.findFirst({ where: { resetPasswordToken: token } });
  if (!user) throw new BadRequestError('Invalid or expired reset token');

  if (!user.resetPasswordExpires || user.resetPasswordExpires < new Date()) {
    throw new BadRequestError('Reset token has expired. Please request a new one.');
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, resetPasswordToken: null, resetPasswordExpires: null },
  });

  return { message: 'Password reset successfully. You can now log in.' };
}
