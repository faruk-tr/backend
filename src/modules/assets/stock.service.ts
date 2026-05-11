import { prisma } from '../../lib/prisma';
import { AppError } from '../../middleware/errorHandler';
import { MoveAssetRequest, RequestScrapRequest, GetStockMovementsQuery } from './assets.schemas';

export async function moveAsset(assetId: string, data: MoveAssetRequest, movedById: string) {
  const asset = await prisma.asset.findUnique({ where: { id: assetId } });
  if (!asset) throw new AppError(404, 'Varlık bulunamadı.', 'NOT_FOUND');

  await prisma.$transaction([
    prisma.stockMovement.create({
      data: {
        assetId: asset.id,
        fromDepot: asset.depotType,
        toDepot: data.toDepot,
        movedById,
        faultId: data.faultId,
        notes: data.notes,
      },
    }),
    prisma.asset.update({
      where: { id: asset.id },
      data: { depotType: data.toDepot },
    }),
    prisma.stockItem.upsert({
      where: { assetId: asset.id },
      update: { depotType: data.toDepot },
      create: { assetId: asset.id, depotType: data.toDepot },
    }),
  ]);

  return { success: true };
}

export async function requestScrap(assetId: string, data: RequestScrapRequest) {
  await prisma.stockItem.upsert({
    where: { assetId },
    update: { scrapRequested: true, scrapRequestedAt: new Date(), notes: data.notes },
    create: {
      assetId,
      scrapRequested: true,
      scrapRequestedAt: new Date(),
      notes: data.notes,
    },
  });

  return { success: true };
}

export async function approveScrap(assetId: string) {
  await prisma.$transaction([
    prisma.stockItem.update({
      where: { assetId },
      data: { scrapApproved: true, scrapApprovedAt: new Date() },
    }),
    prisma.asset.update({
      where: { id: assetId },
      data: { status: 'scrapped' },
    }),
  ]);

  return { success: true };
}

export async function getStockMovements(query: GetStockMovementsQuery, page: number, limit: number) {
  const where: { assetId?: string } = {};
  if (query.assetId) where.assetId = query.assetId;

  const [total, movements] = await Promise.all([
    prisma.stockMovement.count({ where }),
    prisma.stockMovement.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { movedAt: 'desc' },
      include: {
        asset: { select: { id: true, serialNo: true } },
        movedBy: { select: { id: true, name: true } },
        fault: { select: { id: true, workOrderNo: true } },
      },
    }),
  ]);

  return { movements, total };
}
