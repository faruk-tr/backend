import { Router } from 'express';
import {
  getFaults, getFaultById, createFault, updateFault,
  changeFaultStatus, deleteFault, getFaultStats,
} from '../controllers/faults.controller';
import { authenticate, requirePermission } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/stats', getFaultStats);
router.get('/', requirePermission('faults.view'), getFaults);
router.post('/', requirePermission('faults.create'), createFault);

router.get('/:id', requirePermission('faults.view'), getFaultById);
router.put('/:id', requirePermission('faults.edit'), updateFault);
router.patch('/:id/status', requirePermission('faults.change_status'), changeFaultStatus);
router.delete('/:id', requirePermission('faults.delete'), deleteFault);

export default router;
