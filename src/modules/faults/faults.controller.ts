import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { getPaginationParams, paginate } from '../../utils/pagination';
import * as FaultsService from './faults.service';
import {
  CreateFaultSchema,
  UpdateFaultSchema,
  UpdateStatusSchema,
  GetFaultsQuerySchema,
} from './faults.schemas';

export async function getFaults(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { page, limit } = getPaginationParams(req.query);

    const parsed = GetFaultsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid query parameters' });
    }

    const user = {
      id: req.user!.id,
      role: req.user!.role,
      municipalityId: req.user!.municipalityId,
      operatorId: req.user!.operatorId,
    };

    const { faults, total } = await FaultsService.getFaults(parsed.data, user, page, limit);
    res.json(paginate(faults, total, { page, limit }));
  } catch (err) {
    next(err);
  }
}

export async function getFaultById(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const fault = await FaultsService.getFaultById(req.params.id);
    res.json(fault);
  } catch (err) {
    next(err);
  }
}

export async function createFault(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = CreateFaultSchema.parse(req.body);
    const fault = await FaultsService.createFault(data, req.user!.id);
    res.status(201).json(fault);
  } catch (err) {
    next(err);
  }
}

export async function updateFault(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = UpdateFaultSchema.parse(req.body);
    const fault = await FaultsService.updateFault(req.params.id, data);
    res.json(fault);
  } catch (err) {
    next(err);
  }
}

export async function changeFaultStatus(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = UpdateStatusSchema.parse(req.body);
    const fault = await FaultsService.changeFaultStatus(req.params.id, data, req.user!.id);
    res.json(fault);
  } catch (err) {
    next(err);
  }
}

export async function deleteFault(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await FaultsService.deleteFault(req.params.id);
    res.json({ message: 'Arıza kaydı silindi.' });
  } catch (err) {
    next(err);
  }
}

export async function getFaultStats(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const user = {
      id: req.user!.id,
      role: req.user!.role,
      municipalityId: req.user!.municipalityId,
      operatorId: req.user!.operatorId,
    };
    const stats = await FaultsService.getFaultStats(user);
    res.json(stats);
  } catch (err) {
    next(err);
  }
}
