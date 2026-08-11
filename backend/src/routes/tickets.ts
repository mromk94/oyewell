import { Router } from 'express';
import { ApiError } from '../lib/errors.js';
import { createTicket, getTickets, getTicket, updateTicketStatus, assignTicket, addTicketMessage } from '../lib/ticketing.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { hasPermission } from '../lib/management.js';
import { logAudit } from '../lib/audit.js';

const router = Router();

router.use(requireAuth);

router.get('/', async (req: AuthRequest, res, next) => {
  try {
    const { customerId, status, assignedTo } = req.query as Record<string, any>;
    const tickets = await getTickets({ customerId, status, assignedTo });
    res.json({ tickets });
  } catch (e) {
    next(e);
  }
});

router.get('/:id', async (req: AuthRequest, res, next) => {
  try {
    const ticket = await getTicket(req.params.id);
    if (!ticket) throw new ApiError(404, 'Ticket not found');
    const isOwner = ticket.customerId === req.user!.id;
    const isEmployee = await hasPermission({ userId: req.user!.id, key: 'TICKET_VIEW' }).catch(() => false);
    if (!isOwner && !isEmployee) throw new ApiError(403, 'Forbidden');
    res.json({ ticket });
  } catch (e) {
    next(e);
  }
});

router.post('/', async (req: AuthRequest, res, next) => {
  try {
    const { category, subject, orderId, deliveryId, priority, message } = req.body as Record<string, any>;
    if (!category || !subject) throw new ApiError(400, 'category and subject are required');
    const ticket = await createTicket({
      customerId: req.user!.id,
      category,
      subject,
      orderId,
      deliveryId,
      priority,
      message,
    });
    await logAudit({
      actorId: req.user!.id,
      action: 'TICKET_CREATED',
      targetId: ticket.id,
      targetType: 'TICKET',
      reference: ticket.ticketNumber,
      newState: { category, subject, status: ticket.status },
      ip: req.ip ?? undefined,
    });
    res.status(201).json({ ticket });
  } catch (e) {
    next(e);
  }
});

router.patch('/:id/status', async (req: AuthRequest, res, next) => {
  try {
    const { status, resolution } = req.body as Record<string, any>;
    if (!status) throw new ApiError(400, 'status is required');
    const before = await getTicket(req.params.id);
    const ticket = await updateTicketStatus(req.params.id, status, resolution);
    await logAudit({
      actorId: req.user!.id,
      action: 'TICKET_STATUS_UPDATED',
      targetId: ticket.id,
      targetType: 'TICKET',
      reference: ticket.ticketNumber,
      oldState: { status: before?.status },
      newState: { status: ticket.status, resolution },
      ip: req.ip ?? undefined,
    });
    res.json({ ticket });
  } catch (e) {
    next(e);
  }
});

router.patch('/:id/assign', async (req: AuthRequest, res, next) => {
  try {
    const { assignedTo } = req.body as Record<string, any>;
    if (!assignedTo) throw new ApiError(400, 'assignedTo is required');
    const before = await getTicket(req.params.id);
    const ticket = await assignTicket(req.params.id, assignedTo);
    await logAudit({
      actorId: req.user!.id,
      action: 'TICKET_ASSIGNED',
      targetId: ticket.id,
      targetType: 'TICKET',
      reference: ticket.ticketNumber,
      oldState: { assignedTo: before?.assignedTo },
      newState: { assignedTo: ticket.assignedTo },
      reason: `Assigned to ${assignedTo}`,
      ip: req.ip ?? undefined,
    });
    res.json({ ticket });
  } catch (e) {
    next(e);
  }
});

router.post('/:id/messages', async (req: AuthRequest, res, next) => {
  try {
    const { text } = req.body as Record<string, any>;
    if (!text?.trim()) throw new ApiError(400, 'text is required');
    const ticket = await addTicketMessage(req.params.id, req.user!.id, text.trim());
    if (!ticket) throw new ApiError(404, 'Ticket not found');
    res.json({ ticket });
  } catch (e) {
    next(e);
  }
});

export default router;
