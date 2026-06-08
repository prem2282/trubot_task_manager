import { Request, Response, NextFunction } from 'express';
import { User } from '../models';
import { verifyAccessToken } from '../utils/jwt';
import { AppError } from '../utils/errors';

export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw new AppError(401, 'Authentication required');
    }

    const token = header.slice(7);
    const payload = verifyAccessToken(token);

    const user = await User.findById(payload.userId);
    if (!user || user.verificationStatus !== 'verified') {
      throw new AppError(401, 'Invalid or unverified user');
    }

    req.user = {
      ...payload,
      email: user.email,
      name: user.name,
    };

    next();
  } catch (error) {
    if (error instanceof AppError) next(error);
    else next(new AppError(401, 'Invalid token'));
  }
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    authenticate(req, _res, next).catch(next);
  } else {
    next();
  }
}
