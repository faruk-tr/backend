import { Router } from 'express';
import {
  getAssets, getAssetById, getAssetBySerialNo, createAsset, updateAsset, getAssetStats,
  moveAsset, requestScrap, approveScrap, getStockMovements,
} from '../controllers/assets.controller';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/stats', getAssetStats);
router.get('/serial/:serialNo', getAssetBySerialNo);
router.get('/stock/movements', getStockMovements);
router.get('/', getAssets);
router.post('/', requireRole('admin'), createAsset);

router.get('/:id', getAssetById);
router.put('/:id', requireRole('admin'), updateAsset);

router.post('/:id/move', moveAsset);
router.post('/:id/scrap-request', requestScrap);
router.post('/:id/scrap-approve', requireRole('admin'), approveScrap);

export default router;
