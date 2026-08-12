import type { Request, Response, NextFunction } from 'express';

const attempts = new Map<string, { count: number; until: number }>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;
const LOCKOUT_MS = 60 * 60 * 1000;

export function adminLoginRateLimit(req: Request, res: Response, next: NextFunction) {
  const key = (req.ip ?? 'unknown') as string;
  const now = Date.now();
  const record = attempts.get(key);

  if (record && record.count >= MAX_ATTEMPTS && record.until > now) {
    res.status(429).json({ error: 'Too many failed admin login attempts. Try again later.' });
    return;
  }

  res.once('finish', () => {
    if (res.statusCode === 401) {
      let current = attempts.get(key);
      if (!current || now > current.until) {
        current = { count: 0, until: 0 };
      }
      current.count += 1;
      if (current.count >= MAX_ATTEMPTS) {
        current.until = now + LOCKOUT_MS;
      } else {
        current.until = now + WINDOW_MS;
      }
      attempts.set(key, current);
    } else if (res.statusCode >= 200 && res.statusCode < 300) {
      attempts.delete(key);
    }
  });

  next();
}
