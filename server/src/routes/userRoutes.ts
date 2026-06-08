import { Router } from 'express';
import * as taskController from '../controllers/taskController';
import { authenticate } from '../middleware/authenticate';

const router = Router();

router.use(authenticate);
router.get('/', taskController.listUsers);

export default router;
