import { randomInt } from 'node:crypto';
import { prisma } from '../lib/prisma';

/**
 * Generates a work order number: IE-YYYY-XXXXX (e.g., IE-2026-00001)
 */
export async function generateWorkOrderNo(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `IE-${year}-`;

  const last = await prisma.fault.findFirst({
    where: { workOrderNo: { startsWith: prefix } },
    orderBy: { workOrderNo: 'desc' },
    select: { workOrderNo: true },
  });

  let seq = 1;
  if (last) {
    const parts = last.workOrderNo.split('-');
    seq = parseInt(parts[2] || '0', 10) + 1;
  }

  return `${prefix}${String(seq).padStart(5, '0')}`;
}

/**
 * Generates a form number: PPYYYYNNNNN (11 chars)
 * PP = city plate code, YYYY = year, NNNNN = sequence
 */
export async function generateFormNo(plateCode: string): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `${plateCode}${year}`;

  const last = await prisma.fault.findFirst({
    where: { formNo: { startsWith: prefix } },
    orderBy: { formNo: 'desc' },
    select: { formNo: true },
  });

  let seq = 1;
  if (last) {
    const seqStr = last.formNo.slice(-5);
    seq = parseInt(seqStr, 10) + 1;
  }

  return `${prefix}${String(seq).padStart(5, '0')}`;
}

/**
 * Generates a user code: 12-digit padded number
 */
export async function generateUserCode(): Promise<string> {
  const last = await prisma.user.findFirst({
    orderBy: { userCode: 'desc' },
    select: { userCode: true },
  });

  let seq = 1;
  if (last) {
    seq = parseInt(last.userCode, 10) + 1;
  }

  return String(seq).padStart(12, '0');
}

/**
 * Generates a cryptographically secure random 6-digit OTP code.
 * Uses node:crypto instead of Math.random() to prevent predictability.
 */
export function generateOtpCode(): string {
  return String(randomInt(100000, 999999));
}
