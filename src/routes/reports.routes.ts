import { Router } from 'express';
import {
  getReports, getDashboardStats, getChronicFaults, getChronicConfigs, upsertChronicConfig,
} from '../controllers/reports.controller';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/dashboard', getDashboardStats);
router.get('/', getReports);
router.get('/chronic', getChronicFaults);
router.get('/chronic/configs', getChronicConfigs);
router.put('/chronic/configs', requireRole('admin'), upsertChronicConfig);

export default router;
