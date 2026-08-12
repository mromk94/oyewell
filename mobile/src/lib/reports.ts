import { api } from './api';

export async function createReport(payload: {
  targetId: string;
  targetType: string;
  reason: string;
  details?: string;
  evidence?: string[];
}) {
  return api<{ report: any }>('/api/moderation/reports', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
