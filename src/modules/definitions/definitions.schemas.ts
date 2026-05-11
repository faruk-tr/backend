import { z } from 'zod';

// ─── Municipalities ───────────────────────────────────────────────────────────

export const MunicipalitySchema = z.object({
  name: z.string().min(2),
  code: z.string().min(2),
  city: z.string().min(2),
  district: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  address: z.string().optional(),
  logo: z.string().optional(),
  active: z.boolean().optional(),
});

export type MunicipalityRequest = z.infer<typeof MunicipalitySchema>;

export const GetMunicipalitiesQuerySchema = z.object({
  search: z.string().optional(),
  active: z.enum(['true', 'false']).optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
});

export type GetMunicipalitiesQuery = z.infer<typeof GetMunicipalitiesQuerySchema>;

// ─── Operators ────────────────────────────────────────────────────────────────

export const OperatorSchema = z.object({
  name: z.string().min(2),
  code: z.string().min(2),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  address: z.string().optional(),
  active: z.boolean().optional(),
  municipalityIds: z.array(z.string()).optional(),
});

export type OperatorRequest = z.infer<typeof OperatorSchema>;

export const GetOperatorsQuerySchema = z.object({
  search: z.string().optional(),
  active: z.enum(['true', 'false']).optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
});

export type GetOperatorsQuery = z.infer<typeof GetOperatorsQuerySchema>;

// ─── Asset Types ──────────────────────────────────────────────────────────────

export const AssetTypeSchema = z.object({
  name: z.string().min(2),
  code: z.string().min(2),
  icon: z.string().optional(),
  active: z.boolean().optional(),
});

export type AssetTypeRequest = z.infer<typeof AssetTypeSchema>;

// ─── Order Types ──────────────────────────────────────────────────────────────

export const OrderTypeSchema = z.object({
  name: z.string().min(2),
  code: z.string().min(2),
  active: z.boolean().optional(),
});

export type OrderTypeRequest = z.infer<typeof OrderTypeSchema>;

// ─── Cargo Companies ──────────────────────────────────────────────────────────

export const CargoCompanySchema = z.object({
  name: z.string().min(2),
  code: z.string().min(2),
  trackingUrl: z.string().url().optional().or(z.literal('')),
  active: z.boolean().optional(),
});

export type CargoCompanyRequest = z.infer<typeof CargoCompanySchema>;
