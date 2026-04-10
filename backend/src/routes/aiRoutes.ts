import { Router } from 'express';
import { aiController } from '../controllers/aiController';

const router = Router();

// Non-streaming (legacy)
router.post('/categorize', (req, res, next) => aiController.categorize(req, res, next));
router.post('/decompose', (req, res, next) => aiController.decompose(req, res, next));
router.post('/priority', (req, res, next) => aiController.priority(req, res, next));
router.post('/workload-summary', (req, res, next) => aiController.workloadSummary(req, res, next));

// SSE streaming
router.post('/stream/categorize', (req, res) => aiController.streamCategorize(req, res));
router.post('/stream/decompose', (req, res) => aiController.streamDecompose(req, res));
router.post('/stream/priority', (req, res) => aiController.streamPriority(req, res));
router.post('/stream/workload-summary', (req, res) => aiController.streamWorkload(req, res));
router.post('/stream/suggest-category', (req, res) => aiController.streamSuggestCategory(req, res));

export default router;
