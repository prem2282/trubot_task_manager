import { Router } from 'express';
import * as inviteController from '../controllers/inviteController';
import * as workspaceController from '../controllers/workspaceController';
import { authenticate } from '../middleware/authenticate';
import { requireAccountAdmin } from '../middleware/authorize';
import { validate } from '../middleware/validate';
import { acceptInviteSchema, createInviteSchema } from '../utils/validators';

const router = Router();

router.get('/:token/validate', inviteController.validateInvite);
router.post(
  '/:token/accept',
  validate(acceptInviteSchema),
  inviteController.acceptInvite
);

router.use(authenticate);
router.post('/', requireAccountAdmin, validate(createInviteSchema), inviteController.createInvite);
router.get('/', requireAccountAdmin, inviteController.listInvites);
router.delete('/:id', requireAccountAdmin, inviteController.revokeInvite);

export default router;
