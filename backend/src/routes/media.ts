import { Router } from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { requireAuth } from '../middleware/auth.js';
import type { AuthRequest } from '../middleware/auth.js';
import { ApiError } from '../lib/errors.js';

const router = Router();

const UPLOAD_DIR = path.resolve('public/uploads');

async function ensureUploadDir() {
  try {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
  } catch {
    // directory already exists or can be created by runtime
  }
}

router.post('/upload', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    await ensureUploadDir();
    const { file, type } = req.body as { file?: string; type?: 'IMAGE' | 'VIDEO' };
    if (!file || typeof file !== 'string') throw new ApiError(400, 'file is required');

    const mediaType = type === 'VIDEO' ? 'VIDEO' : 'IMAGE';

    // If the supplied value is already a remote URL, store the reference as-is.
    if (file.startsWith('http://') || file.startsWith('https://') || file.startsWith('/')) {
      res.json({ url: file, type: mediaType, thumbnailUrl: null });
      return;
    }

    const match = file.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) throw new ApiError(400, 'file must be a URL or a base64 data URL');

    const mime = match[1];
    const base64 = match[2];
    const buffer = Buffer.from(base64, 'base64');

    const extMap: Record<string, string> = {
      'image/png': 'png',
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/webp': 'webp',
      'image/gif': 'gif',
      'video/mp4': 'mp4',
      'video/webm': 'webm',
      'video/quicktime': 'mov',
    };
    const ext = extMap[mime] ?? (mediaType === 'VIDEO' ? 'mp4' : 'png');

    const filename = `${randomUUID()}.${ext}`;
    const filePath = path.join(UPLOAD_DIR, filename);
    await fs.writeFile(filePath, buffer);

    const host = req.get('host') ?? 'localhost';
    const protocol = req.protocol ?? 'http';
    const url = `${protocol}://${host}/uploads/${filename}`;

    res.json({ url, type: mediaType, thumbnailUrl: null });
  } catch (err) {
    next(err);
  }
});

export default router;
