import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../middleware/errorHandler';
import { paginate, PaginationParams } from '../../utils/pagination';
import type {
  MunicipalityRequest,
  OperatorRequest,
  AssetTypeRequest,
  OrderTypeRequest,
  CargoCompanyRequest,
} from './definitions.schemas';

// ─── Municipalities ───────────────────────────────────────────────────────────

export interface ListMunicipalitiesFilters {
  search?: string;
  active?: string;
}

export async function listMunicipalities(filters: ListMunicipalitiesFilters, pagination: PaginationParams) {
  const where: Prisma.MunicipalityWhereInput = {};
  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search } },
      { city: { contains: filters.search } },
    ];
  }
  if (filters.active !== undefined) where.active = filters.active === 'true';

  const [total, items] = await Promise.all([
    prisma.municipality.count({ where }),
    prisma.municipality.findMany({
      where,
      skip: (pagination.page - 1) * pagination.limit,
      take: pagination.limit,
      orderBy: { name: 'asc' },
      include: { _count: { select: { users: true, assets: true, faults: true } } },
    }),
  ]);

  return paginate(items, total, pagination);
}

export async function getMunicipalityById(id: string) {
  const item = await prisma.municipality.findUnique({
    where: { id },
    include: {
      slaDefinition: true,
      _count: { select: { users: true, assets: true, faults: true } },
    },
  });
  if (!item) throw new AppError(404, 'Belediye bulunamadı.', 'NOT_FOUND');
  return item;
}

export async function createMunicipality(data: MunicipalityRequest) {
  return prisma.municipality.create({ data: data as Prisma.MunicipalityCreateInput });
}

export async function updateMunicipality(id: string, data: Partial<MunicipalityRequest>) {
  return prisma.municipality.update({ where: { id }, data: data as Prisma.MunicipalityUpdateInput });
}

export async function deleteMunicipality(id: string) {
  const count = await prisma.fault.count({ where: { municipalityId: id } });
  if (count > 0) throw new AppError(400, 'Bu belediyeye ait arıza kayıtları mevcut.', 'HAS_RELATIONS');
  await prisma.municipality.delete({ where: { id } });
  return { message: 'Belediye silindi.' };
}

// ─── Operators ────────────────────────────────────────────────────────────────

export interface ListOperatorsFilters {
  search?: string;
  active?: string;
}

export async function listOperators(filters: ListOperatorsFilters, pagination: PaginationParams) {
  const where: Prisma.OperatorWhereInput = {};
  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search } },
      { code: { contains: filters.search } },
    ];
  }
  if (filters.active !== undefined) where.active = filters.active === 'true';

  const [total, items] = await Promise.all([
    prisma.operator.count({ where }),
    prisma.operator.findMany({
      where,
      skip: (pagination.page - 1) * pagination.limit,
      take: pagination.limit,
      orderBy: { name: 'asc' },
      include: {
        municipalities: { include: { municipality: { select: { id: true, name: true } } } },
        _count: { select: { users: true, faults: true } },
      },
    }),
  ]);

  return paginate(items, total, pagination);
}

export async function getOperatorById(id: string) {
  const item = await prisma.operator.findUnique({
    where: { id },
    include: {
      municipalities: { include: { municipality: true } },
      _count: { select: { users: true, faults: true } },
    },
  });
  if (!item) throw new AppError(404, 'Operatör bulunamadı.', 'NOT_FOUND');
  return item;
}

export async function createOperator(data: OperatorRequest) {
  const { municipalityIds, ...rest } = data;
  return prisma.operator.create({
    data: {
      ...rest,
      municipalities: municipalityIds
        ? { create: municipalityIds.map((id) => ({ municipalityId: id })) }
        : undefined,
    } as Prisma.OperatorCreateInput,
  });
}

export async function updateOperator(id: string, data: Partial<OperatorRequest>) {
  const { municipalityIds, ...rest } = data;
  
  await prisma.$transaction(async (tx) => {
    if (municipalityIds !== undefined) {
      await tx.operatorMunicipality.deleteMany({ where: { operatorId: id } });
      if (municipalityIds.length > 0) {
        await tx.operatorMunicipality.createMany({
          data: municipalityIds.map((mId) => ({ operatorId: id, municipalityId: mId })),
        });
      }
    }
    await tx.operator.update({ where: { id }, data: rest });
  });

  return { message: 'Operatör güncellendi.' };
}

export async function deleteOperator(id: string) {
  await prisma.operator.delete({ where: { id } });
  return { message: 'Operatör silindi.' };
}

// ─── Asset Types ──────────────────────────────────────────────────────────────

export async function listAssetTypes() {
  return prisma.assetType.findMany({ orderBy: { name: 'asc' } });
}

export async function createAssetType(data: AssetTypeRequest) {
  return prisma.assetType.create({ data: data as Prisma.AssetTypeCreateInput });
}

export async function updateAssetType(id: string, data: Partial<AssetTypeRequest>) {
  return prisma.assetType.update({ where: { id }, data: data as Prisma.AssetTypeUpdateInput });
}

export async function deleteAssetType(id: string) {
  const count = await prisma.asset.count({ where: { assetTypeId: id } });
  if (count > 0) throw new AppError(400, 'Bu cihaz türüne ait varlıklar mevcut.', 'HAS_RELATIONS');
  await prisma.assetType.delete({ where: { id } });
  return { message: 'Cihaz türü silindi.' };
}

// ─── Order Types ──────────────────────────────────────────────────────────────

export async function listOrderTypes() {
  return prisma.orderType.findMany({ orderBy: { name: 'asc' } });
}

export async function createOrderType(data: OrderTypeRequest) {
  return prisma.orderType.create({ data: data as Prisma.OrderTypeCreateInput });
}

export async function updateOrderType(id: string, data: Partial<OrderTypeRequest>) {
  return prisma.orderType.update({ where: { id }, data: data as Prisma.OrderTypeUpdateInput });
}

export async function deleteOrderType(id: string) {
  await prisma.orderType.delete({ where: { id } });
  return { message: 'İş emri türü silindi.' };
}

// ─── Cargo Companies ──────────────────────────────────────────────────────────

export async function listCargoCompanies() {
  return prisma.cargoCompany.findMany({ orderBy: { name: 'asc' } });
}

export async function createCargoCompany(data: CargoCompanyRequest) {
  return prisma.cargoCompany.create({ data: data as Prisma.CargoCompanyCreateInput });
}

export async function updateCargoCompany(id: string, data: Partial<CargoCompanyRequest>) {
  return prisma.cargoCompany.update({ where: { id }, data: data as Prisma.CargoCompanyUpdateInput });
}

export async function deleteCargoCompany(id: string) {
  await prisma.cargoCompany.delete({ where: { id } });
  return { message: 'Kargo firması silindi.' };
}
