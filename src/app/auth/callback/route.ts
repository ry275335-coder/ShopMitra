// ==============================================================================
// src/app/auth/callback/route.ts
// Handles Supabase magic link & email OTP callback with secure server-side RBAC
// Ensures strictly authorized admin redirection to /admin/dashboard
// ==============================================================================

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { createAdminSupabase } from '@/lib/supabase/server';

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

  // Check if login originated from /admin/login (via cookie or next param)
  const adminOriginCookie = request.cookies.get('sm_admin_login_intent')?.value === '1';
  const originatedFromAdmin = adminOriginCookie || Boolean(explicitNext && explicitNext.startsWith('/admin'));

  const cookiesToSet: { name: string; value: string; options: CookieOptions }[] = [];
  const inMemoryCookies = new Map<string, string>();
  request.cookies.getAll().forEach((c) => inMemoryCookies.set(c.name, c.value));

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return inMemoryCookies.get(name) ?? request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          inMemoryCookies.set(name, value);
          cookiesToSet.push({ name, value, options });
        },
        remove(name: string, options: CookieOptions) {
          inMemoryCookies.delete(name);
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
    // 1. Strictly verify admin privileges server-side against admin_users table
    let isActiveAdmin = false;
    let isSuspended = false;
    let adminRole: string | undefined;

    try {
      const adminDb = createAdminSupabase();
      const { data: adminRecord, error: adminErr } = await adminDb
        .from('admin_users')
        .select('id, user_id, admin_role, status')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!adminErr && adminRecord) {
        adminRole = adminRecord.admin_role;
        if (adminRecord.status === 'suspended') {
          isSuspended = true;
        } else if (
          adminRecord.status === 'active' &&
          ['super_admin', 'admin', 'moderator'].includes(adminRecord.admin_role)
        ) {
          isActiveAdmin = true;
        }
      } else {
        // Fallback check against profiles for legacy compatibility
        const { data: profile } = await adminDb
          .from('profiles')
          .select('id, role, is_active, status')
          .eq('id', user.id)
          .maybeSingle();

        if (profile && ['super_admin', 'admin', 'moderator'].includes(profile.role)) {
          adminRole = profile.role;
          if (profile.status === 'suspended' || profile.is_active === false) {
            isSuspended = true;
          } else {
            isActiveAdmin = true;
          }
        }
      }
    } catch (authErr) {
      console.error('Server-side admin_users verification error in callback:', authErr);
    }

    const safeNext = getSafeRedirect(explicitNext);
    let destination = '/';

    // 2. Perform server-side authorization and routing
    if (isSuspended) {
      // Suspended admin is strictly denied access
      destination = '/admin/login?error=suspended';
    } else if (isActiveAdmin) {
      // Active Admin:
      // If user explicitly requested an internal /admin sub-route, preserve it
      if (safeNext.startsWith('/admin') && safeNext !== '/admin/login') {
        destination = safeNext;
      } else {
        // Otherwise, active admin always lands on /admin/dashboard
        destination = '/admin/dashboard';
      }
    } else {
      // Normal Customer or Merchant (Non-Admin):
      // Prevent non-admins from being routed to /admin routes even if next param was manually forged
      if (safeNext.startsWith('/admin')) {
        destination = '/';
      } else {
        destination = safeNext;
      }
    }

    const redirectUrl = new URL(destination, cleanOrigin);
    if (!destination.includes('error=')) {
      redirectUrl.searchParams.set('auth', 'success');
    }

    const response = NextResponse.redirect(redirectUrl.toString());

    // Apply Supabase session cookies
    cookiesToSet.forEach(({ name, value, options }) => {
      response.cookies.set({ name, value, ...options });
    });

    // Clear the admin origin tracking cookie once handled
    if (adminOriginCookie) {
      response.cookies.set({
        name: 'sm_admin_login_intent',
        value: '',
        maxAge: 0,
        path: '/',
      });
    }

    return response;
  }

  // If authentication failed or code exchange failed
  const failureDestination = originatedFromAdmin ? '/admin/login?error=auth_failed' : '/?auth=error';
  const failRedirect = NextResponse.redirect(new URL(failureDestination, cleanOrigin).toString());
  cookiesToSet.forEach(({ name, value, options }) => {
    failRedirect.cookies.set({ name, value, ...options });
  });
  if (adminOriginCookie) {
    failRedirect.cookies.set({
      name: 'sm_admin_login_intent',
      value: '',
      maxAge: 0,
      path: '/',
    });
  }
  return failRedirect;
}
