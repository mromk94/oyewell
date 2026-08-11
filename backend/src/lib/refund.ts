import { prisma } from '../prisma.js';
import { logAudit } from './audit.js';

export async function createRefund(input: {
  orderId: string;
  amountKobo: number;
  reason: string;
  approvedBy: string;
  disputeId?: string;
  ticketId?: string;
}) {
  const payment = await prisma.payment.findUnique({
    where: { orderId: input.orderId },
  });
  if (!payment) throw new Error('Payment not found');
  if (input.amountKobo > payment.amountKobo - payment.refundKobo) {
    throw new Error('Refund amount exceeds available balance');
  }

  const refund = await prisma.$transaction(async (tx) => {
    const created = await tx.refund.create({
      data: {
        paymentId: payment.id,
        orderId: input.orderId,
        amountKobo: input.amountKobo,
        reason: input.reason,
        approvedBy: input.approvedBy,
        disputeId: input.disputeId,
        ticketId: input.ticketId,
        status: 'PENDING',
      },
    });
    await tx.payment.update({
      where: { id: payment.id },
      data: { refundKobo: { increment: input.amountKobo } },
    });
    return created;
  });

  await logAudit({
    actorId: input.approvedBy,
    action: 'REFUND_CREATED',
    targetId: refund.id,
    targetType: 'Refund',
    reference: `order:${input.orderId}`,
    newState: { amountKobo: input.amountKobo, status: 'PENDING', reason: input.reason },
  });

  return refund;
}
