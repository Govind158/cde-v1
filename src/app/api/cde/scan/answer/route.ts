/**
 * POST /api/cde/scan/answer — Submit structured answer
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { CDEEngine } from '@/server/cde/engine';
import { withOptionalAuth } from '@/server/auth/api-guard';

export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  sessionId: z.string().uuid(),
  questionId: z.string(),
  answer: z.union([z.string(), z.array(z.string())]),
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

    const { sessionId, questionId, answer } = parsed.data;

    const cdeOutput = await CDEEngine.processAnswer(sessionId, questionId, answer);

    return NextResponse.json({
      success: true,
      data: {
        cdeOutput,
        sessionState: {
          currentLayer: cdeOutput.auditEntry?.layer ?? 0,
          progressPercent: 0,
        },
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'internal_error', details: String(error) },
      { status: 500 }
    );
  }
});
