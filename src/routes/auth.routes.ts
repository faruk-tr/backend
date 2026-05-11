import { Router } from 'express';
import { login, verifyOtp, changePassword, getMe, logout } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/login', login);
router.post('/verify-otp', verifyOtp);
router.get('/me', authenticate, getMe);
router.post('/change-password', authenticate, changePassword);
router.post('/logout', authenticate, logout);

export default router;
