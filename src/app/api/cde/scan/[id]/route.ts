/**
 * GET /api/cde/scan/[id] — Get scan session
 */

import { NextRequest, NextResponse } from 'next/server';
import { CDEEngine } from '@/server/cde/engine';
import { withOptionalAuth } from '@/server/auth/api-guard';

export const dynamic = 'force-dynamic';

export const GET = withOptionalAuth(async (req: NextRequest, ctx) => {
  try {
    const url = new URL(req.url);
    const segments = url.pathname.split('/');
    const sessionId = segments[segments.length - 1];

    if (!sessionId) {
      return NextResponse.json(
        { error: 'missing_session_id' },
        { status: 400 }
      );
    }

    const session = await CDEEngine.getSession(sessionId);

    if ('error' in session) {
      return NextResponse.json(
        { error: session.error },
        { status: 404 }
      );
    }

    // If authenticated, verify ownership
    if (ctx?.userId && session.userId && session.userId !== ctx.userId) {
      return NextResponse.json(
        { error: 'unauthorized', details: 'Session belongs to another user' },
        { status: 403 }
      );
    }

    // Always call completeSession to get fresh summary with parameterScores, musculageScore, etc.
    // This ensures game results are reflected even when careRecommendation was already stored.
    let careRecommendation = session.careRecommendation;
    let musculageScore = session.musculageScore ?? 0;
    let summary: Record<string, unknown> = {
      totalScore: session.totalScore ?? 0,
      riskTier: session.riskTier ?? (
        (session.totalScore ?? 0) >= 9 ? 'ORANGE' :
        (session.totalScore ?? 0) >= 5 ? 'YELLOW' : 'GREEN'
      ),
      hypotheses: (session.hypotheses ?? []).map((h) => ({
        condition: h.displayName,
        confidence: h.confidence,
      })),
      layerScores: session.layerScores ?? {},
      conditionTags: session.conditionTags ?? [],
      parameterScores: { BAL: null, ROM: null, MOB: null, REF: null },
    };

    try {
      const finalResult = await CDEEngine.completeSession(sessionId);
      careRecommendation = finalResult.careRecommendation;
      musculageScore = finalResult.musculageScore;
      summary = finalResult.summary;
    } catch {
      // completeSession failed — compute parameterScores manually from stored gameResults
      const gameResults = (session.gameResults ?? {}) as Record<string, { percentile?: number }>;
      const paramMap: Record<string, string> = { BB: 'BAL', FA: 'ROM', NN: 'MOB', KS: 'REF' };
      const parameterScores: Record<string, number | null> = { BAL: null, ROM: null, MOB: null, REF: null };
      for (const [gId, result] of Object.entries(gameResults)) {
        const percentile = result?.percentile ?? 0;
        if (percentile > 0) {
          const param = paramMap[gId.substring(0, 2)];
          if (param && (parameterScores[param] === null || percentile > (parameterScores[param] ?? 0))) {
            parameterScores[param] = Math.round(percentile);
          }
        }
      }
      summary.parameterScores = parameterScores;

      if (!careRecommendation) {
        careRecommendation = {
          pathwayId: 'cp_guided_general',
          name: 'Guided Recovery Program',
          description: 'A personalised program based on your assessment results.',
          providerTypes: ['Physiotherapist'],
          durationWeeks: 8,
          rationale: 'Based on your reported symptoms and risk profile.',
          alternatives: [],
        };
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        summary,
        careRecommendation,
        musculageScore,
        crossScanRecommendations: [],
        gameResults: session.gameResults ?? {},
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'internal_error', details: String(error) },
      { status: 500 }
    );
  }
});
