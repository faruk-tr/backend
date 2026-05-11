import { Router } from 'express';
import authRoutes from './auth.routes';
import userRoutes from './users.routes';
import faultRoutes from './faults.routes';
import assetRoutes from './assets.routes';
import definitionRoutes from './definitions.routes';
import slaRoutes from './sla.routes';
import notificationRoutes from './notifications.routes';
import reportRoutes from './reports.routes';

export const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/faults', faultRoutes);
router.use('/assets', assetRoutes);
router.use('/definitions', definitionRoutes);
router.use('/sla', slaRoutes);
router.use('/notifications', notificationRoutes);
router.use('/reports', reportRoutes);
