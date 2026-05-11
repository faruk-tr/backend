import { z } from 'zod';

export const GetReportsQuerySchema = z.object({
  municipalityId: z.string().optional(),
  operatorId: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export type GetReportsQuery = z.infer<typeof GetReportsQuerySchema>;

export const UpsertChronicConfigSchema = z.object({
  assetTypeId: z.string(),
  thresholdCount: z.number().int().positive(),
  periodDays: z.number().int().positive(),
});

export type UpsertChronicConfigRequest = z.infer<typeof UpsertChronicConfigSchema>;
