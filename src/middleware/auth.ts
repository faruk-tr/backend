import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { prisma } from '../lib/prisma';
import { AppError } from './errorHandler';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    role: string;
    permissions: string[];
    municipalityId?: string | null;
    operatorId?: string | null;
  };
}

export async function authenticate(
  req: AuthRequest,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new AppError(401, 'Kimlik doğrulama gerekli.', 'UNAUTHORIZED');
    }

    const token = authHeader.slice(7);
    const payload = verifyToken(token);

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: { permissions: true },
    });

    if (!user || !user.active) {
      throw new AppError(401, 'Geçersiz oturum. Lütfen tekrar giriş yapın.', 'INVALID_SESSION');
    }

    req.user = {
      id: user.id,
      role: user.role,
      permissions: user.permissions.map((p) => p.permission),
      municipalityId: user.municipalityId,
      operatorId: user.operatorId,
    };

    next();
  } catch (err) {
    next(err);
  }
}

export function requirePermission(...permissions: string[]) {
  return (req: AuthRequest, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError(401, 'Kimlik doğrulama gerekli.', 'UNAUTHORIZED'));
    }

    const isAdmin = req.user.role === 'admin';
    const hasPermission = permissions.some((p) => req.user!.permissions.includes(p));

    if (!isAdmin && !hasPermission) {
      return next(new AppError(403, 'Bu işlem için yetkiniz yok.', 'FORBIDDEN'));
    }

    next();
  };
}

export function requireRole(...roles: string[]) {
  return (req: AuthRequest, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError(401, 'Kimlik doğrulama gerekli.', 'UNAUTHORIZED'));
    }
    if (!roles.includes(req.user.role)) {
      return next(new AppError(403, 'Bu işlem için yetkiniz yok.', 'FORBIDDEN'));
    }
    next();
  };
}
