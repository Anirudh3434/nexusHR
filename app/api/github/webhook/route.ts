import { NextRequest } from 'next/server';
import { POST as mainWebhookHandler } from '@/app/api/webhooks/github/route';

/**
 * Secondary alias endpoint for GitHub webhooks.
 * Forwards directly to the unified webhook processor.
 */
export async function POST(req: Request) {
  return mainWebhookHandler(req as NextRequest);
}
