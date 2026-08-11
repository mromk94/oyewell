import { prisma } from '../prisma.js';

export async function createReport(input: {
  reporterId: string;
  targetId: string;
  targetType: string;
  reason: string;
  details?: string;
  evidence?: string[];
}) {
  return prisma.report.create({
    data: {
      reporterId: input.reporterId,
      targetId: input.targetId,
      targetType: input.targetType,
      reason: input.reason,
      details: input.details,
      evidence: input.evidence ?? [],
    },
  });
}

export async function getReport(id: string) {
  return prisma.report.findUnique({ where: { id } });
}

export async function getReports(filters: { status?: string; assignedTo?: string } = {}) {
  return prisma.report.findMany({
    where: {
      ...(filters.status && { status: filters.status as any }),
      ...(filters.assignedTo && { assignedTo: filters.assignedTo }),
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function assignReport(id: string, assignedTo: string) {
  return prisma.report.update({
    where: { id },
    data: { assignedTo, status: 'UNDER_REVIEW' },
  });
}

export async function resolveReport(id: string, resolution: string) {
  return prisma.report.update({
    where: { id },
    data: { resolution, status: 'RESOLVED' },
  });
}

export async function blockUser(input: { blockerId: string; blockedId: string; reason?: string }) {
  return prisma.userBlock.upsert({
    where: { blockerId_blockedId: { blockerId: input.blockerId, blockedId: input.blockedId } },
    create: { blockerId: input.blockerId, blockedId: input.blockedId, reason: input.reason },
    update: { reason: input.reason },
  });
}

export async function isBlocked(blockerId: string, blockedId: string) {
  const row = await prisma.userBlock.findUnique({
    where: { blockerId_blockedId: { blockerId, blockedId } },
  });
  return !!row;
}
