import { prisma } from '../prisma.js';

const DEFAULT_DAYS = 365;

export async function runDataRetention(opts?: {
  messageDays?: number;
  auditLogDays?: number;
  ticketDays?: number;
  disputeDays?: number;
}) {
  const now = new Date();
  const messageCutoff = new Date(now.getTime() - (opts?.messageDays ?? DEFAULT_DAYS) * 24 * 60 * 60 * 1000);
  const auditCutoff = new Date(now.getTime() - (opts?.auditLogDays ?? DEFAULT_DAYS) * 24 * 60 * 60 * 1000);
  const ticketCutoff = new Date(now.getTime() - (opts?.ticketDays ?? DEFAULT_DAYS * 2) * 24 * 60 * 60 * 1000);
  const disputeCutoff = new Date(now.getTime() - (opts?.disputeDays ?? DEFAULT_DAYS * 2) * 24 * 60 * 60 * 1000);

  const [messages, auditLogs, tickets, disputes] = await Promise.all([
    prisma.message.deleteMany({ where: { createdAt: { lt: messageCutoff } } }),
    prisma.auditLog.deleteMany({ where: { createdAt: { lt: auditCutoff } } }),
    prisma.ticket.deleteMany({ where: { createdAt: { lt: ticketCutoff }, status: 'RESOLVED' } }),
    prisma.dispute.deleteMany({ where: { createdAt: { lt: disputeCutoff }, status: { in: ['RESOLVED', 'CLOSED'] } } }),
  ]);

  return { messages: messages.count, auditLogs: auditLogs.count, tickets: tickets.count, disputes: disputes.count };
}
