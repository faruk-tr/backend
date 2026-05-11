import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { LoginSchema, OtpSchema, ChangePasswordSchema } from './auth.schemas';
import { login, verifyOtp, changePassword, getMe, logout } from './auth.service';

export async function loginHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const data = LoginSchema.parse(req.body);
    const result = await login(data, req.ip);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function verifyOtpHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const data = OtpSchema.parse(req.body);
    const result = await verifyOtp(data, req.ip);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function changePasswordHandler(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = ChangePasswordSchema.parse(req.body);
    const result = await changePassword(req.user!.id, data);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getMeHandler(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const result = await getMe(req.user!.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function logoutHandler(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const result = await logout(req.user!.id, req.ip);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
