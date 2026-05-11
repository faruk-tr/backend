import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { signToken } from '../utils/jwt';
import { generateOtpCode, generateUserCode } from '../utils/generateCodes';
import { AppError } from '../middleware/errorHandler';
import { config } from '../config';
import { AuthRequest } from '../middleware/auth';

const loginSchema = z.object({
  email: z.string().email('Geçerli bir e-posta adresi girin.'),
  password: z.string().min(1, 'Şifre gerekli.'),
});

const otpSchema = z.object({
  email: z.string().email(),
  code: z.string().length(6, 'OTP kodu 6 haneli olmalı.'),
});

/** Password complexity: min 8 chars, at least one upper, one lower, one digit, one special char */
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~])/;

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z
    .string()
    .min(config.password.minLength, `Şifre en az ${config.password.minLength} karakter olmalı.`)
    .regex(
      passwordRegex,
      'Şifre en az bir büyük harf, bir küçük harf, bir rakam ve bir özel karakter içermelidir.',
    ),
});

/**
 * Counts recent failed login attempts for a user within the lockout window.
 * Used to enforce account lockout after too many failures.
 */
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

/**
 * Counts recent failed OTP verification attempts for a user.
 */
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

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email },
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

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      // Log the failed attempt for lockout tracking
      await prisma.activityLog.create({
        data: {
          userId: user.id,
          action: 'login_failed',
          entityType: 'user',
          entityId: user.id,
          ipAddress: req.ip,
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

    // Activity log
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: 'login_attempt',
        entityType: 'user',
        entityId: user.id,
        ipAddress: req.ip,
      },
    });

    const passwordExpiresAt = user.passwordExpiresAt;
    const daysUntilExpiry = passwordExpiresAt
      ? Math.ceil((passwordExpiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : null;

    res.json({
      message: 'OTP kodu gönderildi.',
      otpRequired: true,
      // In demo mode only, return the OTP directly (blocked in production via config)
      ...(config.otp.demoEnabled && { demoOtp: otpCode }),
      passwordStatus: {
        isExpired: passwordExpiresAt ? passwordExpiresAt < new Date() : false,
        daysUntilExpiry,
        isWarning: daysUntilExpiry !== null && daysUntilExpiry <= config.password.warningDays,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function verifyOtp(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, code } = otpSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email },
      include: { permissions: true },
    });

    if (!user || !user.active) {
      throw new AppError(401, 'Geçersiz istek.', 'INVALID_REQUEST');
    }

    // Check OTP brute-force lockout
    const otpFailures = await getRecentOtpFailures(user.id);
    if (otpFailures >= config.auth.maxOtpAttempts) {
      // Invalidate all pending OTPs to force re-authentication
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
        code,
        used: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otp) {
      // Log the failed OTP attempt
      await prisma.activityLog.create({
        data: {
          userId: user.id,
          action: 'otp_failed',
          entityType: 'user',
          entityId: user.id,
          ipAddress: req.ip,
        },
      });
      throw new AppError(401, 'Geçersiz veya süresi dolmuş OTP kodu.', 'INVALID_OTP');
    }

    // Mark OTP as used
    await prisma.otpCode.update({ where: { id: otp.id }, data: { used: true } });

    const token = signToken({ userId: user.id, role: user.role });

    // Activity log
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: 'login_success',
        entityType: 'user',
        entityId: user.id,
        ipAddress: req.ip,
      },
    });

    const passwordExpiresAt = user.passwordExpiresAt;
    const daysUntilExpiry = passwordExpiresAt
      ? Math.ceil((passwordExpiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : null;

    res.json({
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
        passwordStatus: {
          isExpired: passwordExpiresAt ? passwordExpiresAt < new Date() : false,
          daysUntilExpiry,
          isWarning: daysUntilExpiry !== null && daysUntilExpiry <= config.password.warningDays,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function changePassword(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) throw new AppError(404, 'Kullanıcı bulunamadı.', 'NOT_FOUND');

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) {
      throw new AppError(401, 'Mevcut şifre hatalı.', 'INVALID_PASSWORD');
    }

    if (currentPassword === newPassword) {
      throw new AppError(400, 'Yeni şifre mevcut şifreyle aynı olamaz.', 'SAME_PASSWORD');
    }

    const hashed = await bcrypt.hash(newPassword, 12);
    const expiresAt = new Date(Date.now() + config.password.expiryDays * 24 * 60 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashed,
        passwordChangedAt: new Date(),
        passwordExpiresAt: expiresAt,
      },
    });

    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: 'password_changed',
        entityType: 'user',
        entityId: user.id,
      },
    });

    res.json({ message: 'Şifre başarıyla değiştirildi.' });
  } catch (err) {
    next(err);
  }
}

export async function getMe(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: { permissions: true, menuPermissions: true },
    });

    if (!user) throw new AppError(404, 'Kullanıcı bulunamadı.', 'NOT_FOUND');

    const passwordExpiresAt = user.passwordExpiresAt;
    const daysUntilExpiry = passwordExpiresAt
      ? Math.ceil((passwordExpiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : null;

    res.json({
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
      passwordStatus: {
        isExpired: passwordExpiresAt ? passwordExpiresAt < new Date() : false,
        daysUntilExpiry,
        isWarning: daysUntilExpiry !== null && daysUntilExpiry <= config.password.warningDays,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function logout(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await prisma.activityLog.create({
      data: {
        userId: req.user!.id,
        action: 'logout',
        entityType: 'user',
        entityId: req.user!.id,
        ipAddress: req.ip,
      },
    });
    res.json({ message: 'Çıkış yapıldı.' });
  } catch (err) {
    next(err);
  }
}
