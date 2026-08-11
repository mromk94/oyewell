import 'dotenv/config';
import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import foodsRouter from './routes/foods.js';
import authRouter from './routes/auth.js';
import deliveryRouter from './routes/delivery.js';
import ordersRouter from './routes/orders.js';
import paymentsRouter from './routes/payments.js';
import adminRouter from './routes/admin.js';
import sidesRouter from './routes/sides.js';
import riderRouter from './routes/rider.js';
import cooksRouter from './routes/cooks.js';
import listingsRouter from './routes/listings.js';
import messagesRouter from './routes/messages.js';
import reviewsRouter from './routes/reviews.js';
import eventsRouter from './routes/events.js';
import locationRouter from './routes/location.js';
import { rateLimit } from './middleware/rateLimit.js';
import { ApiError } from './lib/errors.js';

const app = express();
app.disable('x-powered-by');
const PORT = Number(process.env.PORT ?? 4000);

app.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(',') ?? true }));
app.use(express.json({ limit: '5mb' }));
app.use(rateLimit({ windowMs: 60000, max: 120 }));
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '0');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  }
  next();
});
app.use(morgan('dev'));

app.get('/', (_req, res) => res.json({ ok: true, service: 'oye-well-backend' }));
app.get('/health', (_req, res) => res.json({ ok: true, service: 'oye-well-backend' }));

app.get('/api/ping', (_req, res) => res.json({ ok: true }));
app.use('/api/foods', foodsRouter);
app.use('/api/auth', authRouter);
app.use('/api/delivery', deliveryRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/sides', sidesRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/admin', adminRouter);
app.use('/api/rider', riderRouter);
app.use('/api/cooks', cooksRouter);
app.use('/api/listings', listingsRouter);
app.use('/api/messages', messagesRouter);
app.use('/api/reviews', reviewsRouter);
app.use('/api/events', eventsRouter);
app.use('/api/location', locationRouter);

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof ApiError) {
    res.status(err.status).json({ error: err.message, code: err.code });
    return;
  }
  if (err instanceof Error && err.name === 'ZodError') {
    res.status(400).json({ error: 'Validation failed', code: 'VALIDATION_ERROR' });
    return;
  }
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`OYE Well backend running on http://0.0.0.0:${PORT}`);
});

function gracefulShutdown(signal: string) {
  console.log(`Received ${signal}, shutting down gracefully...`);
  server.close(() => process.exit(0));
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
