import { Router } from 'express';
import { ApiError } from '../lib/errors.js';
import { getActiveDocument, createDocument, recordAcceptance, hasAccepted } from '../lib/legal.js';
import { requireAuth, requireAdmin, type AuthRequest } from '../middleware/auth.js';

const router = Router();

router.get('/:type', async (req, res, next) => {
  try {
    const doc = await getActiveDocument(req.params.type);
    if (!doc) throw new ApiError(404, 'Document not found');
    res.json({ document: doc });
  } catch (e) {
    next(e);
  }
});

router.post('/accept', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const { documentType, version, ip } = req.body as Record<string, any>;
    if (!documentType || !version) throw new ApiError(400, 'documentType and version are required');
    const acceptance = await recordAcceptance({
      userId: req.user!.id,
      documentType,
      version,
      ip,
    });
    res.status(201).json({ acceptance });
  } catch (e) {
    next(e);
  }
});

router.get('/accept/:documentType/:version', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const { documentType, version } = req.params;
    const accepted = await hasAccepted(req.user!.id, documentType, version);
    res.json({ accepted });
  } catch (e) {
    next(e);
  }
});

router.post('/', requireAuth, requireAdmin, async (req: AuthRequest, res, next) => {
  try {
    const { type, version, title, content } = req.body as Record<string, any>;
    if (!type || !version || !title || !content) throw new ApiError(400, 'type, version, title and content are required');
    const document = await createDocument({ type, version, title, content });
    res.status(201).json({ document });
  } catch (e) {
    next(e);
  }
});

export default router;
