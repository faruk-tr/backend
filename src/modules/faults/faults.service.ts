import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../middleware/errorHandler';
import { generateWorkOrderNo, generateFormNo } from '../../utils/generateCodes';
import { CreateFaultRequest, UpdateFaultRequest, UpdateStatusRequest, GetFaultsQuery } from './faults.schemas';

export const faultInclude = {
  municipality: { select: { id: true, name: true, city: true } },
  asset: { select: { id: true, serialNo: true, macAddress: true } },
  orderType: true,
  operator: { select: { id: true, name: true } },
  assignedTo: { select: { id: true, name: true, phone: true } },
  createdBy: { select: { id: true, name: true } },
  cargoCompany: true,
  statusHistory: {
    include: { changedBy: { select: { id: true, name: true } } },
    orderBy: { changedAt: 'asc' as const },
  },
};

export const listInclude = {
  municipality: { select: { id: true, name: true, city: true } },
  asset: { select: { id: true, serialNo: true } },
  orderType: { select: { id: true, name: true } },
  operator: { select: { id: true, name: true } },
  assignedTo: { select: { id: true, name: true } },
  cargoCompany: { select: { id: true, name: true } },
  _count: { select: { attachments: true } },
};

export interface UserContext {
  id: string;
  role: string;
  municipalityId?: string | null;
  operatorId?: string | null;
}

export function buildWhereClause(query: GetFaultsQuery, user: UserContext): Prisma.FaultWhereInput {
  const where: Prisma.FaultWhereInput = {};

  if (user.role === 'municipality' && user.municipalityId) {
    where.municipalityId = user.municipalityId;
  } else if (user.role === 'operator' && user.operatorId) {
    where.operatorId = user.operatorId;
  } else if (user.role === 'technician') {
    where.assignedToId = user.id;
  }

  if (query.search) {
    where.OR = [
      { formNo: { contains: query.search } },
      { workOrderNo: { contains: query.search } },
      { description: { contains: query.search } },
    ];
  }

  if (query.status) where.status = query.status;
  if (query.priority) where.priority = query.priority;
  if (query.municipalityId && user.role === 'admin') where.municipalityId = query.municipalityId;
  if (query.operatorId) where.operatorId = query.operatorId;

  if (query.startDate || query.endDate) {
    where.reportedAt = {};
    if (query.startDate) where.reportedAt.gte = new Date(query.startDate);
    if (query.endDate) where.reportedAt.lte = new Date(query.endDate);
  }

  return where;
}

export async function getFaults(query: GetFaultsQuery, user: UserContext, page: number, limit: number) {
  const where = buildWhereClause(query, user);

  const [total, faults] = await Promise.all([
    prisma.fault.count({ where }),
    prisma.fault.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { reportedAt: 'desc' },
      include: listInclude,
    }),
  ]);

  return { faults, total };
}

export async function getFaultById(id: string) {
  const fault = await prisma.fault.findUnique({
    where: { id },
    include: faultInclude,
  });

  if (!fault) throw new AppError(404, 'Arıza kaydı bulunamadı.', 'NOT_FOUND');
  return fault;
}

export async function createFault(data: CreateFaultRequest, createdById: string) {
  const municipality = await prisma.municipality.findUnique({
    where: { id: data.municipalityId },
  });
  if (!municipality) throw new AppError(404, 'Belediye bulunamadı.', 'NOT_FOUND');

  const workOrderNo = await generateWorkOrderNo();
  const plateCode = municipality.code.slice(0, 2);
  const formNo = await generateFormNo(plateCode);

  const fault = await prisma.fault.create({
    data: {
      formNo,
      workOrderNo,
      municipalityId: data.municipalityId,
      orderTypeId: data.orderTypeId,
      assetId: data.assetId,
      assetTypeId: data.assetTypeId,
      priority: data.priority,
      warrantyScope: data.warrantyScope,
      description: data.description,
      reportedAt: data.reportedAt ? new Date(data.reportedAt) : new Date(),
      createdById,
      status: 'new',
      statusHistory: {
        create: {
          status: 'new',
          changedById: createdById,
          notes: 'Arıza kaydı oluşturuldu.',
        },
      },
    },
    include: faultInclude,
  });

  if (data.assetId) {
    await prisma.asset.update({
      where: { id: data.assetId },
      data: { status: 'faulty' },
    });
  }

  await createFaultNotifications(fault.id, fault.municipalityId, createdById);

  await prisma.activityLog.create({
    data: {
      userId: createdById,
      action: 'create_fault',
      entityType: 'fault',
      entityId: fault.id,
      details: `Arıza oluşturuldu: ${fault.workOrderNo}`,
    },
  });

  return fault;
}

export async function updateFault(id: string, data: UpdateFaultRequest) {
  const fault = await prisma.fault.findUnique({ where: { id } });
  if (!fault) throw new AppError(404, 'Arıza kaydı bulunamadı.', 'NOT_FOUND');

  if (['closed', 'cancelled'].includes(fault.status)) {
    throw new AppError(400, 'Kapalı veya iptal edilmiş arıza güncellenemez.', 'INVALID_STATE');
  }

  return prisma.fault.update({
    where: { id },
    data: {
      ...(data.priority && { priority: data.priority }),
      ...(data.warrantyScope && { warrantyScope: data.warrantyScope }),
      ...(data.description && { description: data.description }),
      ...(data.orderTypeId !== undefined && { orderTypeId: data.orderTypeId }),
      ...(data.assetId !== undefined && { assetId: data.assetId }),
    },
    include: faultInclude,
  });
}

