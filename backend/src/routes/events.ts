import { Router } from 'express';
import { subscribe, type BusEvent } from '../lib/realtime.js';

const router = Router();

router.get('/', (_req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
    'Access-Control-Allow-Origin': '*',
  });
  res.write(': connected\n\n');

  const handler = (event: BusEvent) => {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  };

  const unsubscribe = subscribe(handler);

  const keepAlive = setInterval(() => {
    res.write(': heartbeat\n\n');
  }, 30000);

  res.on('close', () => {
    clearInterval(keepAlive);
    unsubscribe();
  });
});

export default router;
