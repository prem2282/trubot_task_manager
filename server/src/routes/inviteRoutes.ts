import { Router } from 'express';
import * as inviteController from '../controllers/inviteController';
import { authenticate } from '../middleware/authenticate';
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
router.post('/', validate(createInviteSchema), inviteController.createInvite);
router.get('/', inviteController.listInvites);
router.delete('/:id', inviteController.revokeInvite);

export default router;
