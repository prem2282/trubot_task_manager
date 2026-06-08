import { Router } from 'express';
import authRoutes from './authRoutes';
import workspaceRoutes from './workspaceRoutes';
import inviteRoutes from './inviteRoutes';
import memberRoutes from './memberRoutes';
import taskRoutes from './taskRoutes';
import userRoutes from './userRoutes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/workspaces', workspaceRoutes);
router.use('/invites', inviteRoutes);
router.use('/members', memberRoutes);
router.use('/users', userRoutes);
router.use('/tasks', taskRoutes);

router.get('/health', (_req, res) => {
  res.json({ success: true, message: 'API is running' });
});

export default router;
