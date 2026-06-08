import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import * as authController from '../controllers/authController';
import { authenticate } from '../middleware/authenticate';
import { validate } from '../middleware/validate';
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resendVerificationSchema,
  resetPasswordSchema,
  switchContextSchema,
} from '../utils/validators';

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { success: false, message: 'Too many attempts, try again later' },
});

const emailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Too many email requests, try again later' },
});

router.post('/register', authLimiter, validate(registerSchema), authController.register);
router.post('/login', authLimiter, validate(loginSchema), authController.login);
router.post('/logout', authController.logout);
router.post('/refresh', authController.refresh);
router.get('/me', authenticate, authController.me);
router.get('/memberships', authenticate, authController.memberships);
router.post(
  '/switch-context',
  authenticate,
  validate(switchContextSchema),
  authController.switchContext
);

router.get('/verify-email/:token/validate', authController.validateVerifyEmail);
router.post('/verify-email/:token', authController.verifyEmail);
router.post(
  '/resend-verification',
  emailLimiter,
  validate(resendVerificationSchema),
  authController.resendVerification
);

router.post(
  '/forgot-password',
  emailLimiter,
  validate(forgotPasswordSchema),
  authController.forgotPassword
);
router.get('/reset-password/:token/validate', authController.validateResetPassword);
router.post(
  '/reset-password/:token',
  authLimiter,
  validate(resetPasswordSchema),
  authController.resetPassword
);

export default router;
