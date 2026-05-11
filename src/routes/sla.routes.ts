import { Router } from 'express';
import {
  getSlaDefinitions, getSlaDefinitionByMunicipality, upsertSlaDefinition,
  getSlaViolations, addSlaEmailRecipient, removeSlaEmailRecipient,
} from '../controllers/sla.controller';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/', getSlaDefinitions);
router.get('/violations', getSlaViolations);
router.get('/municipality/:municipalityId', getSlaDefinitionByMunicipality);
router.put('/municipality/:municipalityId', requireRole('admin'), upsertSlaDefinition);

router.post('/definition/:definitionId/recipients', requireRole('admin'), addSlaEmailRecipient);
router.delete('/definition/:definitionId/recipients/:recipientId', requireRole('admin'), removeSlaEmailRecipient);

export default router;
