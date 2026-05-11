import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import { getPaginationParams, paginate } from '../utils/pagination';
import { Prisma } from '@prisma/client';

// ─── Municipalities ───────────────────────────────────────────────────────────

const municipalitySchema = z.object({
  name: z.string().min(2),
  code: z.string().min(2),
  city: z.string().min(2),
  district: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  address: z.string().optional(),
  logo: z.string().optional(),
  active: z.boolean().optional(),
});

const getMunicipalitiesQuerySchema = z.object({
  search: z.string().optional(),
  active: z.enum(['true', 'false']).optional(),
});

export async function getMunicipalities(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { page, limit } = getPaginationParams(req.query);
    
    const parsed = getMunicipalitiesQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid query parameters' });
    }
    const { search, active } = parsed.data;
    
    const where: Prisma.MunicipalityWhereInput = {};
    if (search) where.OR = [{ name: { contains: search } }, { city: { contains: search } }];
    if (active !== undefined) where.active = active === 'true';

    const [total, items] = await Promise.all([
      prisma.municipality.count({ where }),
      prisma.municipality.findMany({
        where, skip: (page - 1) * limit, take: limit,
        orderBy: { name: 'asc' },
        include: { _count: { select: { users: true, assets: true, faults: true } } },
      }),
    ]);
    res.json(paginate(items, total, { page, limit }));
  } catch (err) { next(err); }
}

export async function getMunicipalityById(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const item = await prisma.municipality.findUnique({
      where: { id: req.params.id as string },
      include: {
        slaDefinition: true,
        _count: { select: { users: true, assets: true, faults: true } },
      },
    });
    if (!item) throw new AppError(404, 'Belediye bulunamadı.', 'NOT_FOUND');
    res.json(item);
  } catch (err) { next(err); }
}

export async function createMunicipality(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = municipalitySchema.parse(req.body);
    const item = await prisma.municipality.create({ data });
    res.status(201).json(item);
  } catch (err) { next(err); }
}

export async function updateMunicipality(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = municipalitySchema.partial().parse(req.body);
    const item = await prisma.municipality.update({ where: { id: req.params.id as string }, data });
    res.json(item);
  } catch (err) { next(err); }
}

export async function deleteMunicipality(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const count = await prisma.fault.count({ where: { municipalityId: req.params.id as string } });
    if (count > 0) throw new AppError(400, 'Bu belediyeye ait arıza kayıtları mevcut.', 'HAS_RELATIONS');
    await prisma.municipality.delete({ where: { id: req.params.id as string } });
    res.json({ message: 'Belediye silindi.' });
  } catch (err) { next(err); }
}

// ─── Operators ────────────────────────────────────────────────────────────────

const operatorSchema = z.object({
  name: z.string().min(2),
  code: z.string().min(2),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  address: z.string().optional(),
  active: z.boolean().optional(),
  municipalityIds: z.array(z.string()).optional(),
});

const getOperatorsQuerySchema = z.object({
  search: z.string().optional(),
  active: z.enum(['true', 'false']).optional(),
});

export async function getOperators(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { page, limit } = getPaginationParams(req.query);
    
    const parsed = getOperatorsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid query parameters' });
    }
    const { search, active } = parsed.data;
    
    const where: Prisma.OperatorWhereInput = {};
    if (search) where.OR = [{ name: { contains: search } }, { code: { contains: search } }];
    if (active !== undefined) where.active = active === 'true';

    const [total, items] = await Promise.all([
      prisma.operator.count({ where }),
      prisma.operator.findMany({
        where, skip: (page - 1) * limit, take: limit,
        orderBy: { name: 'asc' },
        include: {
          municipalities: { include: { municipality: { select: { id: true, name: true } } } },
          _count: { select: { users: true, faults: true } },
        },
      }),
    ]);
    res.json(paginate(items, total, { page, limit }));
  } catch (err) { next(err); }
}

export async function getOperatorById(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const item = await prisma.operator.findUnique({
      where: { id: req.params.id as string },
      include: {
        municipalities: { include: { municipality: true } },
        _count: { select: { users: true, faults: true } },
      },
    });
    if (!item) throw new AppError(404, 'Operatör bulunamadı.', 'NOT_FOUND');
    res.json(item);
  } catch (err) { next(err); }
}

