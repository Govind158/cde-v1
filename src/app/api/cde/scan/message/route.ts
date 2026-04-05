/**
 * POST /api/cde/scan/message — Send a chat message
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ChatOrchestrator } from '@/server/cde/llm/chat-orchestrator';
import { withOptionalAuth } from '@/server/auth/api-guard';

export const dynamic = 'force-dynamic';

/** Strip any extraction artifacts that leaked through parsing */
function sanitizeResponseForClient(response: string): string {
  let clean = response
    .replace(/```(?:json)?[\s\S]*?```/g, '')
    .replace(/---EXTRACTION---[\s\S]*/g, '')
    .replace(/<structured_extraction>[\s\S]*?<\/structured_extraction>/g, '')
    .replace(/#{1,3}\s*(?:Structured\s*)?[Ee]xtraction[\s\S]*/g, '')
    .replace(/#{1,3}\s*Conversation\s*response\s*/gi, '')
    .replace(/\{[^{}]*"bodyRegion"[^{}]*\}/g, '')
    .replace(/\{[^{}]*"cdeReady"[^{}]*\}/g, '')
    .replace(/\{[^{}]*"missingFields"[^{}]*\}/g, '')
    .replace(/---\s*$/gm, '')
    .replace(/here'?s what i'?ve gathered[\s\S]*/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (clean.length < 10) {
    clean = 'Thank you for sharing that. Let me continue with your assessment.';
  }
  return clean;
}

const bodySchema = z.object({
  sessionId: z.string().uuid(),
  message: z.string().min(1).max(2000),
});

export const POST = withOptionalAuth(async (req: NextRequest, ctx) => {
  try {
    const body = await req.json();
    const parsed = bodySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'validation_error', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { sessionId, message } = parsed.data;

    const result = await ChatOrchestrator.processMessage(sessionId, message);

    return NextResponse.json({
      success: true,
      data: {
        conversationResponse: sanitizeResponseForClient(result.conversationResponse),
        cdeOutput: result.cdeOutput,
        sessionState: result.sessionState,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'internal_error', details: String(error) },
      { status: 500 }
    );
  }
});
