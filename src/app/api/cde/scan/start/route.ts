/**
 * POST /api/cde/scan/start — Start a new scan session
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { CDEEngine } from '@/server/cde/engine';
import { withOptionalAuth } from '@/server/auth/api-guard';

export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  entryType: z.enum(['location', 'condition', 'wellness']).optional(),
  bodyRegion: z.string().optional(),
  condition: z.string().optional(),
  initialMessage: z.string().optional(),
  prePopulatedFrom: z
    .object({
      scanSessionId: z.string().uuid(),
      tags: z.array(z.string()),
    })
    .optional(),
});

export const POST = withOptionalAuth(async (req: NextRequest, ctx) => {
  try {
    const body = await req.json().catch(() => ({}));
    const parsed = bodySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'validation_error', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { entryType, bodyRegion, condition, prePopulatedFrom } = parsed.data;

    // No entryType → PRE_TREE session: user must type first message before tree loads
    if (!entryType) {
      const result = await CDEEngine.startPreTreeSession({ userId: ctx?.userId });
      return NextResponse.json({
        success: true,
        data: {
          sessionId: result.sessionId,
          status: 'pre_tree',
          prompt: result.prompt,
          disclaimers: {
            standard:
              'Kriya QuickScan is a self-reported wellness risk tool. It is not a medical diagnosis and should not replace professional medical advice.',
          },
        },
      });
    }

    const result = await CDEEngine.startSession({
      userId: ctx?.userId,
      entryType,
      bodyRegion,
      condition,
      prePopulatedFrom: prePopulatedFrom
        ? {
            sessionId: prePopulatedFrom.scanSessionId,
            tags: prePopulatedFrom.tags.map((t) => ({
              tagId: t,
              sourceModule: 'cross_scan',
              sourceSessionId: prePopulatedFrom.scanSessionId,
              data: {},
              createdAt: new Date().toISOString(),
            })),
          }
        : undefined,
    });

    return NextResponse.json({
      success: true,
      data: {
        sessionId: result.sessionId,
        firstOutput: result.firstOutput,
        disclaimers: {
          standard:
            'Kriya QuickScan is a self-reported wellness risk tool. It is not a medical diagnosis and should not replace professional medical advice.',
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
