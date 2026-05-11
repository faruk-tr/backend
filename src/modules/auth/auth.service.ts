import * as bcrypt from 'bcryptjs';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../middleware/errorHandler';
import { signToken } from '../../utils/jwt';
import { generateOtpCode, generateUserCode } from '../../utils/generateCodes';
import { config } from '../../config';
import type { LoginRequest, OtpRequest, ChangePasswordRequest } from './auth.schemas';

export interface PasswordStatus {
  isExpired: boolean;
  daysUntilExpiry: number | null;
  isWarning: boolean;
}

function getPasswordStatus(passwordExpiresAt: Date | null): PasswordStatus {
  const daysUntilExpiry = passwordExpiresAt
    ? Math.ceil((passwordExpiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  return {
    isExpired: passwordExpiresAt ? passwordExpiresAt < new Date() : false,
    daysUntilExpiry,
    isWarning: daysUntilExpiry !== null && daysUntilExpiry <= config.password.warningDays,
  };
}

async function getRecentFailedAttempts(userId: string): Promise<number> {
  const windowStart = new Date(Date.now() - config.auth.lockoutMinutes * 60 * 1000);
  return prisma.activityLog.count({
    where: {
      userId,
      action: 'login_failed',
      createdAt: { gte: windowStart },
    },
  });
}

async function getRecentOtpFailures(userId: string): Promise<number> {
  const windowStart = new Date(Date.now() - config.auth.lockoutMinutes * 60 * 1000);
  return prisma.activityLog.count({
    where: {
      userId,
      action: 'otp_failed',
      createdAt: { gte: windowStart },
    },
  });
}

export interface LoginResult {
  message: string;
  otpRequired: boolean;
  demoOtp?: string;
  passwordStatus: PasswordStatus;
}

export async function login(data: LoginRequest, ipAddress?: string): Promise<LoginResult> {
  const user = await prisma.user.findUnique({
    where: { email: data.email },
    include: { permissions: true },
  });

  if (!user || !user.active) {
    throw new AppError(401, 'E-posta veya şifre hatalı.', 'INVALID_CREDENTIALS');
  }

  // Check account lockout
  const failedAttempts = await getRecentFailedAttempts(user.id);
  if (failedAttempts >= config.auth.maxFailedLoginAttempts) {
    throw new AppError(
      429,
      `Çok fazla başarısız giriş denemesi. Lütfen ${config.auth.lockoutMinutes} dakika sonra tekrar deneyin.`,
      'ACCOUNT_LOCKED',
    );
  }

  const valid = await bcrypt.compare(data.password, user.password);
  if (!valid) {
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: 'login_failed',
        entityType: 'user',
        entityId: user.id,
        ipAddress,
      },
    });
    throw new AppError(401, 'E-posta veya şifre hatalı.', 'INVALID_CREDENTIALS');
  }

  // Generate OTP
  const otpCode = generateOtpCode();
  const expiresAt = new Date(Date.now() + config.otp.expiresMinutes * 60 * 1000);

  // Invalidate old OTPs
  await prisma.otpCode.updateMany({
    where: { userId: user.id, used: false },
    data: { used: true },
  });

  await prisma.otpCode.create({
    data: { userId: user.id, code: otpCode, expiresAt },
  });

  await prisma.activityLog.create({
    data: {
      userId: user.id,
      action: 'login_attempt',
      entityType: 'user',
      entityId: user.id,
      ipAddress,
    },
  });

  const passwordStatus = getPasswordStatus(user.passwordExpiresAt);

  return {
    message: 'OTP kodu gönderildi.',
    otpRequired: true,
    ...(config.otp.demoEnabled && { demoOtp: otpCode }),
    passwordStatus,
  };
}

export interface VerifyOtpResult {
  token: string;
  user: {
    id: string;
    userCode: string;
    name: string;
    email: string;
    role: string;
    phone: string | null;
    avatar: string | null;
    municipalityId: string | null;
    operatorId: string | null;
    permissions: string[];
    passwordStatus: PasswordStatus;
  };
}

