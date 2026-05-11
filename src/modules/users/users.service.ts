import * as bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../middleware/errorHandler';
import { generateUserCode } from '../../utils/generateCodes';
import { config } from '../../config';
import { paginate, PaginationParams } from '../../utils/pagination';
import type {
  CreateUserRequest,
  UpdateUserRequest,
  UpdatePermissionsRequest,
  UpdateMenuPermissionsRequest,
  ResetPasswordRequest,
} from './users.schemas';

export interface UserContext {
  id: string;
  role: string;
  municipalityId?: string | null;
}

export interface ListUsersFilters {
  search?: string;
  role?: string;
  active?: string;
}

export async function listUsers(filters: ListUsersFilters, user: UserContext, pagination: PaginationParams) {
  const where: Prisma.UserWhereInput = {};

  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search } },
      { email: { contains: filters.search } },
      { userCode: { contains: filters.search } },
    ];
  }
  if (filters.role) where.role = filters.role;
  if (filters.active !== undefined) where.active = filters.active === 'true';

  // Municipality users can only see their own municipality
  if (user.role === 'municipality' && user.municipalityId) {
    where.municipalityId = user.municipalityId;
  }

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      skip: (pagination.page - 1) * pagination.limit,
      take: pagination.limit,
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

  return paginate(data, total, pagination);
}

export async function getUserById(id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      municipality: true,
      operator: true,
      permissions: true,
      menuPermissions: true,
    },
  });

  if (!user) throw new AppError(404, 'Kullanıcı bulunamadı.', 'NOT_FOUND');

  return {
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
  };
}

export async function createUser(data: CreateUserRequest, actorId: string) {
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
      userId: actorId,
      action: 'create_user',
      entityType: 'user',
      entityId: user.id,
      details: `Kullanıcı oluşturuldu: ${user.email}`,
    },
  });

  return {
    id: user.id,
    userCode: user.userCode,
    name: user.name,
    email: user.email,
    role: user.role,
    permissions: user.permissions.map((p) => p.permission),
  };
}

export async function updateUser(id: string, data: UpdateUserRequest, actorId: string) {
  const user = await prisma.user.update({
    where: { id },
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
      userId: actorId,
      action: 'update_user',
      entityType: 'user',
      entityId: user.id,
    },
  });

  return { message: 'Kullanıcı güncellendi.', id: user.id };
}

export async function deleteUser(id: string, actorId: string) {
  if (id === actorId) {
    throw new AppError(400, 'Kendi hesabınızı silemezsiniz.', 'CANNOT_DELETE_SELF');
  }

  await prisma.user.delete({ where: { id } });

  await prisma.activityLog.create({
    data: {
      userId: actorId,
      action: 'delete_user',
      entityType: 'user',
      entityId: id,
    },
  });

  return { message: 'Kullanıcı silindi.' };
}

export async function getUserPermissions(id: string) {
  const permissions = await prisma.userPermission.findMany({
    where: { userId: id },
  });
  return permissions.map((p) => p.permission);
}

export async function updateUserPermissions(id: string, data: UpdatePermissionsRequest) {
  await prisma.$transaction([
    prisma.userPermission.deleteMany({ where: { userId: id } }),
    prisma.userPermission.createMany({
      data: data.permissions.map((p) => ({ userId: id, permission: p })),
    }),
  ]);

  return { message: 'İzinler güncellendi.' };
}

export async function getUserMenuPermissions(id: string) {
  return prisma.userMenuPermission.findMany({
    where: { userId: id },
  });
}

export async function updateUserMenuPermissions(id: string, data: UpdateMenuPermissionsRequest) {
  await prisma.$transaction([
    prisma.userMenuPermission.deleteMany({ where: { userId: id } }),
    prisma.userMenuPermission.createMany({
      data: data.menuPermissions.map((m) => ({
        userId: id,
        menuKey: m.menuKey,
        enabled: m.enabled,
      })),
    }),
  ]);

  return { message: 'Menü izinleri güncellendi.' };
}

export async function resetUserPassword(id: string, data: ResetPasswordRequest) {
  const hashed = await bcrypt.hash(data.newPassword, 12);
  const expiresAt = new Date(Date.now() + config.password.expiryDays * 24 * 60 * 60 * 1000);

  await prisma.user.update({
    where: { id },
    data: {
      password: hashed,
      passwordChangedAt: new Date(),
      passwordExpiresAt: expiresAt,
    },
  });

  return { message: 'Şifre sıfırlandı.' };
}
