import { prisma } from '../prisma.js';

export function generateTicketNumber() {
  return `TICKET-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

export async function createTicket(input: {
  customerId: string;
  category: string;
  subject: string;
  orderId?: string;
  deliveryId?: string;
  priority?: string;
  message?: string;
}) {
  return prisma.ticket.create({
    data: {
      ticketNumber: generateTicketNumber(),
      customerId: input.customerId,
      category: input.category,
      subject: input.subject,
      orderId: input.orderId,
      deliveryId: input.deliveryId,
      priority: (input.priority as any) ?? 'NORMAL',
      messages: input.message ? [{ sender: 'customer', text: input.message, at: new Date().toISOString() }] : [],
    },
  });
}

export async function getTickets(filters: { customerId?: string; status?: string; assignedTo?: string } = {}) {
  return prisma.ticket.findMany({
    where: {
      ...(filters.customerId && { customerId: filters.customerId }),
      ...(filters.status && { status: filters.status as any }),
      ...(filters.assignedTo && { assignedTo: filters.assignedTo }),
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getTicket(id: string) {
  return prisma.ticket.findUnique({ where: { id } });
}

export async function updateTicketStatus(id: string, status: string, resolution?: string) {
  return prisma.ticket.update({
    where: { id },
    data: { status: status as any, ...(resolution && { resolution }) },
  });
}

export async function assignTicket(id: string, assignedTo: string) {
  return prisma.ticket.update({
    where: { id },
    data: { assignedTo, status: 'IN_PROGRESS' },
  });
}

export async function addTicketMessage(id: string, sender: string, text: string) {
  const ticket = await prisma.ticket.findUnique({ where: { id } });
  if (!ticket) return null;
  const messages = (ticket.messages as any[]) ?? [];
  messages.push({ sender, text, at: new Date().toISOString() });
  return prisma.ticket.update({
    where: { id },
    data: { messages },
  });
}
