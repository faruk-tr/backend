import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { GetReportsQuerySchema, UpsertChronicConfigSchema } from './reports.schemas';
import {
  getReportsSummary,
  getDashboardStats,
  getChronicFaults,
  getChronicConfigs,
  upsertChronicConfig,
} from './reports.service';

export async function getReports(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const parsed = GetReportsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid query parameters' });
    }

    const user = {
      role: req.user!.role,
      municipalityId: req.user!.municipalityId,
      operatorId: req.user!.operatorId,
    };

    const result = await getReportsSummary(parsed.data, user);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getDashboardStatsHandler(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const user = {
      role: req.user!.role,
      municipalityId: req.user!.municipalityId,
      operatorId: req.user!.operatorId,
    };

    const result = await getDashboardStats(user);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getChronicFaultsHandler(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const result = await getChronicFaults();
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getChronicConfigsHandler(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const result = await getChronicConfigs();
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function upsertChronicConfigHandler(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = UpsertChronicConfigSchema.parse(req.body);
    const result = await upsertChronicConfig(data);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
