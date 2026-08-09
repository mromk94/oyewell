import type { Request, Response, NextFunction } from 'express';

interface Window {
  count: number;
  reset: number;
}

const store = new Map<string, Window>();

export function rateLimit({ windowMs = 60000, max = 100 }: { windowMs?: number; max?: number } = {}) {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip ?? 'anonymous';
    const now = Date.now();
    const current = store.get(key);

    if (!current || now > current.reset) {
      store.set(key, { count: 1, reset: now + windowMs });
    } else {
      current.count += 1;
      if (current.count > max) {
        res.status(429).json({ error: 'Too many requests, please slow down.' });
        return;
      }
    }

    next();
  };
}
