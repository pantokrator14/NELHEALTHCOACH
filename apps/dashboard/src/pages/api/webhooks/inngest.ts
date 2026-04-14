import type { NextApiRequest, NextApiResponse } from 'next';

interface WebhookPayload {
  type: 'recommendations_ready';
  clientId: string;
  sessionId: string;
  monthNumber: number;
  weekCount: number;
  errors: string[];
  timestamp: string;
}

interface WebhookResponse {
  success: boolean;
  message: string;
}

/**
 * POST /api/webhooks/inngest
 *
 * Receives notification from Inngest when recommendations are ready.
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<WebhookResponse>
): Promise<void> {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const body = req.body as WebhookPayload;

    if (!body?.type || !body.clientId) {
      console.error('[Inngest Webhook] Invalid payload', {
        hasType: !!body?.type,
        hasClientId: !!body?.clientId,
      });
      return res.status(400).json({
        success: false,
        message: 'Invalid payload: missing type or clientId',
      });
    }

    console.log('[Inngest Webhook] Received notification', {
      type: body.type,
      clientId: body.clientId,
      sessionId: body.sessionId,
      monthNumber: body.monthNumber,
      weekCount: body.weekCount,
    });

    if (body.type === 'recommendations_ready') {
      // TODO: Store in DB, push via WebSocket, or update cache
      // For now, just log it
      console.log('[Inngest Webhook] Recommendations ready for client', {
        clientId: body.clientId,
        sessionId: body.sessionId,
        weekCount: body.weekCount,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Webhook received',
    });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Inngest Webhook] Error processing webhook', errorMsg);

    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
}
