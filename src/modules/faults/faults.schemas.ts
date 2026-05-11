import { z } from 'zod';

export const CreateFaultSchema = z.object({
  municipalityId: z.string(),
  orderTypeId: z.string().optional(),
  assetId: z.string().optional(),
  assetTypeId: z.string().optional(),
  priority: z.enum(['urgent', 'high', 'normal', 'low']).default('normal'),
  warrantyScope: z.enum(['in_warranty', 'out_of_warranty']).default('out_of_warranty'),
  description: z.string().min(20, 'Açıklama en az 20 karakter olmalı.'),
  reportedAt: z.string().optional(),
});

export type CreateFaultRequest = z.infer<typeof CreateFaultSchema>;

export const UpdateFaultSchema = z.object({
  priority: z.enum(['urgent', 'high', 'normal', 'low']).optional(),
  warrantyScope: z.enum(['in_warranty', 'out_of_warranty']).optional(),
  description: z.string().min(20).optional(),
  orderTypeId: z.string().optional().nullable(),
  assetId: z.string().optional().nullable(),
});

export type UpdateFaultRequest = z.infer<typeof UpdateFaultSchema>;

export const UpdateStatusSchema = z.object({
  status: z.enum(['approved', 'assigned', 'repaired', 'shipped', 'delivered', 'closed', 'cancelled']),
  notes: z.string().optional(),
  operatorId: z.string().optional(),
  assignedToId: z.string().optional(),
  assignmentNotes: z.string().optional(),
  cargoCompanyId: z.string().optional(),
  cargoTrackingNo: z.string().optional(),
  cancelReason: z.string().optional(),
});

export type UpdateStatusRequest = z.infer<typeof UpdateStatusSchema>;

export const AssignFaultSchema = z.object({
  operatorId: z.string(),
  assignedToId: z.string().optional(),
  assignmentNotes: z.string().optional(),
});

export type AssignFaultRequest = z.infer<typeof AssignFaultSchema>;

export const GetFaultsQuerySchema = z.object({
  search: z.string().optional(),
  status: z.enum(['new', 'approved', 'assigned', 'repaired', 'shipped', 'delivered', 'closed', 'cancelled']).optional(),
  priority: z.enum(['urgent', 'high', 'normal', 'low']).optional(),
  municipalityId: z.string().optional(),
  operatorId: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  slaViolation: z.string().optional(),
});

export type GetFaultsQuery = z.infer<typeof GetFaultsQuerySchema>;
