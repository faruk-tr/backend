import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import { getPaginationParams, paginate } from '../utils/pagination';
import { Prisma } from '@prisma/client';

const createAssetSchema = z.object({
  serialNo: z.string().min(1),
  macAddress: z.string().optional(),
  simNo: z.string().optional(),
  samNo: z.string().optional(),
  assetTypeId: z.string(),
  municipalityId: z.string().optional(),
  status: z.enum(['active', 'faulty', 'in_repair', 'scrapped', 'in_stock']).default('in_stock'),
  depotType: z.enum(['field', 'ptt_depot', 'supplier_depot']).default('ptt_depot'),
  notes: z.string().optional(),
});

const updateAssetSchema = z.object({
  status: z.enum(['active', 'faulty', 'in_repair', 'scrapped', 'in_stock']).optional(),
  depotType: z.enum(['field', 'ptt_depot', 'supplier_depot']).optional(),
  municipalityId: z.string().optional().nullable(),
  notes: z.string().optional(),
});

const getAssetsQuerySchema = z.object({
  search: z.string().optional(),
  status: z.enum(['active', 'faulty', 'in_repair', 'scrapped', 'in_stock']).optional(),
  municipalityId: z.string().optional(),
  assetTypeId: z.string().optional(),
  depotType: z.enum(['field', 'ptt_depot', 'supplier_depot']).optional(),
});

const getStockMovementsQuerySchema = z.object({
  assetId: z.string().optional(),
});

export async function getAssets(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { page, limit } = getPaginationParams(req.query);
    
    const parsed = getAssetsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid query parameters' });
    }
    const { search, status, municipalityId, assetTypeId, depotType } = parsed.data;

    const where: Prisma.AssetWhereInput = {};

    if (req.user!.role === 'municipality' && req.user!.municipalityId) {
      where.municipalityId = req.user!.municipalityId;
    }

    if (search) {
      where.OR = [
        { serialNo: { contains: search } },
        { macAddress: { contains: search } },
        { simNo: { contains: search } },
      ];
    }
    if (status) where.status = status;
    if (municipalityId) where.municipalityId = municipalityId;
    if (assetTypeId) where.assetTypeId = assetTypeId;
    if (depotType) where.depotType = depotType;

    const [total, assets] = await Promise.all([
      prisma.asset.count({ where }),
      prisma.asset.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          assetType: true,
          municipality: { select: { id: true, name: true, city: true } },
          _count: { select: { faults: true } },
        },
      }),
    ]);

    res.json(paginate(assets, total, { page, limit }));
  } catch (err) {
    next(err);
  }
}

export async function getAssetById(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const asset = await prisma.asset.findUnique({
      where: { id: req.params.id as string },
      include: {
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
      },
    });

    if (!asset) throw new AppError(404, 'Varlık bulunamadı.', 'NOT_FOUND');
    res.json(asset);
  } catch (err) {
    next(err);
  }
}

export async function getAssetBySerialNo(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const asset = await prisma.asset.findUnique({
      where: { serialNo: req.params.serialNo as string },
      include: {
        assetType: true,
        municipality: { select: { id: true, name: true } },
      },
    });

    if (!asset) throw new AppError(404, 'Seri numarası ile varlık bulunamadı.', 'NOT_FOUND');
    res.json(asset);
  } catch (err) {
    next(err);
  }
}

export async function createAsset(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = createAssetSchema.parse(req.body);

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
      include: {
        assetType: true,
        municipality: { select: { id: true, name: true } },
      },
    });

    await prisma.activityLog.create({
      data: {
        userId: req.user!.id,
        action: 'create_asset',
        entityType: 'asset',
        entityId: asset.id,
        details: `Varlık oluşturuldu: ${asset.serialNo}`,
      },
    });

    res.status(201).json(asset);
  } catch (err) {
    next(err);
  }
}

export async function updateAsset(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = updateAssetSchema.parse(req.body);

    const asset = await prisma.asset.update({
      where: { id: req.params.id as string },
      data: {
        ...(data.status && { status: data.status }),
        ...(data.depotType && { depotType: data.depotType }),
        ...(data.municipalityId !== undefined && { municipalityId: data.municipalityId }),
        ...(data.notes !== undefined && { notes: data.notes }),
      },
      include: {
        assetType: true,
        municipality: { select: { id: true, name: true } },
      },
    });

    res.json(asset);
  } catch (err) {
    next(err);
  }
}

export async function getAssetStats(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const where: Prisma.AssetWhereInput = {};
    if (req.user!.role === 'municipality' && req.user!.municipalityId) {
      where.municipalityId = req.user!.municipalityId;
    }

    const statusCounts = await prisma.asset.groupBy({
      by: ['status'],
      where,
      _count: true,
    });

    const total = statusCounts.reduce((sum, s) => sum + s._count, 0);
    const byStatus = Object.fromEntries(statusCounts.map((s) => [s.status, s._count]));

    res.json({ total, byStatus });
  } catch (err) {
    next(err);
  }
}

// ─── Stock ───────────────────────────────────────────────────────────────────

export async function moveAsset(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { toDepot, notes, faultId } = z
      .object({
        toDepot: z.enum(['field', 'ptt_depot', 'supplier_depot']),
        notes: z.string().optional(),
        faultId: z.string().optional(),
      })
      .parse(req.body);

    const asset = await prisma.asset.findUnique({ where: { id: req.params.id as string } });
    if (!asset) throw new AppError(404, 'Varlık bulunamadı.', 'NOT_FOUND');

    await prisma.$transaction([
      prisma.stockMovement.create({
        data: {
          assetId: asset.id,
          fromDepot: asset.depotType,
          toDepot: toDepot,
          movedById: req.user!.id,
          faultId,
          notes,
        },
      }),
      prisma.asset.update({
        where: { id: asset.id },
        data: { depotType: toDepot },
      }),
      prisma.stockItem.upsert({
        where: { assetId: asset.id },
        update: { depotType: toDepot },
        create: { assetId: asset.id, depotType: toDepot },
      }),
    ]);

    res.json({ message: 'Varlık taşındı.' });
  } catch (err) {
    next(err);
  }
}

export async function requestScrap(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { notes } = z.object({ notes: z.string().optional() }).parse(req.body);

    const assetId = req.params.id as string;
    await prisma.stockItem.upsert({
      where: { assetId },
      update: { scrapRequested: true, scrapRequestedAt: new Date(), notes },
      create: {
        assetId,
        scrapRequested: true,
        scrapRequestedAt: new Date(),
        notes,
      },
    });

    res.json({ message: 'Hurda talebi oluşturuldu.' });
  } catch (err) {
    next(err);
  }
}

export async function approveScrap(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await prisma.$transaction([
      prisma.stockItem.update({
        where: { assetId: req.params.id as string },
        data: { scrapApproved: true, scrapApprovedAt: new Date() },
      }),
      prisma.asset.update({
        where: { id: req.params.id as string },
        data: { status: 'scrapped' },
      }),
    ]);

    res.json({ message: 'Hurda onaylandı.' });
  } catch (err) {
    next(err);
  }
}

export async function getStockMovements(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { page, limit } = getPaginationParams(req.query);
    
    const parsed = getStockMovementsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid query parameters' });
    }
    const { assetId } = parsed.data;

    const where: Prisma.StockMovementWhereInput = {};
    if (assetId) where.assetId = assetId;

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

    res.json(paginate(movements, total, { page, limit }));
  } catch (err) {
    next(err);
  }
}
