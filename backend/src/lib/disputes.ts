import { prisma } from '../prisma.js';
import { collectDisputeEvidence } from './evidence.js';
import { createRefund } from './refund.js';

export function generateDisputeNumber() {
  return `DISPUTE-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

export async function createDispute(input: {
  customerId: string;
  type: string;
  orderId?: string;
  cookId?: string;
  riderId?: string;
  description?: string;
  evidence?: string[];
}) {
  const dispute = await prisma.dispute.create({
    data: {
      disputeNumber: generateDisputeNumber(),
      customerId: input.customerId,
      type: input.type as any,
      orderId: input.orderId,
      cookId: input.cookId,
      riderId: input.riderId,
      description: input.description,
        timeline: [{ at: new Date().toISOString(), event: 'Dispute opened' }],
    },
  });
  await collectDisputeEvidence(dispute.id, dispute.orderId ?? undefined, dispute.customerId);
  return dispute;
}

export async function getDisputes(filters: { customerId?: string; status?: string; assignedTo?: string } = {}) {
  return prisma.dispute.findMany({
    where: {
      ...(filters.customerId && { customerId: filters.customerId }),
      ...(filters.status && { status: filters.status as any }),
      ...(filters.assignedTo && { assignedTo: filters.assignedTo }),
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getDispute(id: string) {
  return prisma.dispute.findUnique({ where: { id } });
}

export async function assignDispute(id: string, assignedTo: string) {
  return prisma.dispute.update({
    where: { id },
    data: { assignedTo, status: 'UNDER_REVIEW' },
  });
}

export async function resolveDispute(id: string, resolution: string, refundKobo: number | undefined, approvedBy: string | undefined) {
  const before = await prisma.dispute.findUnique({ where: { id } });
  const dispute = await prisma.dispute.update({
    where: { id },
    data: { resolution, refundKobo, status: 'RESOLVED' },
  });
  if (refundKobo && refundKobo > 0 && before?.orderId && approvedBy) {
    const payment = await prisma.payment.findUnique({ where: { orderId: before.orderId } });
    if (payment) {
      await createRefund({
        orderId: before.orderId,
        amountKobo: refundKobo,
        reason: resolution,
        approvedBy,
        disputeId: id,
      });
    }
  }
  return dispute;
}

export async function addDisputeTimelineEvent(id: string, event: string) {
  const dispute = await prisma.dispute.findUnique({ where: { id } });
  if (!dispute) return null;
  const timeline = (dispute.timeline as any[]) ?? [];
  timeline.push({ at: new Date().toISOString(), event });
  return prisma.dispute.update({
    where: { id },
    data: { timeline },
  });
}

export async function appealDispute(id: string, reason: string, customerId: string) {
  const dispute = await prisma.dispute.findUnique({ where: { id } });
  if (!dispute) return null;
  if (dispute.customerId !== customerId) throw new Error('Only the customer can appeal');
  if (dispute.status !== 'RESOLVED' && dispute.status !== 'CLOSED') throw new Error('Dispute is not resolved yet');
  const timeline = (dispute.timeline as any[]) ?? [];
  timeline.push({ at: new Date().toISOString(), event: `Appeal requested: ${reason}` });
  return prisma.dispute.update({
    where: { id },
    data: { status: 'APPEALED', timeline },
  });
}