export async function verifyOtp(data: OtpRequest, ipAddress?: string): Promise<VerifyOtpResult> {
  const user = await prisma.user.findUnique({
    where: { email: data.email },
    include: { permissions: true },
  });

  if (!user || !user.active) {
    throw new AppError(401, 'Geçersiz istek.', 'INVALID_REQUEST');
  }

  // Check OTP brute-force lockout
  const otpFailures = await getRecentOtpFailures(user.id);
  if (otpFailures >= config.auth.maxOtpAttempts) {
    await prisma.otpCode.updateMany({
      where: { userId: user.id, used: false },
      data: { used: true },
    });
    throw new AppError(
      429,
      `Çok fazla hatalı OTP denemesi. Lütfen ${config.auth.lockoutMinutes} dakika sonra tekrar giriş yapın.`,
      'OTP_LOCKED',
    );
  }

  const otp = await prisma.otpCode.findFirst({
    where: {
      userId: user.id,
      code: data.code,
      used: false,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!otp) {
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: 'otp_failed',
        entityType: 'user',
        entityId: user.id,
        ipAddress,
      },
    });
    throw new AppError(401, 'Geçersiz veya süresi dolmuş OTP kodu.', 'INVALID_OTP');
  }

  // Mark OTP as used
  await prisma.otpCode.update({ where: { id: otp.id }, data: { used: true } });

  const token = signToken({ userId: user.id, role: user.role });

  await prisma.activityLog.create({
    data: {
      userId: user.id,
      action: 'login_success',
      entityType: 'user',
      entityId: user.id,
      ipAddress,
    },
  });

  const passwordStatus = getPasswordStatus(user.passwordExpiresAt);

  return {
    token,
    user: {
      id: user.id,
      userCode: user.userCode,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      avatar: user.avatar,
      municipalityId: user.municipalityId,
      operatorId: user.operatorId,
      permissions: user.permissions.map((p) => p.permission),
      passwordStatus,
    },
  };
}

export async function changePassword(userId: string, data: ChangePasswordRequest) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError(404, 'Kullanıcı bulunamadı.', 'NOT_FOUND');

  const valid = await bcrypt.compare(data.currentPassword, user.password);
  if (!valid) {
    throw new AppError(401, 'Mevcut şifre hatalı.', 'INVALID_PASSWORD');
  }

  if (data.currentPassword === data.newPassword) {
    throw new AppError(400, 'Yeni şifre mevcut şifreyle aynı olamaz.', 'SAME_PASSWORD');
  }

  const hashed = await bcrypt.hash(data.newPassword, 12);
  const expiresAt = new Date(Date.now() + config.password.expiryDays * 24 * 60 * 60 * 1000);

  await prisma.user.update({
    where: { id: userId },
    data: {
      password: hashed,
      passwordChangedAt: new Date(),
      passwordExpiresAt: expiresAt,
    },
  });

  await prisma.activityLog.create({
    data: {
      userId,
      action: 'password_changed',
      entityType: 'user',
      entityId: userId,
    },
  });

  return { message: 'Şifre başarıyla değiştirildi.' };
}

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { permissions: true, menuPermissions: true },
  });

  if (!user) throw new AppError(404, 'Kullanıcı bulunamadı.', 'NOT_FOUND');

  const passwordStatus = getPasswordStatus(user.passwordExpiresAt);

  return {
    id: user.id,
    userCode: user.userCode,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone,
    avatar: user.avatar,
    municipalityId: user.municipalityId,
    operatorId: user.operatorId,
    permissions: user.permissions.map((p) => p.permission),
    menuPermissions: user.menuPermissions,
    passwordStatus,
  };
}

export async function logout(userId: string, ipAddress?: string) {
  await prisma.activityLog.create({
    data: {
      userId,
      action: 'logout',
      entityType: 'user',
      entityId: userId,
      ipAddress,
    },
  });
  return { message: 'Çıkış yapıldı.' };
}
