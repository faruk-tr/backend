import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middleware/auth';
import { Prisma } from '@prisma/client';

const getReportsQuerySchema = z.object({
  municipalityId: z.string().optional(),
  operatorId: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export async function getReports(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const parsed = getReportsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid query parameters' });
    }
    const { municipalityId, operatorId, startDate, endDate } = parsed.data;

    const where: Prisma.FaultWhereInput = {};
    if (req.user!.role === 'municipality' && req.user!.municipalityId) {
      where.municipalityId = req.user!.municipalityId;
    } else if (req.user!.role === 'operator' && req.user!.operatorId) {
      where.operatorId = req.user!.operatorId;
    } else {
      if (municipalityId) where.municipalityId = municipalityId;
      if (operatorId) where.operatorId = operatorId;
    }

    if (startDate || endDate) {
      where.reportedAt = {};
      if (startDate) where.reportedAt.gte = new Date(startDate);
      if (endDate) where.reportedAt.lte = new Date(endDate);
    }

    const [
      totalFaults,
      statusCounts,
      priorityCounts,
      monthlyTrend,
      warrantyBreakdown,
    ] = await Promise.all([
      prisma.fault.count({ where }),

      prisma.fault.groupBy({ by: ['status'], where, _count: true }),

      prisma.fault.groupBy({ by: ['priority'], where, _count: true }),

      // Monthly trend (last 12 months) - using where filters
      prisma.fault.findMany({
        where: {
          ...where,
          reportedAt: {
            ...(where.reportedAt as Prisma.DateTimeFilter || {}),
            gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
          },
        },
        select: { reportedAt: true },
      }),

      prisma.fault.groupBy({ by: ['warrantyScope'], where, _count: true }),
    ]);

    // Calculate avg resolution time manually
    const closedFaults = await prisma.fault.findMany({
      where: { ...where, status: 'closed', closedAt: { not: null }, assignedAt: { not: null } },
      select: { assignedAt: true, closedAt: true },
    });

    let avgDays: number | null = null;
    if (closedFaults.length > 0) {
      const totalDays = closedFaults.reduce((sum, f) => {
        const days = (f.closedAt!.getTime() - f.assignedAt!.getTime()) / (1000 * 60 * 60 * 24);
        return sum + days;
      }, 0);
      avgDays = Math.round((totalDays / closedFaults.length) * 10) / 10;
    }

    // Group monthly trend data by month
    const monthlyMap = new Map<string, number>();
    for (const fault of monthlyTrend) {
      const month = fault.reportedAt.toISOString().slice(0, 7); // YYYY-MM
      monthlyMap.set(month, (monthlyMap.get(month) || 0) + 1);
    }
    const monthlyTrendGrouped = Array.from(monthlyMap.entries())
      .map(([month, count]) => ({ month, count }))
      .sort((a, b) => a.month.localeCompare(b.month));

    const solved = statusCounts.find((s) => s.status === 'closed')?._count || 0;
    const inWarranty = warrantyBreakdown.find((w) => w.warrantyScope === 'in_warranty')?._count || 0;
    const warrantyRate = totalFaults > 0 ? Math.round((inWarranty / totalFaults) * 100) : 0;

    res.json({
      summary: {
        total: totalFaults,
        solved,
        avgResolutionDays: avgDays,
        warrantyRate,
      },
      byStatus: Object.fromEntries(statusCounts.map((s) => [s.status, s._count])),
      byPriority: Object.fromEntries(priorityCounts.map((p) => [p.priority, p._count])),
      monthlyTrend: monthlyTrendGrouped,
      warrantyBreakdown: Object.fromEntries(warrantyBreakdown.map((w) => [w.warrantyScope, w._count])),
    });
  } catch (err) { next(err); }
}

export async function getDashboardStats(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const where: Prisma.FaultWhereInput = {};
    if (req.user!.role === 'municipality' && req.user!.municipalityId) {
      where.municipalityId = req.user!.municipalityId;
    } else if (req.user!.role === 'operator' && req.user!.operatorId) {
      where.operatorId = req.user!.operatorId;
    }

    const assetWhere: Prisma.AssetWhereInput = {};
    if (req.user!.role === 'municipality' && req.user!.municipalityId) {
      assetWhere.municipalityId = req.user!.municipalityId;
    }

    const [
      faultStatusCounts,
      assetStatusCounts,
      recentFaults,
      slaViolationCount,
    ] = await Promise.all([
      prisma.fault.groupBy({ by: ['status'], where, _count: true }),
      prisma.asset.groupBy({ by: ['status'], where: assetWhere, _count: true }),
      prisma.fault.findMany({
        where,
        orderBy: { reportedAt: 'desc' },
        take: 5,
        include: {
          municipality: { select: { id: true, name: true } },
          orderType: { select: { id: true, name: true } },
          assignedTo: { select: { id: true, name: true } },
        },
      }),
      // SLA violations: assigned but not closed within SLA days
      prisma.fault.count({
        where: {
          ...where,
          status: { notIn: ['closed', 'cancelled'] },
          assignedAt: { lt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000) },
        },
      }),
    ]);

    res.json({
      faults: {
        byStatus: Object.fromEntries(faultStatusCounts.map((s) => [s.status, s._count])),
        slaViolations: slaViolationCount,
        recent: recentFaults,
      },
      assets: {
        byStatus: Object.fromEntries(assetStatusCounts.map((s) => [s.status, s._count])),
        total: assetStatusCounts.reduce((sum, s) => sum + s._count, 0),
      },
    });
  } catch (err) { next(err); }
}

export async function getChronicFaults(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const configs = await prisma.chronicFaultConfig.findMany({
      where: { active: true },
      include: { assetType: true },
    });

    const results = [];

    for (const config of configs) {
      const periodStart = new Date(Date.now() - config.periodDays * 24 * 60 * 60 * 1000);

      // Find assets with fault count >= threshold in period
      const assets = await prisma.asset.findMany({
        where: { assetTypeId: config.assetTypeId },
        include: {
          municipality: { select: { id: true, name: true } },
          assetType: true,
          _count: {
            select: {
              faults: true, // simplified; ideally filtered by date
            },
          },
        },
      });

      for (const asset of assets) {
        const faultCount = await prisma.fault.count({
          where: {
            assetId: asset.id,
            reportedAt: { gte: periodStart },
          },
        });

        if (faultCount >= config.thresholdCount) {
          results.push({
            asset: {
              id: asset.id,
              serialNo: asset.serialNo,
              status: asset.status,
              assetType: asset.assetType,
              municipality: asset.municipality,
            },
            faultCount,
            threshold: config.thresholdCount,
            periodDays: config.periodDays,
          });
        }
      }
    }

    res.json(results);
  } catch (err) { next(err); }
}

export async function getChronicConfigs(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const items = await prisma.chronicFaultConfig.findMany({
      include: { assetType: true },
    });
    res.json(items);
  } catch (err) { next(err); }
}

const upsertChronicConfigSchema = z.object({
  assetTypeId: z.string(),
  thresholdCount: z.number().int().positive(),
  periodDays: z.number().int().positive(),
});

export async function upsertChronicConfig(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { assetTypeId, thresholdCount, periodDays } = upsertChronicConfigSchema.parse(req.body);

    const item = await prisma.chronicFaultConfig.upsert({
      where: { assetTypeId },
      update: { thresholdCount, periodDays },
      create: { assetTypeId, thresholdCount, periodDays },
      include: { assetType: true },
    });
    res.json(item);
  } catch (err) { next(err); }
}
