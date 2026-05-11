import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { getPaginationParams } from '../../utils/pagination';
import {
  GetMunicipalitiesQuerySchema,
  MunicipalitySchema,
  GetOperatorsQuerySchema,
  OperatorSchema,
  AssetTypeSchema,
  OrderTypeSchema,
  CargoCompanySchema,
} from './definitions.schemas';
import {
  listMunicipalities,
  getMunicipalityById,
  createMunicipality,
  updateMunicipality,
  deleteMunicipality,
  listOperators,
  getOperatorById,
  createOperator,
  updateOperator,
  deleteOperator,
  listAssetTypes,
  createAssetType,
  updateAssetType,
  deleteAssetType,
  listOrderTypes,
  createOrderType,
  updateOrderType,
  deleteOrderType,
  listCargoCompanies,
  createCargoCompany,
  updateCargoCompany,
  deleteCargoCompany,
} from './definitions.service';

// ─── Municipalities ───────────────────────────────────────────────────────────

export async function getMunicipalities(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const pagination = getPaginationParams(req.query);
    const parsed = GetMunicipalitiesQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid query parameters' });
    }
    const result = await listMunicipalities(parsed.data, pagination);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getMunicipalityByIdHandler(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const result = await getMunicipalityById(req.params.id as string);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function createMunicipalityHandler(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = MunicipalitySchema.parse(req.body);
    const result = await createMunicipality(data);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

export async function updateMunicipalityHandler(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = MunicipalitySchema.partial().parse(req.body);
    const result = await updateMunicipality(req.params.id as string, data);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function deleteMunicipalityHandler(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const result = await deleteMunicipality(req.params.id as string);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

// ─── Operators ────────────────────────────────────────────────────────────────

export async function getOperators(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const pagination = getPaginationParams(req.query);
    const parsed = GetOperatorsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid query parameters' });
    }
    const result = await listOperators(parsed.data, pagination);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getOperatorByIdHandler(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const result = await getOperatorById(req.params.id as string);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function createOperatorHandler(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = OperatorSchema.parse(req.body);
    const result = await createOperator(data);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

export async function updateOperatorHandler(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = OperatorSchema.partial().parse(req.body);
    const result = await updateOperator(req.params.id as string, data);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function deleteOperatorHandler(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const result = await deleteOperator(req.params.id as string);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

// ─── Asset Types ──────────────────────────────────────────────────────────────

export async function getAssetTypes(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const result = await listAssetTypes();
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function createAssetTypeHandler(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = AssetTypeSchema.parse(req.body);
    const result = await createAssetType(data);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

export async function updateAssetTypeHandler(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = AssetTypeSchema.partial().parse(req.body);
    const result = await updateAssetType(req.params.id as string, data);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function deleteAssetTypeHandler(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const result = await deleteAssetType(req.params.id as string);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

// ─── Order Types ──────────────────────────────────────────────────────────────

export async function getOrderTypes(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const result = await listOrderTypes();
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function createOrderTypeHandler(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = OrderTypeSchema.parse(req.body);
    const result = await createOrderType(data);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

export async function updateOrderTypeHandler(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = OrderTypeSchema.partial().parse(req.body);
    const result = await updateOrderType(req.params.id as string, data);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function deleteOrderTypeHandler(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const result = await deleteOrderType(req.params.id as string);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

// ─── Cargo Companies ──────────────────────────────────────────────────────────

export async function getCargoCompanies(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const result = await listCargoCompanies();
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function createCargoCompanyHandler(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = CargoCompanySchema.parse(req.body);
    const result = await createCargoCompany(data);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

export async function updateCargoCompanyHandler(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = CargoCompanySchema.partial().parse(req.body);
    const result = await updateCargoCompany(req.params.id as string, data);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function deleteCargoCompanyHandler(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const result = await deleteCargoCompany(req.params.id as string);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
