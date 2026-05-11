import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import { getPaginationParams, paginate } from '../utils/pagination';
import { generateWorkOrderNo, generateFormNo } from '../utils/generateCodes';
import { Prisma } from '@prisma/client';

const createFaultSchema = z.object({
  municipalityId: z.string(),
  orderTypeId: z.string().optional(),
  assetId: z.string().optional(),
  assetTypeId: z.string().optional(),
  priority: z.enum(['urgent', 'high', 'normal', 'low']).default('normal'),
  warrantyScope: z.enum(['in_warranty', 'out_of_warranty']).default('out_of_warranty'),
  description: z.string().min(20, 'Açıklama en az 20 karakter olmalı.'),
  reportedAt: z.string().optional(),
});

const updateFaultSchema = z.object({
  priority: z.enum(['urgent', 'high', 'normal', 'low']).optional(),
  warrantyScope: z.enum(['in_warranty', 'out_of_warranty']).optional(),
  description: z.string().min(20).optional(),
  orderTypeId: z.string().optional().nullable(),
  assetId: z.string().optional().nullable(),
});

const changeStatusSchema = z.object({
  status: z.enum(['approved', 'assigned', 'repaired', 'shipped', 'delivered', 'closed', 'cancelled']),
  notes: z.string().optional(),
  // For assignment
  operatorId: z.string().optional(),
  assignedToId: z.string().optional(),
  assignmentNotes: z.string().optional(),
  // For cargo
  cargoCompanyId: z.string().optional(),
  cargoTrackingNo: z.string().optional(),
  // For cancellation
  cancelReason: z.string().optional(),
});

const getFaultsQuerySchema = z.object({
  search: z.string().optional(),
  status: z.enum(['new', 'approved', 'assigned', 'repaired', 'shipped', 'delivered', 'closed', 'cancelled']).optional(),
  priority: z.enum(['urgent', 'high', 'normal', 'low']).optional(),
  municipalityId: z.string().optional(),
  operatorId: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  slaViolation: z.string().optional(),
});

const faultInclude = {
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

export async function getFaults(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { page, limit } = getPaginationParams(req.query);
    
    const parsed = getFaultsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid query parameters' });
    }
    const { search, status, priority, municipalityId, operatorId, startDate, endDate } = parsed.data;

    const where: Prisma.FaultWhereInput = {};

    // Role-based filtering
    if (req.user!.role === 'municipality' && req.user!.municipalityId) {
      where.municipalityId = req.user!.municipalityId;
    } else if (req.user!.role === 'operator' && req.user!.operatorId) {
      where.operatorId = req.user!.operatorId;
    } else if (req.user!.role === 'technician') {
      where.assignedToId = req.user!.id;
    }

    if (search) {
      where.OR = [
        { formNo: { contains: search } },
        { workOrderNo: { contains: search } },
        { description: { contains: search } },
      ];
    }
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (municipalityId && req.user!.role === 'admin') where.municipalityId = municipalityId;
    if (operatorId) where.operatorId = operatorId;
    if (startDate || endDate) {
      where.reportedAt = {};
      if (startDate) where.reportedAt.gte = new Date(startDate);
      if (endDate) where.reportedAt.lte = new Date(endDate);
    }

    const [total, faults] = await Promise.all([
      prisma.fault.count({ where }),
      prisma.fault.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { reportedAt: 'desc' },
        include: {
          municipality: { select: { id: true, name: true, city: true } },
          asset: { select: { id: true, serialNo: true } },
          orderType: { select: { id: true, name: true } },
          operator: { select: { id: true, name: true } },
          assignedTo: { select: { id: true, name: true } },
          cargoCompany: { select: { id: true, name: true } },
          _count: { select: { attachments: true } },
        },
      }),
    ]);

    res.json(paginate(faults, total, { page, limit }));
  } catch (err) {
    next(err);
  }
}

