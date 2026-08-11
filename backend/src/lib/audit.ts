import { prisma } from '../prisma.js';

export interface AuditInput {
  actorId?: string;
  actorType?: string;
  action: string;
  targetId?: string;
  targetType?: string;
  reason?: string;
  oldState?: Record<string, any>;
  newState?: Record<string, any>;
  reference?: string;
  ip?: string;
  userAgent?: string;
}

export async function logAudit(input: AuditInput) {
  return prisma.auditLog.create({
    data: {
      actorId: input.actorId,
      actorType: input.actorType,
      action: input.action,
      targetId: input.targetId,
      targetType: input.targetType,
      reason: input.reason,
      oldState: input.oldState ?? {},
      newState: input.newState ?? {},
      reference: input.reference,
      ip: input.ip,
      userAgent: input.userAgent,
    },
  });
}

export function getAuditLogs(filters: {
  actorId?: string;
  action?: string;
  targetId?: string;
  targetType?: string;
  reference?: string;
  from?: Date;
  to?: Date;
  skip?: number;
  take?: number;
} = {}) {
  return prisma.auditLog.findMany({
    where: {
      ...(filters.actorId && { actorId: filters.actorId }),
      ...(filters.action && { action: filters.action }),
      ...(filters.targetId && { targetId: filters.targetId }),
      ...(filters.targetType && { targetType: filters.targetType }),
      ...(filters.reference && { reference: filters.reference }),
      ...(filters.from || filters.to
        ? {
            createdAt: {
              ...(filters.from && { gte: filters.from }),
              ...(filters.to && { lte: filters.to }),
            },
          }
        : {}),
    },
    orderBy: { createdAt: 'desc' },
    skip: filters.skip ?? 0,
    take: filters.take ?? 100,
  });
}