export async function createOperator(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { municipalityIds, ...data } = operatorSchema.parse(req.body);
    const item = await prisma.operator.create({
      data: {
        ...data,
        municipalities: municipalityIds
          ? { create: municipalityIds.map((id) => ({ municipalityId: id })) }
          : undefined,
      },
    });
    res.status(201).json(item);
  } catch (err) { next(err); }
}

export async function updateOperator(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { municipalityIds, ...data } = operatorSchema.partial().parse(req.body);
    const operatorId = req.params.id as string;
    await prisma.$transaction(async (tx) => {
      if (municipalityIds !== undefined) {
        await tx.operatorMunicipality.deleteMany({ where: { operatorId } });
        if (municipalityIds.length > 0) {
          await tx.operatorMunicipality.createMany({
            data: municipalityIds.map((id) => ({ operatorId, municipalityId: id })),
          });
        }
      }
      await tx.operator.update({ where: { id: operatorId }, data });
    });
    res.json({ message: 'Operatör güncellendi.' });
  } catch (err) { next(err); }
}

export async function deleteOperator(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await prisma.operator.delete({ where: { id: req.params.id as string } });
    res.json({ message: 'Operatör silindi.' });
  } catch (err) { next(err); }
}

// ─── Asset Types ──────────────────────────────────────────────────────────────

const assetTypeSchema = z.object({
  name: z.string().min(2),
  code: z.string().min(2),
  icon: z.string().optional(),
  active: z.boolean().optional(),
});

export async function getAssetTypes(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const items = await prisma.assetType.findMany({ orderBy: { name: 'asc' } });
    res.json(items);
  } catch (err) { next(err); }
}

export async function createAssetType(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = assetTypeSchema.parse(req.body);
    const item = await prisma.assetType.create({ data });
    res.status(201).json(item);
  } catch (err) { next(err); }
}

export async function updateAssetType(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = assetTypeSchema.partial().parse(req.body);
    const item = await prisma.assetType.update({ where: { id: req.params.id as string }, data });
    res.json(item);
  } catch (err) { next(err); }
}

export async function deleteAssetType(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const count = await prisma.asset.count({ where: { assetTypeId: req.params.id as string } });
    if (count > 0) throw new AppError(400, 'Bu cihaz türüne ait varlıklar mevcut.', 'HAS_RELATIONS');
    await prisma.assetType.delete({ where: { id: req.params.id as string } });
    res.json({ message: 'Cihaz türü silindi.' });
  } catch (err) { next(err); }
}

// ─── Order Types ──────────────────────────────────────────────────────────────

const orderTypeSchema = z.object({
  name: z.string().min(2),
  code: z.string().min(2),
  active: z.boolean().optional(),
});

export async function getOrderTypes(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const items = await prisma.orderType.findMany({ orderBy: { name: 'asc' } });
    res.json(items);
  } catch (err) { next(err); }
}

export async function createOrderType(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = orderTypeSchema.parse(req.body);
    const item = await prisma.orderType.create({ data });
    res.status(201).json(item);
  } catch (err) { next(err); }
}

export async function updateOrderType(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = orderTypeSchema.partial().parse(req.body);
    const item = await prisma.orderType.update({ where: { id: req.params.id as string }, data });
    res.json(item);
  } catch (err) { next(err); }
}

export async function deleteOrderType(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await prisma.orderType.delete({ where: { id: req.params.id as string } });
    res.json({ message: 'İş emri türü silindi.' });
  } catch (err) { next(err); }
}

// ─── Cargo Companies ──────────────────────────────────────────────────────────

const cargoCompanySchema = z.object({
  name: z.string().min(2),
  code: z.string().min(2),
  trackingUrl: z.string().url().optional().or(z.literal('')),
  active: z.boolean().optional(),
});

export async function getCargoCompanies(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const items = await prisma.cargoCompany.findMany({ orderBy: { name: 'asc' } });
    res.json(items);
  } catch (err) { next(err); }
}

export async function createCargoCompany(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = cargoCompanySchema.parse(req.body);
    const item = await prisma.cargoCompany.create({ data });
    res.status(201).json(item);
  } catch (err) { next(err); }
}

export async function updateCargoCompany(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = cargoCompanySchema.partial().parse(req.body);
    const item = await prisma.cargoCompany.update({ where: { id: req.params.id as string }, data });
    res.json(item);
  } catch (err) { next(err); }
}

export async function deleteCargoCompany(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await prisma.cargoCompany.delete({ where: { id: req.params.id as string } });
    res.json({ message: 'Kargo firması silindi.' });
  } catch (err) { next(err); }
}
