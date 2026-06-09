import { Router } from 'express';
import * as workspaceController from '../controllers/workspaceController';
import { authenticate } from '../middleware/authenticate';
import { requireAccountAdmin, requireWorkspaceAdmin } from '../middleware/authorize';
import { validate } from '../middleware/validate';
import {
  addMemberSchema,
  createWorkspaceSchema,
  renameWorkspaceSchema,
  updateMemberRoleSchema,
} from '../utils/validators';

const router = Router();

router.use(authenticate);

router.get('/', workspaceController.listWorkspaces);
router.post(
  '/',
  requireAccountAdmin,
  validate(createWorkspaceSchema),
  workspaceController.createWorkspace
);
router.patch('/:id', validate(renameWorkspaceSchema), workspaceController.renameWorkspace);
router.delete('/:id', workspaceController.deleteWorkspace);
router.post('/:id/archive', workspaceController.archiveWorkspace);
router.get('/:id/members', workspaceController.listMembers);
router.post(
  '/:id/members',
  requireWorkspaceAdmin,
  validate(addMemberSchema),
  workspaceController.addMember
);
router.delete('/:id/members/:userId', requireWorkspaceAdmin, workspaceController.removeMember);
router.patch(
  '/:id/members/:userId',
  requireWorkspaceAdmin,
  validate(updateMemberRoleSchema),
  workspaceController.updateMemberRole
);

export default router;
