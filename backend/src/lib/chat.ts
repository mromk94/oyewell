import { prisma } from '../prisma.js';

export async function getOrCreateConversation({
  context,
  contextId,
  contextType,
  title,
}: {
  context: string;
  contextId?: string;
  contextType?: string;
  title?: string;
}) {
  const existing = await prisma.conversation.findFirst({
    where: { context, contextId: contextId ?? null },
  });
  if (existing) return existing;
  return prisma.conversation.create({
    data: { context, contextId, contextType, title },
  });
}

export async function sendMessage({
  conversationId,
  orderId,
  senderId,
  recipientId,
  content,
}: {
  conversationId?: string;
  orderId?: string;
  senderId: string;
  recipientId: string;
  content: string;
}) {
  if (!conversationId && !orderId) throw new Error('conversationId or orderId is required');
  return prisma.message.create({
    data: {
      conversationId,
      orderId,
      senderId,
      recipientId,
      content: content.trim(),
    },
  });
}

export async function getConversationMessages(conversationId: string, take = 100) {
  return prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: 'asc' },
    take,
  });
}

export async function markMessagesRead(recipientId: string, senderId: string) {
  return prisma.message.updateMany({
    where: { recipientId, senderId, readAt: null },
    data: { readAt: new Date() },
  });
}

export async function getUnreadCounts(userId: string) {
  const counts = await prisma.message.groupBy({
    by: ['senderId'],
    where: { recipientId: userId, readAt: null },
    _count: { id: true },
  });
  return Object.fromEntries(counts.map((c) => [c.senderId, c._count?.id ?? 0]));
}
