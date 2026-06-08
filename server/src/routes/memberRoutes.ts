import { Router } from 'express';
import * as workspaceController from '../controllers/workspaceController';
import { authenticate } from '../middleware/authenticate';
import { requireAccountAdmin } from '../middleware/authorize';

const router = Router();

router.use(authenticate);
router.get('/', requireAccountAdmin, workspaceController.listAccountMembers);

export default router;
