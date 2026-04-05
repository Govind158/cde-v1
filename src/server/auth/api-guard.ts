/**
 * API Guard — withAuth Higher-Order Function
 * Wraps API route handlers with authentication
 */

import { NextRequest, NextResponse } from 'next/server';

interface AuthContext {
  userId: string;
  email: string;
}

type AuthenticatedHandler = (
  req: NextRequest,
  ctx: AuthContext
) => Promise<NextResponse>;

export function withAuth(handler: AuthenticatedHandler) {
  return async (req: NextRequest) => {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'unauthorized', details: 'Missing or invalid authorization header' },
        { status: 401 }
      );
    }

    // In production, validate the JWT token here
    const token = authHeader.slice(7);
    try {
      // Placeholder: decode token to get user context
      const ctx: AuthContext = {
        userId: token, // In production, extract from JWT
        email: '',
      };
      return handler(req, ctx);
    } catch {
      return NextResponse.json(
        { error: 'unauthorized', details: 'Invalid token' },
        { status: 401 }
      );
    }
  };
}

export function withOptionalAuth(
  handler: (req: NextRequest, ctx: AuthContext | null) => Promise<NextResponse>
) {
  return async (req: NextRequest) => {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return handler(req, null);
    }

    const token = authHeader.slice(7);
    try {
      const ctx: AuthContext = { userId: token, email: '' };
      return handler(req, ctx);
    } catch {
      return handler(req, null);
    }
  };
}
