import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import type { GetReportsQuery, UpsertChronicConfigRequest } from './reports.schemas';

export interface ReportFilters {
  municipalityId?: string;
  operatorId?: string;
  startDate?: string;
  endDate?: string;
}

export interface UserContext {
  role: string;
  municipalityId?: string | null;
  operatorId?: string | null;
}

function buildFaultWhereClause(filters: ReportFilters, user: UserContext): Prisma.FaultWhereInput {
  const where: Prisma.FaultWhereInput = {};

  // Apply role-based filtering
  if (user.role === 'municipality' && user.municipalityId) {
    where.municipalityId = user.municipalityId;
  } else if (user.role === 'operator' && user.operatorId) {
    where.operatorId = user.operatorId;
  } else {
    if (filters.municipalityId) where.municipalityId = filters.municipalityId;
    if (filters.operatorId) where.operatorId = filters.operatorId;
  }

  // Apply date range
  if (filters.startDate || filters.endDate) {
    where.reportedAt = {};
    if (filters.startDate) where.reportedAt.gte = new Date(filters.startDate);
    if (filters.endDate) where.reportedAt.lte = new Date(filters.endDate);
  }

  return where;
}

export async function getReportsSummary(filters: ReportFilters, user: UserContext) {
  const where = buildFaultWhereClause(filters, user);

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

    // Monthly trend (last 12 months)
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
    const month = fault.reportedAt.toISOString().slice(0, 7);
    monthlyMap.set(month, (monthlyMap.get(month) || 0) + 1);
  }
  const monthlyTrendGrouped = Array.from(monthlyMap.entries())
    .map(([month, count]) => ({ month, count }))
    .sort((a, b) => a.month.localeCompare(b.month));

  const solved = statusCounts.find((s) => s.status === 'closed')?._count || 0;
  const inWarranty = warrantyBreakdown.find((w) => w.warrantyScope === 'in_warranty')?._count || 0;
  const warrantyRate = totalFaults > 0 ? Math.round((inWarranty / totalFaults) * 100) : 0;

  return {
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
  };
}

export async function getDashboardStats(user: UserContext) {
  const faultWhere: Prisma.FaultWhereInput = {};
  const assetWhere: Prisma.AssetWhereInput = {};

  if (user.role === 'municipality' && user.municipalityId) {
    faultWhere.municipalityId = user.municipalityId;
    assetWhere.municipalityId = user.municipalityId;
  } else if (user.role === 'operator' && user.operatorId) {
    faultWhere.operatorId = user.operatorId;
  }

  const [
    faultStatusCounts,
    assetStatusCounts,
    recentFaults,
    slaViolationCount,
  ] = await Promise.all([
    prisma.fault.groupBy({ by: ['status'], where: faultWhere, _count: true }),
    prisma.asset.groupBy({ by: ['status'], where: assetWhere, _count: true }),
    prisma.fault.findMany({
      where: faultWhere,
      orderBy: { reportedAt: 'desc' },
      take: 5,
      include: {
        municipality: { select: { id: true, name: true } },
        orderType: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, name: true } },
      },
    }),
    prisma.fault.count({
      where: {
        ...faultWhere,
        status: { notIn: ['closed', 'cancelled'] },
        assignedAt: { lt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000) },
      },
    }),
  ]);

  return {
    faults: {
      byStatus: Object.fromEntries(faultStatusCounts.map((s) => [s.status, s._count])),
      slaViolations: slaViolationCount,
      recent: recentFaults,
    },
    assets: {
      byStatus: Object.fromEntries(assetStatusCounts.map((s) => [s.status, s._count])),
      total: assetStatusCounts.reduce((sum, s) => sum + s._count, 0),
    },
  };
}

export async function getChronicFaults() {
  const configs = await prisma.chronicFaultConfig.findMany({
    where: { active: true },
    include: { assetType: true },
  });

  const results = [];

  for (const config of configs) {
    const periodStart = new Date(Date.now() - config.periodDays * 24 * 60 * 60 * 1000);

    const assets = await prisma.asset.findMany({
      where: { assetTypeId: config.assetTypeId },
      include: {
        municipality: { select: { id: true, name: true } },
        assetType: true,
        _count: { select: { faults: true } },
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

  return results;
}

export async function getChronicConfigs() {
  return prisma.chronicFaultConfig.findMany({
    include: { assetType: true },
  });
}

export async function upsertChronicConfig(data: UpsertChronicConfigRequest) {
  return prisma.chronicFaultConfig.upsert({
    where: { assetTypeId: data.assetTypeId },
    update: { thresholdCount: data.thresholdCount, periodDays: data.periodDays },
    create: data as Prisma.ChronicFaultConfigCreateInput,
    include: { assetType: true },
  });
}
