import { handleAuth } from '@kinde-oss/kinde-auth-nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

const kindeHandler = handleAuth();

export async function GET(
  request: NextRequest,
  context: { params: { kindeAuth: string } },
) {
  try {
    const response = (await kindeHandler(request, context)) as Response;
    // 3xx redirects are successful auth steps — pass them through unchanged.
    // 4xx/5xx (e.g. "State not found" after an expired session) get a friendly redirect.
    if (response.status >= 400) {
      return NextResponse.redirect(new URL('/auth-error', request.url));
    }
    return response;
  } catch {
    return NextResponse.redirect(new URL('/auth-error', request.url));
  }
}
