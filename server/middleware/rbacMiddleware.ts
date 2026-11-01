import type { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from './authMiddleware.ts';
import type { UserRole } from '../services/authService.ts';

export const requireRoles = (...allowedRoles: UserRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Authentication session required.',
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      if ((req as any).readable) {
        req.resume();
      }
      res.status(403).json({
        error: 'FORBIDDEN',
        message: `INSUFFICIENT_PERMISSIONS: Your role (${req.user.role}) does not have permission to perform this action.`,
        requiredRoles: allowedRoles,
      });
      return;
    }

    next();
  };
};
