import type { Request, Response, NextFunction } from 'express';
import type { AuthService, UserEntity, FamilyEntity } from '../services/authService.ts';

export interface AuthenticatedRequest extends Request {
  user?: Omit<UserEntity, 'password_hash' | 'password_salt'>;
  family?: FamilyEntity;
  sessionToken?: string;
}

export const createAuthMiddleware = (authService: AuthService) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    // Check cookie first, fallback to Authorization: Bearer
    let token = req.cookies?.shaadisaathi_session;

    if (!token && req.headers.authorization) {
      const parts = req.headers.authorization.split(' ');
      if (parts.length === 2 && parts[0] === 'Bearer') {
        token = parts[1];
      }
    }

    if (!token) {
      res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Authentication session required. Please sign in.',
      });
      return;
    }

    const sessionData = authService.validateSession(token);
    if (!sessionData) {
      // Clear invalid cookie
      res.clearCookie('shaadisaathi_session');
      res.status(401).json({
        error: 'SESSION_EXPIRED',
        message: 'Your session has expired or been revoked. Please sign in again.',
      });
      return;
    }

    req.user = sessionData.user;
    req.family = sessionData.family;
    req.sessionToken = token;

    next();
  };
};
