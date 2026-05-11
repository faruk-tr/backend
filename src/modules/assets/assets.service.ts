import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../middleware/errorHandler';
import { CreateAssetRequest, UpdateAssetRequest, GetAssetsQuery } from './assets.schemas';

export const assetInclude = {
  assetType: true,
  municipality: { select: { id: true, name: true, city: true } },
  _count: { select: { faults: true } },
};

export const assetDetailInclude = {
  assetType: true,
  municipality: true,
  faults: {
    orderBy: { reportedAt: 'desc' },
    take: 10,
    include: { orderType: true },
  },
  stockMovements: {
    orderBy: { movedAt: 'desc' },
    take: 10,
    include: { movedBy: { select: { id: true, name: true } } },
  },
};

export const assetSimpleInclude = {
  assetType: true,
  municipality: { select: { id: true, name: true } },
};

export interface UserContext {
  id: string;
  role: string;
  municipalityId?: string | null;
}

export function buildWhereClause(query: GetAssetsQuery, user: UserContext): Prisma.AssetWhereInput {
  const where: Prisma.AssetWhereInput = {};

  if (user.role === 'municipality' && user.municipalityId) {
    where.municipalityId = user.municipalityId;
  }

  if (query.search) {
    where.OR = [
      { serialNo: { contains: query.search } },
      { macAddress: { contains: query.search } },
      { simNo: { contains: query.search } },
    ];
  }

  if (query.status) where.status = query.status;
  if (query.municipalityId) where.municipalityId = query.municipalityId;
  if (query.assetTypeId) where.assetTypeId = query.assetTypeId;
  if (query.depotType) where.depotType = query.depotType;

  return where;
}

export async function getAssets(query: GetAssetsQuery, user: UserContext, page: number, limit: number) {
  const where = buildWhereClause(query, user);

  const [total, assets] = await Promise.all([
    prisma.asset.count({ where }),
    prisma.asset.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: assetInclude,
    }),
  ]);

  return { assets, total };
}

export async function getAssetById(id: string) {
  const asset = await prisma.asset.findUnique({
    where: { id },
    include: assetDetailInclude,
  });

  if (!asset) throw new AppError(404, 'Varlık bulunamadı.', 'NOT_FOUND');
  return asset;
}

export async function getAssetBySerialNo(serialNo: string) {
  const asset = await prisma.asset.findUnique({
    where: { serialNo },
    include: assetSimpleInclude,
  });

  if (!asset) throw new AppError(404, 'Seri numarası ile varlık bulunamadı.', 'NOT_FOUND');
  return asset;
}

export async function createAsset(data: CreateAssetRequest, createdById: string) {
  const existing = await prisma.asset.findUnique({ where: { serialNo: data.serialNo } });
  if (existing) throw new AppError(409, 'Bu seri numarası zaten kayıtlı.', 'SERIAL_EXISTS');

  const asset = await prisma.asset.create({
    data: {
      serialNo: data.serialNo,
      macAddress: data.macAddress,
      simNo: data.simNo,
      samNo: data.samNo,
      assetTypeId: data.assetTypeId,
      municipalityId: data.municipalityId,
      status: data.status,
      depotType: data.depotType,
      notes: data.notes,
      stockItem: {
        create: { depotType: data.depotType },
      },
    },
    include: assetSimpleInclude,
  });

  await prisma.activityLog.create({
    data: {
      userId: createdById,
      action: 'create_asset',
      entityType: 'asset',
      entityId: asset.id,
      details: `Varlık oluşturuldu: ${asset.serialNo}`,
    },
  });

  return asset;
}

export async function updateAsset(id: string, data: UpdateAssetRequest) {
  return prisma.asset.update({
    where: { id },
    data: {
      ...(data.status && { status: data.status }),
      ...(data.depotType && { depotType: data.depotType }),
      ...(data.municipalityId !== undefined && { municipalityId: data.municipalityId }),
      ...(data.notes !== undefined && { notes: data.notes }),
    },
    include: assetSimpleInclude,
  });
}

export async function getAssetStats(user: UserContext) {
  const where: Prisma.AssetWhereInput = {};
  if (user.role === 'municipality' && user.municipalityId) {
    where.municipalityId = user.municipalityId;
  }

  const statusCounts = await prisma.asset.groupBy({
    by: ['status'],
    where,
    _count: true,
  });

  const total = statusCounts.reduce((sum, s) => sum + s._count, 0);
  const byStatus = Object.fromEntries(statusCounts.map((s) => [s.status, s._count]));

  return { total, byStatus };
}
