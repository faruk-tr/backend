import { Router } from 'express';
import {
  getMunicipalities, getMunicipalityById, createMunicipality, updateMunicipality, deleteMunicipality,
  getOperators, getOperatorById, createOperator, updateOperator, deleteOperator,
  getAssetTypes, createAssetType, updateAssetType, deleteAssetType,
  getOrderTypes, createOrderType, updateOrderType, deleteOrderType,
  getCargoCompanies, createCargoCompany, updateCargoCompany, deleteCargoCompany,
} from '../controllers/definitions.controller';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// Municipalities
router.get('/municipalities', getMunicipalities);
router.get('/municipalities/:id', getMunicipalityById);
router.post('/municipalities', requireRole('admin'), createMunicipality);
router.put('/municipalities/:id', requireRole('admin'), updateMunicipality);
router.delete('/municipalities/:id', requireRole('admin'), deleteMunicipality);

// Operators
router.get('/operators', getOperators);
router.get('/operators/:id', getOperatorById);
router.post('/operators', requireRole('admin'), createOperator);
router.put('/operators/:id', requireRole('admin'), updateOperator);
router.delete('/operators/:id', requireRole('admin'), deleteOperator);

// Asset Types
router.get('/asset-types', getAssetTypes);
router.post('/asset-types', requireRole('admin'), createAssetType);
router.put('/asset-types/:id', requireRole('admin'), updateAssetType);
router.delete('/asset-types/:id', requireRole('admin'), deleteAssetType);

// Order Types
router.get('/order-types', getOrderTypes);
router.post('/order-types', requireRole('admin'), createOrderType);
router.put('/order-types/:id', requireRole('admin'), updateOrderType);
router.delete('/order-types/:id', requireRole('admin'), deleteOrderType);

// Cargo Companies
router.get('/cargo-companies', getCargoCompanies);
router.post('/cargo-companies', requireRole('admin'), createCargoCompany);
router.put('/cargo-companies/:id', requireRole('admin'), updateCargoCompany);
router.delete('/cargo-companies/:id', requireRole('admin'), deleteCargoCompany);

export default router;
