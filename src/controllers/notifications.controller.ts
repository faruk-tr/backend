import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middleware/auth';
import { getPaginationParams, paginate } from '../utils/pagination';

export async function getNotifications(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { page, limit } = getPaginationParams(req.query);
    const { read } = req.query as any;

    const where: any = { userId: req.user!.id };
    if (read !== undefined) where.read = read === 'true';

    const [total, items] = await Promise.all([
      prisma.notification.count({ where }),
      prisma.notification.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const unreadCount = await prisma.notification.count({
      where: { userId: req.user!.id, read: false },
    });

    res.json({ ...paginate(items, total, { page, limit }), unreadCount });
  } catch (err) { next(err); }
}

export async function markAsRead(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await prisma.notification.updateMany({
      where: { id: req.params.id, userId: req.user!.id },
      data: { read: true, readAt: new Date() },
    });
    res.json({ message: 'Bildirim okundu olarak işaretlendi.' });
  } catch (err) { next(err); }
}

export async function markAllAsRead(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user!.id, read: false },
      data: { read: true, readAt: new Date() },
    });
    res.json({ message: 'Tüm bildirimler okundu olarak işaretlendi.' });
  } catch (err) { next(err); }
}

export async function deleteNotification(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await prisma.notification.deleteMany({
      where: { id: req.params.id, userId: req.user!.id },
    });
    res.json({ message: 'Bildirim silindi.' });
  } catch (err) { next(err); }
}