export async function getFaultById(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const fault = await prisma.fault.findUnique({
      where: { id: req.params.id as string },
      include: faultInclude,
    });

    if (!fault) throw new AppError(404, 'Arıza kaydı bulunamadı.', 'NOT_FOUND');

    res.json(fault);
  } catch (err) {
    next(err);
  }
}

export async function createFault(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = createFaultSchema.parse(req.body);

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
        createdById: req.user!.id,
        status: 'new',
        statusHistory: {
          create: {
            status: 'new',
            changedById: req.user!.id,
            notes: 'Arıza kaydı oluşturuldu.',
          },
        },
      },
      include: faultInclude,
    });

    // Update asset status if provided
    if (data.assetId) {
      await prisma.asset.update({
        where: { id: data.assetId },
        data: { status: 'faulty' },
      });
    }

    // Send notifications
    await createFaultNotifications(fault.id, fault.municipalityId, req.user!.id);

    await prisma.activityLog.create({
      data: {
        userId: req.user!.id,
        action: 'create_fault',
        entityType: 'fault',
        entityId: fault.id,
        details: `Arıza oluşturuldu: ${fault.workOrderNo}`,
      },
    });

    res.status(201).json(fault);
  } catch (err) {
    next(err);
  }
}

export async function updateFault(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = updateFaultSchema.parse(req.body);

    const fault = await prisma.fault.findUnique({ where: { id: req.params.id as string } });
    if (!fault) throw new AppError(404, 'Arıza kaydı bulunamadı.', 'NOT_FOUND');

    if (['closed', 'cancelled'].includes(fault.status)) {
      throw new AppError(400, 'Kapalı veya iptal edilmiş arıza güncellenemez.', 'INVALID_STATE');
    }

    const updated = await prisma.fault.update({
      where: { id: req.params.id as string },
      data: {
        ...(data.priority && { priority: data.priority }),
        ...(data.warrantyScope && { warrantyScope: data.warrantyScope }),
        ...(data.description && { description: data.description }),
        ...(data.orderTypeId !== undefined && { orderTypeId: data.orderTypeId }),
        ...(data.assetId !== undefined && { assetId: data.assetId }),
      },
      include: faultInclude,
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
}

export async function changeFaultStatus(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = changeStatusSchema.parse(req.body);

    const fault = await prisma.fault.findUnique({ where: { id: req.params.id as string } });
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
        // Update asset back to active
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
          changedById: req.user!.id,
          notes: data.notes,
        },
      });
      return tx.fault.update({
        where: { id: fault.id },
        data: updateData,
        include: faultInclude,
      });
    });

    // Notifications
    await sendStatusNotification(fault.id, data.status, fault.municipalityId, req.user!.id);

    res.json(updated);
  } catch (err) {
    next(err);
  }
}

export async function deleteFault(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const fault = await prisma.fault.findUnique({ where: { id: req.params.id as string } });
    if (!fault) throw new AppError(404, 'Arıza kaydı bulunamadı.', 'NOT_FOUND');

    if (!['new', 'cancelled'].includes(fault.status)) {
      throw new AppError(400, 'Yalnızca yeni veya iptal edilmiş arızalar silinebilir.', 'INVALID_STATE');
    }

    await prisma.fault.delete({ where: { id: req.params.id as string } });
    res.json({ message: 'Arıza kaydı silindi.' });
  } catch (err) {
    next(err);
  }
}

export async function getFaultStats(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const where: Prisma.FaultWhereInput = {};
    if (req.user!.role === 'municipality' && req.user!.municipalityId) {
      where.municipalityId = req.user!.municipalityId;
    } else if (req.user!.role === 'operator' && req.user!.operatorId) {
      where.operatorId = req.user!.operatorId;
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

    res.json({
      total,
      byStatus: Object.fromEntries(statusCounts.map((s) => [s.status, s._count])),
      byPriority: Object.fromEntries(priorityCounts.map((p) => [p.priority, p._count])),
    });
  } catch (err) {
    next(err);
  }
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
      OR: [
        { municipalityId },
        { role: 'admin' },
      ],
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
