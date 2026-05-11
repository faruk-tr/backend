import { Router } from 'express';
import {
  getNotifications, markAsRead, markAllAsRead, deleteNotification,
} from '../controllers/notifications.controller';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/', getNotifications);
router.patch('/read-all', markAllAsRead);
router.patch('/:id/read', markAsRead);
router.delete('/:id', deleteNotification);

export default router;
