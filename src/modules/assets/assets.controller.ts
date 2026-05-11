import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { getPaginationParams, paginate } from '../../utils/pagination';
import * as AssetsService from './assets.service';
import * as StockService from './stock.service';
import {
  CreateAssetSchema,
  UpdateAssetSchema,
  GetAssetsQuerySchema,
  MoveAssetSchema,
  RequestScrapSchema,
  GetStockMovementsQuerySchema,
} from './assets.schemas';

export async function getAssets(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { page, limit } = getPaginationParams(req.query);

    const parsed = GetAssetsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid query parameters' });
    }

    const user = {
      id: req.user!.id,
      role: req.user!.role,
      municipalityId: req.user!.municipalityId,
    };

    const { assets, total } = await AssetsService.getAssets(parsed.data, user, page, limit);
    res.json(paginate(assets, total, { page, limit }));
  } catch (err) {
    next(err);
  }
}

export async function getAssetById(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const asset = await AssetsService.getAssetById(req.params.id);
    res.json(asset);
  } catch (err) {
    next(err);
  }
}

export async function getAssetBySerialNo(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const asset = await AssetsService.getAssetBySerialNo(req.params.serialNo);
    res.json(asset);
  } catch (err) {
    next(err);
  }
}

export async function createAsset(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = CreateAssetSchema.parse(req.body);
    const asset = await AssetsService.createAsset(data, req.user!.id);
    res.status(201).json(asset);
  } catch (err) {
    next(err);
  }
}

export async function updateAsset(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = UpdateAssetSchema.parse(req.body);
    const asset = await AssetsService.updateAsset(req.params.id, data);
    res.json(asset);
  } catch (err) {
    next(err);
  }
}

export async function getAssetStats(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const user = {
      id: req.user!.id,
      role: req.user!.role,
      municipalityId: req.user!.municipalityId,
    };
    const stats = await AssetsService.getAssetStats(user);
    res.json(stats);
  } catch (err) {
    next(err);
  }
}

// ─── Stock ───────────────────────────────────────────────────────────────────

export async function moveAsset(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = MoveAssetSchema.parse(req.body);
    await StockService.moveAsset(req.params.id, data, req.user!.id);
    res.json({ message: 'Varlık taşındı.' });
  } catch (err) {
    next(err);
  }
}

export async function requestScrap(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = RequestScrapSchema.parse(req.body);
    await StockService.requestScrap(req.params.id, data);
    res.json({ message: 'Hurda talebi oluşturuldu.' });
  } catch (err) {
    next(err);
  }
}

export async function approveScrap(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await StockService.approveScrap(req.params.id);
    res.json({ message: 'Hurda onaylandı.' });
  } catch (err) {
    next(err);
  }
}

export async function getStockMovements(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { page, limit } = getPaginationParams(req.query);

    const parsed = GetStockMovementsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid query parameters' });
    }

    const { movements, total } = await StockService.getStockMovements(parsed.data, page, limit);
    res.json(paginate(movements, total, { page, limit }));
  } catch (err) {
    next(err);
  }
}
