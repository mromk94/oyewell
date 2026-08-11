import { prisma } from '../prisma.js';
import type { ApprovalStatus, ApprovalType } from '@prisma/client';

export interface CreateApprovalInput {
  type: ApprovalType;
  targetId: string;
  targetType: string;
  submittedBy?: string;
  data?: Record<string, any>;
  note?: string;
}

export interface ReviewApprovalInput {
  approvalId: string;
  status: ApprovalStatus;
  reviewedBy: string;
  note?: string;
  moreInfo?: string;
}

export async function createApproval(input: CreateApprovalInput) {
  return prisma.approval.create({
    data: {
      type: input.type,
      targetId: input.targetId,
      targetType: input.targetType,
      submittedBy: input.submittedBy,
      submittedAt: input.submittedBy ? new Date() : undefined,
      data: input.data ?? {},
      note: input.note,
      status: input.submittedBy ? 'SUBMITTED' : 'DRAFT',
    },
  });
}

export async function reviewApproval({ approvalId, status, reviewedBy, note, moreInfo }: ReviewApprovalInput) {
  return prisma.approval.update({
    where: { id: approvalId },
    data: {
      status,
      reviewedBy,
      reviewedAt: new Date(),
      note,
      moreInfo,
    },
  });
}

export async function getApprovals(filters: { type?: ApprovalType; status?: ApprovalStatus; targetId?: string; targetType?: string } = {}) {
  return prisma.approval.findMany({
    where: filters,
    orderBy: { createdAt: 'desc' },
  });
}

export async function getApproval(id: string) {
  return prisma.approval.findUnique({ where: { id } });
}
