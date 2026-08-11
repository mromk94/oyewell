import { Router } from 'express';
import { ApiError } from '../lib/errors.js';
import { getOrCreateConversation, sendMessage, getConversationMessages, markMessagesRead, getUnreadCounts } from '../lib/chat.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

router.post('/conversations', async (req: AuthRequest, res, next) => {
  try {
    const { context, contextId, contextType, title } = req.body as Record<string, any>;
    if (!context) throw new ApiError(400, 'context is required');
    const conversation = await getOrCreateConversation({ context, contextId, contextType, title });
    res.status(201).json({ conversation });
  } catch (e) {
    next(e);
  }
});

router.post('/conversations/:id/messages', async (req: AuthRequest, res, next) => {
  try {
    const { content, recipientId } = req.body as Record<string, any>;
    if (!content?.trim() || !recipientId) throw new ApiError(400, 'content and recipientId are required');
    const message = await sendMessage({
      conversationId: req.params.id,
      senderId: req.user!.id,
      recipientId,
      content,
    });
    res.status(201).json({ message });
  } catch (e) {
    next(e);
  }
});

router.get('/conversations/:id/messages', async (req: AuthRequest, res, next) => {
  try {
    const messages = await getConversationMessages(req.params.id, 100);
    res.json({ messages });
  } catch (e) {
    next(e);
  }
});

router.post('/conversations/:id/read', async (req: AuthRequest, res, next) => {
  try {
    const { senderId } = req.body as Record<string, any>;
    if (!senderId) throw new ApiError(400, 'senderId is required');
    await markMessagesRead(req.user!.id, senderId);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

router.get('/unread', async (req: AuthRequest, res, next) => {
  try {
    const counts = await getUnreadCounts(req.user!.id);
    res.json({ counts });
  } catch (e) {
    next(e);
  }
});

export default router;
