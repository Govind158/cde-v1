/**
 * POST /api/cde/scan/game-result — Submit game result
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { CDEEngine } from '@/server/cde/engine';
import { withOptionalAuth } from '@/server/auth/api-guard';

export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  sessionId: z.string().uuid(),
  gameId: z.string(),
  rawScore: z.number(),
  subScores: z
    .object({
      left: z.number().optional(),
      right: z.number().optional(),
    })
    .optional(),
  durationSeconds: z.number(),
  qualityFlag: z.enum(['valid', 'invalid', 'retry']),
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

    const { sessionId, gameId, rawScore, subScores, durationSeconds, qualityFlag } =
      parsed.data;

    if (qualityFlag === 'invalid') {
      return NextResponse.json({
        success: true,
        data: {
          interpretation: { status: 'invalid', message: 'Result marked as invalid' },
          careReady: false,
        },
      });
    }

    const result = await CDEEngine.processGameResult(
      sessionId,
      gameId,
      rawScore,
      subScores,
      durationSeconds
    );

    return NextResponse.json({
      success: true,
      data: {
        interpretation: result.interpretation,
        nextGame: result.nextGame ?? null,
        remainingGames: result.nextGame ? 1 : 0,
        careReady: result.careReady,
        treeOutput: result.treeOutput ?? null,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'internal_error', details: String(error) },
      { status: 500 }
    );
  }
});
