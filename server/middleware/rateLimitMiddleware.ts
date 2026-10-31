import type { Request, Response, NextFunction } from 'express';
import type { AppDatabase } from '../db/database.ts';

export const createRateLimitMiddleware = (
  appDb: AppDatabase,
  options: { maxAttempts: number; windowMs: number; blockDurationMs: number } = {
    maxAttempts: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
    blockDurationMs: 15 * 60 * 1000,
  }
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const email = (req.body?.email || '').toLowerCase().trim();
    const key = `ratelimit:${ip}:${email || 'general'}`;
    const now = Date.now();

    const stmt = appDb.db.prepare('SELECT * FROM rate_limits WHERE key = ?');
    const record = stmt.get(key) as
      | { key: string; count: number; first_attempt_at: number; blocked_until: number }
      | undefined;

    if (record) {
      // Check if currently blocked
      if (record.blocked_until > now) {
        const remainingSeconds = Math.ceil((record.blocked_until - now) / 1000);
        res.status(429).json({
          error: 'TOO_MANY_REQUESTS',
          message: `Too many failed attempts. Please try again in ${remainingSeconds} seconds.`,
          retryAfter: remainingSeconds,
        });
        return;
      }

      // Check if window expired
      if (now - record.first_attempt_at > options.windowMs) {
        // Reset window
        const resetStmt = appDb.db.prepare(
          'UPDATE rate_limits SET count = 1, first_attempt_at = ?, blocked_until = 0 WHERE key = ?'
        );
        resetStmt.run(now, key);
      } else {
        // Increment count
        const newCount = record.count + 1;
        const blockedUntil = newCount >= options.maxAttempts ? now + options.blockDurationMs : 0;
        const updateStmt = appDb.db.prepare(
          'UPDATE rate_limits SET count = ?, blocked_until = ? WHERE key = ?'
        );
        updateStmt.run(newCount, blockedUntil, key);

        if (newCount >= options.maxAttempts) {
          const remainingSeconds = Math.ceil(options.blockDurationMs / 1000);
          res.status(429).json({
            error: 'TOO_MANY_REQUESTS',
            message: `Account temporarily locked due to excessive failed attempts. Please wait ${remainingSeconds} seconds.`,
            retryAfter: remainingSeconds,
          });
          return;
        }
      }
    } else {
      // First attempt
      const insertStmt = appDb.db.prepare(
        'INSERT INTO rate_limits (key, count, first_attempt_at, blocked_until) VALUES (?, 1, ?, 0)'
      );
      insertStmt.run(key, now);
    }

    next();
  };
};

export const clearRateLimit = (appDb: AppDatabase, ip: string, email?: string): void => {
  const key = `ratelimit:${ip}:${(email || 'general').toLowerCase().trim()}`;
  const stmt = appDb.db.prepare('DELETE FROM rate_limits WHERE key = ?');
  stmt.run(key);
};
