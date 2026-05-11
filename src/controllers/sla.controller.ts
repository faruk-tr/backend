import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';

const slaSchema = z.object({
  slaDays: z.number().int().min(1).optional(),
  farePrice: z.number().min(0).optional(),
  dailyPenaltyCount: z.number().int().min(1).optional(),
  urgentResponseHrs: z.number().int().min(1).optional(),
  urgentResolutionDays: z.number().int().min(1).optional(),
  highResponseHrs: z.number().int().min(1).optional(),
  highResolutionDays: z.number().int().min(1).optional(),
  normalResponseHrs: z.number().int().min(1).optional(),
  normalResolutionDays: z.number().int().min(1).optional(),
  lowResponseHrs: z.number().int().min(1).optional(),
  lowResolutionDays: z.number().int().min(1).optional(),
});

export async function getSlaDefinitions(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const where: any = {};
    if (req.user!.role === 'municipality' && req.user!.municipalityId) {
      where.municipalityId = req.user!.municipalityId;
    }

    const items = await prisma.slaDefinition.findMany({
      where,
      include: {
        municipality: { select: { id: true, name: true, city: true } },
        emailRecipients: true,
      },
    });
    res.json(items);
  } catch (err) { next(err); }
}

export async function getSlaDefinitionByMunicipality(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const item = await prisma.slaDefinition.findUnique({
      where: { municipalityId: req.params.municipalityId },
      include: {
        municipality: true,
        emailRecipients: true,
        sendLogs: { orderBy: { sentAt: 'desc' }, take: 10 },
      },
    });
    if (!item) throw new AppError(404, 'SLA tanımı bulunamadı.', 'NOT_FOUND');
    res.json(item);
  } catch (err) { next(err); }
}

export async function upsertSlaDefinition(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = slaSchema.parse(req.body);
    const { municipalityId } = req.params;

    const item = await prisma.slaDefinition.upsert({
      where: { municipalityId },
      update: data,
      create: { municipalityId, ...data },
    });
    res.json(item);
  } catch (err) { next(err); }
}

export async function getSlaViolations(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const where: any = {
      status: { notIn: ['closed', 'cancelled'] },
      assignedAt: { not: null },
    };

    if (req.user!.role === 'municipality' && req.user!.municipalityId) {
      where.municipalityId = req.user!.municipalityId;
    }

    const faults = await prisma.fault.findMany({
      where,
      include: {
        municipality: { include: { slaDefinition: true } },
        operator: { select: { id: true, name: true } },
      },
    });

    const now = new Date();
    const violations = faults
      .filter((f) => {
        const sla = f.municipality.slaDefinition;
        if (!sla || !f.assignedAt) return false;
        const daysElapsed = (now.getTime() - f.assignedAt.getTime()) / (1000 * 60 * 60 * 24);
        const limit = getPriorityResolutionDays(f.priority, sla);
        return daysElapsed > limit;
      })
      .map((f) => {
        const sla = f.municipality.slaDefinition!;
        const daysElapsed = (now.getTime() - f.assignedAt!.getTime()) / (1000 * 60 * 60 * 24);
        const limit = getPriorityResolutionDays(f.priority, sla);
        const overdueDays = Math.ceil(daysElapsed - limit);
        const dailyPenalty = sla.farePrice * sla.dailyPenaltyCount;

        return {
          id: f.id,
          workOrderNo: f.workOrderNo,
          formNo: f.formNo,
          status: f.status,
          priority: f.priority,
          municipalityId: f.municipalityId,
          municipalityName: f.municipality.name,
          assignedAt: f.assignedAt,
          overdueDays,
          totalPenalty: overdueDays * dailyPenalty,
          dailyPenalty,
        };
      });

    res.json(violations);
  } catch (err) { next(err); }
}

function getPriorityResolutionDays(priority: string, sla: any): number {
  switch (priority) {
    case 'urgent': return sla.urgentResolutionDays;
    case 'high': return sla.highResolutionDays;
    case 'normal': return sla.normalResolutionDays;
    case 'low': return sla.lowResolutionDays;
    default: return sla.normalResolutionDays;
  }
}

export async function addSlaEmailRecipient(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { email, name } = z.object({ email: z.string().email(), name: z.string().optional() }).parse(req.body);
    const { definitionId } = req.params;

    const item = await prisma.slaEmailRecipient.create({
      data: { slaDefinitionId: definitionId, email, name },
    });
    res.status(201).json(item);
  } catch (err) { next(err); }
}

export async function removeSlaEmailRecipient(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await prisma.slaEmailRecipient.delete({ where: { id: req.params.recipientId } });
    res.json({ message: 'Alıcı kaldırıldı.' });
  } catch (err) { next(err); }
}
