import { Router } from 'express';
import { notifyUser, triggerAll, getUsers, sseHandler } from '../controllers/sseController';

const router = Router();

router.post('/notifyUser', notifyUser);
router.post('/trigger', triggerAll);
router.get('/users', getUsers);
router.get('/sse', sseHandler);

export default router; 