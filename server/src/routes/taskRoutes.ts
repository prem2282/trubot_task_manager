import { Router } from 'express';
import * as taskController from '../controllers/taskController';
import { authenticate } from '../middleware/authenticate';
import { validate } from '../middleware/validate';
import {
  addTaskCommentSchema,
  createTaskSchema,
  taskQuerySchema,
  updateTaskSchema,
} from '../utils/validators';

const router = Router();

router.use(authenticate);

router.get('/', validate(taskQuerySchema, 'query'), taskController.listTasks);
router.get('/:id', taskController.getTask);
router.post('/', validate(createTaskSchema), taskController.createTask);
router.put('/:id', validate(updateTaskSchema), taskController.updateTask);
router.post('/:id/comments', validate(addTaskCommentSchema), taskController.addComment);
router.delete('/:id', taskController.deleteTask);

export default router;
