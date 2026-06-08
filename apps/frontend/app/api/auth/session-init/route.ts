import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

function resolveReturnTo(raw: string | null): string {
  if (raw && raw.startsWith('/')) {
    return raw;
  }
  return '/';
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { getAccessTokenRaw } = getKindeServerSession();

  const tokenRaw = await getAccessTokenRaw();
  if (!tokenRaw) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  try {
    await fetch(`${API_URL}/auth/session`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenRaw}`,
      },
    });
  } catch (err) {
    console.error('[session-init] Failed to call backend POST /auth/session:', err);
  }

  const returnTo = resolveReturnTo(request.nextUrl.searchParams.get('returnTo'));
  return NextResponse.redirect(new URL(returnTo, request.url));
}
