import { z } from 'zod';

export const CreateAssetSchema = z.object({
  serialNo: z.string().min(1),
  macAddress: z.string().optional(),
  simNo: z.string().optional(),
  samNo: z.string().optional(),
  assetTypeId: z.string(),
  municipalityId: z.string().optional(),
  status: z.enum(['active', 'faulty', 'in_repair', 'scrapped', 'in_stock']).default('in_stock'),
  depotType: z.enum(['field', 'ptt_depot', 'supplier_depot']).default('ptt_depot'),
  notes: z.string().optional(),
});

export type CreateAssetRequest = z.infer<typeof CreateAssetSchema>;

export const UpdateAssetSchema = z.object({
  status: z.enum(['active', 'faulty', 'in_repair', 'scrapped', 'in_stock']).optional(),
  depotType: z.enum(['field', 'ptt_depot', 'supplier_depot']).optional(),
  municipalityId: z.string().optional().nullable(),
  notes: z.string().optional(),
});

export type UpdateAssetRequest = z.infer<typeof UpdateAssetSchema>;

export const GetAssetsQuerySchema = z.object({
  search: z.string().optional(),
  status: z.enum(['active', 'faulty', 'in_repair', 'scrapped', 'in_stock']).optional(),
  municipalityId: z.string().optional(),
  assetTypeId: z.string().optional(),
  depotType: z.enum(['field', 'ptt_depot', 'supplier_depot']).optional(),
});

export type GetAssetsQuery = z.infer<typeof GetAssetsQuerySchema>;

export const MoveAssetSchema = z.object({
  toDepot: z.enum(['field', 'ptt_depot', 'supplier_depot']),
  notes: z.string().optional(),
  faultId: z.string().optional(),
});

export type MoveAssetRequest = z.infer<typeof MoveAssetSchema>;

export const RequestScrapSchema = z.object({
  notes: z.string().optional(),
});

export type RequestScrapRequest = z.infer<typeof RequestScrapSchema>;

export const GetStockMovementsQuerySchema = z.object({
  assetId: z.string().optional(),
});

export type GetStockMovementsQuery = z.infer<typeof GetStockMovementsQuerySchema>;
