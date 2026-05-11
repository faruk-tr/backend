import { Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import { getPaginationParams, paginate } from '../utils/pagination';
import { generateUserCode } from '../utils/generateCodes';
import { config } from '../config';
import { Prisma } from '@prisma/client';

/** Password complexity: min 8 chars, at least one upper, one lower, one digit, one special char */
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~])/;

const strongPasswordSchema = z
  .string()
  .min(config.password.minLength, `Şifre en az ${config.password.minLength} karakter olmalı.`)
  .regex(
    passwordRegex,
    'Şifre en az bir büyük harf, bir küçük harf, bir rakam ve bir özel karakter içermelidir.',
  );

const createUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: strongPasswordSchema,
  role: z.enum(['admin', 'municipality', 'operator', 'technician', 'viewer']),
  phone: z.string().optional(),
  municipalityId: z.string().optional(),
  operatorId: z.string().optional(),
  permissions: z.array(z.string()).optional(),
});

const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().optional().nullable(),
  role: z.enum(['admin', 'municipality', 'operator', 'technician', 'viewer']).optional(),
  active: z.boolean().optional(),
  municipalityId: z.string().optional().nullable(),
  operatorId: z.string().optional().nullable(),
});

const getUsersQuerySchema = z.object({
  search: z.string().optional(),
  role: z.enum(['admin', 'municipality', 'operator', 'technician', 'viewer']).optional(),
  active: z.enum(['true', 'false']).optional(),
});

export async function getUsers(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { page, limit } = getPaginationParams(req.query);
    
    const parsed = getUsersQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid query parameters' });
    }
    const { search, role, active } = parsed.data;

    const where: Prisma.UserWhereInput = {};
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { userCode: { contains: search } },
      ];
    }
    if (role) where.role = role;
    if (active !== undefined) where.active = active === 'true';

    // Municipality users can only see their own municipality
    if (req.user!.role === 'municipality' && req.user!.municipalityId) {
      where.municipalityId = req.user!.municipalityId;
    }

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          municipality: { select: { id: true, name: true } },
          operator: { select: { id: true, name: true } },
          permissions: true,
        },
      }),
    ]);

    const data = users.map((u) => ({
      id: u.id,
      userCode: u.userCode,
      name: u.name,
      email: u.email,
      role: u.role,
      phone: u.phone,
      active: u.active,
      municipality: u.municipality,
      operator: u.operator,
      permissions: u.permissions.map((p) => p.permission),
      passwordExpiresAt: u.passwordExpiresAt,
      createdAt: u.createdAt,
    }));

    res.json(paginate(data, total, { page, limit }));
  } catch (err) {
    next(err);
  }
}

export async function getUserById(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id as string },
      include: {
        municipality: true,
        operator: true,
        permissions: true,
        menuPermissions: true,
      },
    });

    if (!user) throw new AppError(404, 'Kullanıcı bulunamadı.', 'NOT_FOUND');

    res.json({
      id: user.id,
      userCode: user.userCode,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      active: user.active,
      municipality: user.municipality,
      operator: user.operator,
      permissions: user.permissions.map((p) => p.permission),
      menuPermissions: user.menuPermissions,
      passwordExpiresAt: user.passwordExpiresAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  } catch (err) {
    next(err);
  }
}

export async function createUser(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = createUserSchema.parse(req.body);

    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) throw new AppError(409, 'Bu e-posta adresi zaten kayıtlı.', 'EMAIL_EXISTS');

    const userCode = await generateUserCode();
    const hashed = await bcrypt.hash(data.password, 12);
    const passwordExpiresAt = new Date(Date.now() + config.password.expiryDays * 24 * 60 * 60 * 1000);

    const user = await prisma.user.create({
      data: {
        userCode,
        name: data.name,
        email: data.email,
        password: hashed,
        role: data.role,
        phone: data.phone,
        municipalityId: data.municipalityId,
        operatorId: data.operatorId,
        passwordChangedAt: new Date(),
        passwordExpiresAt,
        permissions: data.permissions
          ? { create: data.permissions.map((p) => ({ permission: p })) }
          : undefined,
      },
      include: { permissions: true },
    });

    await prisma.activityLog.create({
      data: {
        userId: req.user!.id,
        action: 'create_user',
        entityType: 'user',
        entityId: user.id,
        details: `Kullanıcı oluşturuldu: ${user.email}`,
      },
    });

    res.status(201).json({
      id: user.id,
      userCode: user.userCode,
      name: user.name,
      email: user.email,
      role: user.role,
      permissions: user.permissions.map((p) => p.permission),
    });
  } catch (err) {
    next(err);
  }
}

