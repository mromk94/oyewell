import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../prisma.js';
import { JWT_SECRET } from '../lib/config.js';
import { hasPermission } from '../lib/management.js';

export interface AuthRequest extends Request {
  user?: { id: string; email: string; role: string; roles: string[] };
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
  if (!token) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string; role: string; roles: string[] };
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, email: true, role: true, roles: true, isActive: true, banReason: true },
    });
    if (!user || !user.isActive) {
      res.status(401).json({ error: 'Unauthorized or suspended' });
      return;
    }
    req.user = { id: user.id, email: user.email, role: user.role, roles: user.roles?.length ? user.roles : [user.role] };
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
    return;
  }
}

export function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string; role: string; roles: string[] };
      req.user = { ...decoded, roles: Array.isArray(decoded.roles) ? decoded.roles : [decoded.role] };
    } catch {
      // invalid token is ignored for optional auth
    }
  }
  next();
}

export function requireRole(...allowed: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const hasRole = req.user.roles.some((r) => allowed.includes(r));
    if (!hasRole) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    next();
  };
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user?.roles.includes('ADMIN')) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }
  next();
}

export async function requireRider(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user?.roles.includes('RIDER')) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }
  try {
    const rider = await prisma.rider.findUnique({ where: { userId: req.user!.id } });
    if (!rider || !rider.isApproved) {
      res.status(403).json({ error: 'Rider account not approved yet' });
      return;
    }
    next();
  } catch {
    res.status(500).json({ error: 'Could not verify rider status' });
  }
}

export function requirePermission(key: string) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const ok = await hasPermission({ userId: req.user.id, key });
    if (!ok) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    next();
  };
}

export async function requireOwnershipOrAdmin(req: AuthRequest, res: Response, next: NextFunction, ownerId: string) {
  const isAdmin = req.user?.roles.includes('ADMIN');
  if (!isAdmin && req.user?.id !== ownerId) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }
  next();
}
