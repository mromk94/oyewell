import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../prisma.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { serializeOrder } from '../lib/order.js';
import { JWT_SECRET, JWT_EXPIRES_IN } from '../lib/config.js';

const router = Router();

router.post('/register', async (req, res, next) => {
  try {
    const { email, password, firstName, lastName, phone } = req.body as Record<string, string>;
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(409).json({ error: 'Email already in use' });
      return;
    }
    const hashed = bcrypt.hashSync(password, 10);
    const user = await prisma.user.create({
      data: { email, password: hashed, firstName, lastName, phone },
    });
    const roles = [user.role];
    await prisma.user.update({ where: { id: user.id }, data: { roles } });
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role, roles }, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    });
    res.json({ user: { id: user.id, email, role: user.role, roles, firstName, lastName, phone }, token });
  } catch (err) {
    next(err);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body as Record<string, string>;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !bcrypt.compareSync(password, user.password)) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }
    const roles = user.roles.length ? user.roles : [user.role];
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role, roles }, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    });
    res.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        roles,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
      },
      token,
    });
  } catch (err) {
    next(err);
  }
});
router.get('/me', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { id: true, email: true, firstName: true, lastName: true, phone: true, role: true, roles: true },
    });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json({ user });
  } catch (err) {
    next(err);
  }
});

router.post('/change-password', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body as Record<string, string>;
    if (!currentPassword || !newPassword) {
      res.status(400).json({ error: 'Current and new password are required' });
      return;
    }
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user || !bcrypt.compareSync(currentPassword, user.password)) {
      res.status(401).json({ error: 'Current password is incorrect' });
      return;
    }
    const hashed = bcrypt.hashSync(newPassword, 10);
    await prisma.user.update({ where: { id: user.id }, data: { password: hashed } });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.get('/orders', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const orders = await prisma.order.findMany({
      where: { customerId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      include: {
        items: true,
        sides: true,
        payment: { include: { attempts: { orderBy: { createdAt: 'desc' } } } },
        statusHistory: true,
      },
    });
    res.json({ orders: orders.map((o) => serializeOrder(o, false, true)) });
  } catch (err) {
    next(err);
  }
});

router.post('/forgot-password', async (req, res, next) => {
  try {
    const { email } = req.body as Record<string, string>;
    if (!email) {
      res.status(400).json({ error: 'Email is required' });
      return;
    }
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(404).json({ error: 'No account found with this email' });
      return;
    }
    const token = jwt.sign({ email, purpose: 'password-reset' }, JWT_SECRET, { expiresIn: '15m' });
    res.json({ message: 'Reset token generated. Use it to set a new password.', resetToken: token });
  } catch (err) {
    next(err);
  }
});

router.put('/me', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const { firstName, lastName, phone } = req.body as Record<string, string>;
    if (firstName === undefined && lastName === undefined && phone === undefined) {
      res.status(400).json({ error: 'No fields provided' });
      return;
    }
    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: { firstName, lastName, phone },
      select: { id: true, email: true, firstName: true, lastName: true, phone: true, role: true },
    });
    res.json({ user });
  } catch (err) {
    next(err);
  }
});

router.post('/reset-password', async (req, res, next) => {
  try {
    const { email, resetToken, newPassword } = req.body as Record<string, string>;
    if (!email || !resetToken || !newPassword || newPassword.length < 6) {
      res.status(400).json({ error: 'Email, reset token and a new password of at least 6 characters are required' });
      return;
    }
    const decoded = jwt.verify(resetToken, JWT_SECRET) as { email: string; purpose: string };
    if (decoded.purpose !== 'password-reset' || decoded.email !== email) {
      res.status(400).json({ error: 'Invalid or expired reset token' });
      return;
    }
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(404).json({ error: 'Account not found' });
      return;
    }
    const hashed = bcrypt.hashSync(newPassword, 10);
    await prisma.user.update({ where: { id: user.id }, data: { password: hashed } });
    res.json({ ok: true, message: 'Password updated. You can now sign in.' });
  } catch (err) {
    next(err);
  }
});


export default router;
