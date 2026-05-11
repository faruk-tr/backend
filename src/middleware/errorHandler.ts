import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { config } from '../config';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public code?: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // Zod validation errors
  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'Doğrulama hatası',
      details: err.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    });
    return;
  }

  // Application errors
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.message,
      code: err.code,
    });
    return;
  }

  // Prisma unique constraint
  if ((err as any).code === 'P2002') {
    const field = (err as any).meta?.target?.[0] || 'alan';
    res.status(409).json({ error: `Bu ${field} zaten kullanımda.` });
    return;
  }

  // Prisma record not found
  if ((err as any).code === 'P2025') {
    res.status(404).json({ error: 'Kayıt bulunamadı.' });
    return;
  }

  // Generic error — only log the error message, never the full stack in production
  console.error('Unexpected error:', config.isDev ? err : err.message);
  res.status(500).json({
    error: 'Sunucu hatası oluştu.',
    ...(config.isDev && { details: err.message, stack: err.stack }),
  });
}
