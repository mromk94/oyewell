import { prisma } from '../prisma.js';

export async function addEvidence(input: {
  caseType: string;
  caseId: string;
  evidenceType: string;
  title?: string;
  description?: string;
  data?: Record<string, any>;
  sourceUrl?: string;
  createdBy?: string;
}) {
  return prisma.caseEvidence.create({
    data: {
      caseType: input.caseType,
      caseId: input.caseId,
      evidenceType: input.evidenceType as any,
      title: input.title,
      description: input.description,
      data: input.data ?? {},
      sourceUrl: input.sourceUrl,
      createdBy: input.createdBy,
    },
  });
}

export async function getEvidence(caseType: string, caseId: string) {
  return prisma.caseEvidence.findMany({
    where: { caseType, caseId },
    orderBy: { createdAt: 'asc' },
  });
}

export async function collectDisputeEvidence(disputeId: string, orderId?: string, customerId?: string) {
  await addEvidence({
    caseType: 'DISPUTE',
    caseId: disputeId,
    evidenceType: 'ORDER_SNAPSHOT',
    title: 'Dispute opened',
    description: 'Customer initiated dispute',
    data: { customerId, orderId, createdAt: new Date().toISOString() },
  });
  if (!orderId) return;
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { payment: true, rider: true, messages: { take: 50 } },
  });
  if (!order) return;
  await addEvidence({
    caseType: 'DISPUTE',
    caseId: disputeId,
    evidenceType: 'ORDER_SNAPSHOT',
    title: 'Order snapshot',
    data: { orderNumber: order.orderNumber, status: order.status, totalKobo: order.totalKobo, riderId: order.riderId },
  });
  if (order.payment) {
    await addEvidence({
      caseType: 'DISPUTE',
      caseId: disputeId,
      evidenceType: 'PAYMENT_RECORD',
      title: 'Payment record',
      data: { status: order.payment.status, amountKobo: order.payment.amountKobo },
    });
  }
}

export async function buildOrderTimeline(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { statusHistory: true, payment: true, messages: true },
  });
  if (!order) return [];
  const timeline: { at: string; event: string }[] = [];
  timeline.push({ at: order.createdAt.toISOString(), event: 'Order placed' });
  for (const h of order.statusHistory) {
    timeline.push({ at: h.createdAt.toISOString(), event: `Order status: ${h.status}` });
  }
  if (order.cookAcceptedAt) timeline.push({ at: order.cookAcceptedAt.toISOString(), event: 'Cook accepted order' });
  if (order.cookReadyAt) timeline.push({ at: order.cookReadyAt.toISOString(), event: 'Food ready' });
  if (order.deliveredAt) timeline.push({ at: order.deliveredAt.toISOString(), event: 'Delivery completed' });
  for (const m of order.messages) {
    timeline.push({ at: m.createdAt.toISOString(), event: 'Chat message' });
  }
  return timeline.sort((a, b) => a.at.localeCompare(b.at));
}