export async function changeFaultStatus(id: string, data: UpdateStatusRequest, changedById: string) {
  const fault = await prisma.fault.findUnique({ where: { id } });
  if (!fault) throw new AppError(404, 'Arıza kaydı bulunamadı.', 'NOT_FOUND');

  if (['closed', 'cancelled'].includes(fault.status)) {
    throw new AppError(400, 'Kapalı veya iptal edilmiş arıza durumu değiştirilemez.', 'INVALID_STATE');
  }

  const now = new Date();
  const updateData: Prisma.FaultUpdateInput = { status: data.status };

  switch (data.status) {
    case 'approved':
      updateData.approvedAt = now;
      break;
    case 'assigned':
      updateData.assignedAt = now;
      if (data.operatorId) updateData.operator = { connect: { id: data.operatorId } };
      if (data.assignedToId) updateData.assignedTo = { connect: { id: data.assignedToId } };
      if (data.assignmentNotes) updateData.assignmentNotes = data.assignmentNotes;
      break;
    case 'shipped':
      updateData.shippedAt = now;
      if (data.cargoCompanyId) updateData.cargoCompany = { connect: { id: data.cargoCompanyId } };
      if (data.cargoTrackingNo) updateData.cargoTrackingNo = data.cargoTrackingNo;
      break;
    case 'delivered':
      updateData.deliveredAt = now;
      break;
    case 'repaired':
      updateData.repairedAt = now;
      break;
    case 'closed':
      updateData.closedAt = now;
      if (fault.assetId) {
        await prisma.asset.update({
          where: { id: fault.assetId },
          data: { status: 'active' },
        });
      }
      break;
    case 'cancelled':
      updateData.cancelledAt = now;
      if (data.cancelReason) updateData.cancelReason = data.cancelReason;
      if (fault.assetId) {
        await prisma.asset.update({
          where: { id: fault.assetId },
          data: { status: 'active' },
        });
      }
      break;
  }

  const updated = await prisma.$transaction(async (tx) => {
    await tx.faultStatusHistory.create({
      data: {
        faultId: fault.id,
        status: data.status,
        changedById,
        notes: data.notes,
      },
    });
    return tx.fault.update({
      where: { id: fault.id },
      data: updateData,
      include: faultInclude,
    });
  });

  await sendStatusNotification(fault.id, data.status, fault.municipalityId, changedById);

  return updated;
}

export async function deleteFault(id: string) {
  const fault = await prisma.fault.findUnique({ where: { id } });
  if (!fault) throw new AppError(404, 'Arıza kaydı bulunamadı.', 'NOT_FOUND');

  if (!['new', 'cancelled'].includes(fault.status)) {
    throw new AppError(400, 'Yalnızca yeni veya iptal edilmiş arızalar silinebilir.', 'INVALID_STATE');
  }

  await prisma.fault.delete({ where: { id } });
}

export async function getFaultStats(user: UserContext) {
  const where: Prisma.FaultWhereInput = {};
  if (user.role === 'municipality' && user.municipalityId) {
    where.municipalityId = user.municipalityId;
  } else if (user.role === 'operator' && user.operatorId) {
    where.operatorId = user.operatorId;
  }

  const [statusCounts, priorityCounts, total] = await Promise.all([
    prisma.fault.groupBy({
      by: ['status'],
      where,
      _count: true,
    }),
    prisma.fault.groupBy({
      by: ['priority'],
      where: { ...where, status: { notIn: ['closed', 'cancelled'] } },
      _count: true,
    }),
    prisma.fault.count({ where }),
  ]);

  return {
    total,
    byStatus: Object.fromEntries(statusCounts.map((s) => [s.status, s._count])),
    byPriority: Object.fromEntries(priorityCounts.map((p) => [p.priority, p._count])),
  };
}

// Helper: create notifications when a fault is created
async function createFaultNotifications(faultId: string, municipalityId: string, createdById: string) {
  const admins = await prisma.user.findMany({
    where: { role: 'admin', active: true },
    select: { id: true },
  });

  const notifications = admins.map((a) => ({
    userId: a.id,
    type: 'fault_created' as const,
    title: 'Yeni Arıza Bildirimi',
    message: 'Sisteme yeni bir arıza kaydı eklendi.',
    faultId,
  }));

  if (notifications.length > 0) {
    await prisma.notification.createMany({ data: notifications });
  }
}

async function sendStatusNotification(
  faultId: string,
  status: string,
  municipalityId: string,
  changedById: string,
) {
  const typeMap: Record<string, string> = {
    assigned: 'fault_assigned',
    shipped: 'cargo_sent',
    closed: 'fault_closed',
  };

  const notifType = typeMap[status];
  if (!notifType) return;

  const users = await prisma.user.findMany({
    where: {
      OR: [{ municipalityId }, { role: 'admin' }],
      active: true,
      id: { not: changedById },
    },
    select: { id: true },
  });

  const titleMap: Record<string, string> = {
    fault_assigned: 'Arıza Üstlenildi',
    cargo_sent: 'Kargo Gönderildi',
    fault_closed: 'Arıza Kapatıldı',
  };

  if (users.length > 0) {
    await prisma.notification.createMany({
      data: users.map((u) => ({
        userId: u.id,
        type: notifType,
        title: titleMap[notifType],
        message: `Arıza durumu güncellendi: ${status}`,
        faultId,
      })),
    });
  }
}
