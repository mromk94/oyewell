import { Router } from 'express';
import { createOrder, serializeOrder } from '../lib/order.js';
import { prisma } from '../prisma.js';
import { createOrderSchema } from '../lib/validation.js';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET ?? 'change-me';
const router = Router();

function getCustomerId(req: { headers: { authorization?: string } }): string | undefined {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
  if (!token) return undefined;
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
    return decoded.id;
  } catch {
    return undefined;
  }
}

router.post('/', async (req, res, next) => {
  try {
    const body = createOrderSchema.parse(req.body);
    const customerId = getCustomerId(req);
    const result = await createOrder({ ...body, customerId });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get('/:orderNumber', async (req, res, next) => {
  try {
    const order = await prisma.order.findUnique({
      where: { orderNumber: req.params.orderNumber },
      include: {
        items: true,
        sides: true,
        payment: { include: { attempts: { orderBy: { createdAt: 'desc' }, take: 1 } } },
        deliveryZone: true,
        statusHistory: true,
      },
    });
    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }
    res.json({ order: serializeOrder(order) });
  } catch (err) {
    next(err);
  }
});

export default router;
