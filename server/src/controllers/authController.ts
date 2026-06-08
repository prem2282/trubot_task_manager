import { Request, Response, NextFunction } from 'express';
import * as authService from '../services/authService';
import * as verificationService from '../services/verificationService';
import { getRefreshCookieOptions } from '../utils/jwt';
import { param } from '../utils/params';

function sendAuthResult(res: Response, result: authService.AuthResult, status = 200) {
  res.cookie('refreshToken', result.refreshToken, getRefreshCookieOptions());
  res.status(status).json({
    success: true,
    data: {
      accessToken: result.accessToken,
      user: result.user,
      account: result.account,
      workspace: result.workspace,
    },
  });
}

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await authService.register(req.body);
    res.status(201).json({ success: true, data: result });
  } catch (e) {
    next(e);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await authService.login(req.body.email, req.body.password);
    sendAuthResult(res, result);
  } catch (e) {
    next(e);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.refreshToken;
    if (token) await authService.logout(token);
    res.clearCookie('refreshToken', { path: '/api/v1/auth' });
    res.json({ success: true, message: 'Logged out' });
  } catch (e) {
    next(e);
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) {
      res.status(401).json({ success: false, message: 'Refresh token required' });
      return;
    }
    const result = await authService.refreshAccessToken(token);
    res.cookie('refreshToken', result.refreshToken, getRefreshCookieOptions());
    res.json({ success: true, data: { accessToken: result.accessToken } });
  } catch (e) {
    next(e);
  }
}

export async function me(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await authService.getMe(req.user!.userId, req.user!);
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

export async function memberships(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await authService.listMemberships(req.user!.userId);
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

export async function switchContext(req: Request, res: Response, next: NextFunction) {
  try {
    const { accountId, workspaceId } = req.body;
    const result = await authService.switchContext(req.user!.userId, accountId, workspaceId);
    sendAuthResult(res, result);
  } catch (e) {
    next(e);
  }
}

export async function validateVerifyEmail(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await verificationService.validateEmailVerificationToken(param(req.params.token, 'token'));
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

export async function verifyEmail(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await authService.verifyEmail(param(req.params.token, 'token'));
    sendAuthResult(res, result);
  } catch (e) {
    next(e);
  }
}

export async function resendVerification(req: Request, res: Response, next: NextFunction) {
  try {
    await verificationService.resendEmailVerification(req.body.email);
    res.json({
      success: true,
      message: 'If that email is registered and unverified, a new verification link has been sent.',
    });
  } catch (e) {
    next(e);
  }
}

export async function forgotPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const sent = await verificationService.requestPasswordReset(req.body.email);
    res.json({
      success: true,
      message: 'If an account exists for that email, a password reset link has been sent.',
      ...(process.env.NODE_ENV === 'development' && sent
        ? {
            devInboxUrl: 'http://localhost:8025',
            devNote:
              'Local dev does not send to your real inbox. Open Mailpit to read the email.',
          }
        : {}),
    });
  } catch (e) {
    next(e);
  }
}

export async function validateResetPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await verificationService.validatePasswordResetToken(param(req.params.token, 'token'));
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

export async function resetPassword(req: Request, res: Response, next: NextFunction) {
  try {
    await verificationService.resetPassword(param(req.params.token, 'token'), req.body.password);
    res.json({ success: true, message: 'Password updated. You can sign in with your new password.' });
  } catch (e) {
    next(e);
  }
}
