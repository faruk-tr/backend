import { Router } from 'express';
import {
  getUsers, getUserById, createUser, updateUser, deleteUser,
  getUserPermissions, updateUserPermissions,
  getUserMenuPermissions, updateUserMenuPermissions,
  resetUserPassword,
} from '../controllers/users.controller';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', requireRole('admin', 'municipality'), getUsers);
router.post('/', requireRole('admin'), createUser);

router.get('/:id', getUserById);
router.put('/:id', requireRole('admin'), updateUser);
router.delete('/:id', requireRole('admin'), deleteUser);

router.get('/:id/permissions', getUserPermissions);
router.put('/:id/permissions', requireRole('admin'), updateUserPermissions);

router.get('/:id/menu-permissions', getUserMenuPermissions);
router.put('/:id/menu-permissions', requireRole('admin'), updateUserMenuPermissions);

router.post('/:id/reset-password', requireRole('admin'), resetUserPassword);

export default router;