export async function updateUser(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = updateUserSchema.parse(req.body);

    const user = await prisma.user.update({
      where: { id: req.params.id as string },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.role && { role: data.role }),
        ...(data.active !== undefined && { active: data.active }),
        ...(data.municipalityId !== undefined && { municipalityId: data.municipalityId }),
        ...(data.operatorId !== undefined && { operatorId: data.operatorId }),
      },
    });

    await prisma.activityLog.create({
      data: {
        userId: req.user!.id,
        action: 'update_user',
        entityType: 'user',
        entityId: user.id,
      },
    });

    res.json({ message: 'Kullanıcı güncellendi.', id: user.id });
  } catch (err) {
    next(err);
  }
}

export async function deleteUser(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (req.params.id === req.user!.id) {
      throw new AppError(400, 'Kendi hesabınızı silemezsiniz.', 'CANNOT_DELETE_SELF');
    }

    await prisma.user.delete({ where: { id: req.params.id as string } });

    await prisma.activityLog.create({
      data: {
        userId: req.user!.id,
        action: 'delete_user',
        entityType: 'user',
        entityId: req.params.id as string,
      },
    });

    res.json({ message: 'Kullanıcı silindi.' });
  } catch (err) {
    next(err);
  }
}

export async function getUserPermissions(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const permissions = await prisma.userPermission.findMany({
      where: { userId: req.params.id as string },
    });
    res.json(permissions.map((p) => p.permission));
  } catch (err) {
    next(err);
  }
}

export async function updateUserPermissions(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { permissions } = z.object({ permissions: z.array(z.string()) }).parse(req.body);
    const userId = req.params.id as string;

    await prisma.$transaction([
      prisma.userPermission.deleteMany({ where: { userId } }),
      prisma.userPermission.createMany({
        data: permissions.map((p) => ({ userId, permission: p })),
      }),
    ]);

    res.json({ message: 'İzinler güncellendi.' });
  } catch (err) {
    next(err);
  }
}

export async function getUserMenuPermissions(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const perms = await prisma.userMenuPermission.findMany({
      where: { userId: req.params.id as string },
    });
    res.json(perms);
  } catch (err) {
    next(err);
  }
}

export async function updateUserMenuPermissions(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { menuPermissions } = z
      .object({
        menuPermissions: z.array(
          z.object({ menuKey: z.string(), enabled: z.boolean() }),
        ),
      })
      .parse(req.body);
    const userId = req.params.id as string;

    await prisma.$transaction([
      prisma.userMenuPermission.deleteMany({ where: { userId } }),
      prisma.userMenuPermission.createMany({
        data: menuPermissions.map((m) => ({
          userId,
          menuKey: m.menuKey,
          enabled: m.enabled,
        })),
      }),
    ]);

    res.json({ message: 'Menü izinleri güncellendi.' });
  } catch (err) {
    next(err);
  }
}

export async function resetUserPassword(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { newPassword } = z.object({ newPassword: strongPasswordSchema }).parse(req.body);

    const hashed = await bcrypt.hash(newPassword, 12);
    const expiresAt = new Date(Date.now() + config.password.expiryDays * 24 * 60 * 60 * 1000);

    await prisma.user.update({
      where: { id: req.params.id as string },
      data: {
        password: hashed,
        passwordChangedAt: new Date(),
        passwordExpiresAt: expiresAt,
      },
    });

    res.json({ message: 'Şifre sıfırlandı.' });
  } catch (err) {
    next(err);
  }
}
