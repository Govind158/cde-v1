/**
 * POST /api/cde/scan/complete — Complete scan session
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { CDEEngine } from '@/server/cde/engine';
import { withOptionalAuth } from '@/server/auth/api-guard';

export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  sessionId: z.string().uuid(),
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

    const { sessionId } = parsed.data;

    const result = await CDEEngine.completeSession(sessionId);

    return NextResponse.json({
      success: true,
      data: {
        summary: result.summary,
        careRecommendation: result.careRecommendation,
        musculageScore: result.musculageScore,
        crossScanRecommendations: result.crossScanRecommendations,
        conditionTags: (result.summary as any).conditionTags ?? [],
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'internal_error', details: String(error) },
      { status: 500 }
    );
  }
});
