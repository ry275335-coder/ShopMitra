// ==============================================================================
// src/app/auth/callback/route.ts
// Handles Supabase magic link & email OTP callback
// When user clicks the email link, this exchanges the token for a session
// ==============================================================================

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

function getSafeRedirect(next: string | null): string {
  if (!next) return '/';

  let decoded = next;
  try {
    decoded = decodeURIComponent(next);
  } catch {}

  // Only permit safe internal relative paths:
  // Must start with a single '/', not '//', not contain backslashes or protocol schemes
  if (
    decoded.startsWith('/') &&
    !decoded.startsWith('//') &&
    !decoded.includes('\\') &&
    !decoded.includes('\0') &&
    !/^\/[/\\]/.test(decoded) &&
    !/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(decoded.slice(1))
  ) {
    return decoded;
  }

  return '/';
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || origin || 'http://localhost:3000';
  const cleanOrigin = siteUrl.replace('0.0.0.0', 'localhost');

  const code = searchParams.get('code');
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type');
  const explicitNext = searchParams.get('next');

  const cookiesToSet: { name: string; value: string; options: CookieOptions }[] = [];

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          cookiesToSet.push({ name, value, options });
        },
        remove(name: string, options: CookieOptions) {
          cookiesToSet.push({ name, value: '', options: { ...options, maxAge: 0 } });
        },
      },
    }
  );

  let user = null;

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data?.user) {
      user = data.user;
    }
  } else if (token_hash && type) {
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as any,
    });
    if (!error && data?.user) {
      user = data.user;
    }
  }

  if (user) {
    const safeNext = getSafeRedirect(explicitNext);
    let destination = safeNext;

    // If destination was not explicitly specified or resolved to root, check if user is an active admin
    if (!explicitNext || destination === '/') {
      const { data: adminRecord } = await supabase
        .from('admin_users')
        .select('admin_role, status')
        .eq('user_id', user.id)
        .maybeSingle();

      if (adminRecord && adminRecord.status === 'active') {
        destination = '/admin/dashboard';
      } else {
        destination = '/';
      }
    }

    const redirectUrl = new URL(destination, cleanOrigin);
    redirectUrl.searchParams.set('auth', 'success');

    const response = NextResponse.redirect(redirectUrl.toString());
    cookiesToSet.forEach(({ name, value, options }) => {
      response.cookies.set({ name, value, ...options });
    });
    return response;
  }

  // If something went wrong, redirect to home with error flag
  const failRedirect = NextResponse.redirect(`${cleanOrigin}/?auth=error`);
  cookiesToSet.forEach(({ name, value, options }) => {
    failRedirect.cookies.set({ name, value, ...options });
  });
  return failRedirect;
}
