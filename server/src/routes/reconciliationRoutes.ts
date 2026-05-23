import { Router } from 'express';
import { triggerReconciliation } from '../controllers/reconciliationController.js';
import { getReport, getSummary, getUnmatchedRecords } from '../controllers/reportController.js';

const router = Router();

router.post('/reconcile', triggerReconciliation);
router.get('/report/:runId', getReport);
router.get('/report/:runId/summary', getSummary);
router.get('/report/:runId/unmatched', getUnmatchedRecords);

export default router;
