import { Router } from 'express';
import { ApiError } from '../lib/errors.js';
import { createTicket, getTickets, getTicket, updateTicketStatus, assignTicket, addTicketMessage } from '../lib/ticketing.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';

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

router.get('/:id', async (req, res, next) => {
  try {
    const ticket = await getTicket(req.params.id);
    if (!ticket) throw new ApiError(404, 'Ticket not found');
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
    res.status(201).json({ ticket });
  } catch (e) {
    next(e);
  }
});

router.patch('/:id/status', async (req: AuthRequest, res, next) => {
  try {
    const { status, resolution } = req.body as Record<string, any>;
    if (!status) throw new ApiError(400, 'status is required');
    const ticket = await updateTicketStatus(req.params.id, status, resolution);
    res.json({ ticket });
  } catch (e) {
    next(e);
  }
});

router.patch('/:id/assign', async (req: AuthRequest, res, next) => {
  try {
    const { assignedTo } = req.body as Record<string, any>;
    if (!assignedTo) throw new ApiError(400, 'assignedTo is required');
    const ticket = await assignTicket(req.params.id, assignedTo);
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
