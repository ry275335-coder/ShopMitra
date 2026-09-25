// ==============================================================================
// src/middleware.ts
// Next.js App Router Middleware — Session Refresh + Route Protection
// Uses @supabase/ssr to keep auth cookies fresh on every request
// ==============================================================================

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Routes that require authentication
const PROTECTED_CUSTOMER_ROUTES = ['/account', '/profile', '/wishlist', '/alerts'];
const PROTECTED_MERCHANT_ROUTES = ['/merchant'];
const PROTECTED_ADMIN_ROUTES = ['/admin'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Create a response object that we'll potentially modify
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // Build Supabase server client that reads/writes cookies from this request/response
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: CookieOptions }>) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set({ name, value, ...options })
          );
        },
      },
    }
  );

  const redirectWithCookies = (url: URL | string) => {
    const res = NextResponse.redirect(url);
    response.cookies.getAll().forEach((c) => res.cookies.set(c));
    return res;
  };

  // IMPORTANT: Validate user via getUser() — this safely authenticates the JWT
  // with Supabase Auth and extends session cookies
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthenticated = !!user;

  // ── Admin route protection ──────────────────────────────────────────────────
  if (pathname === '/admin/login') {
    if (request.nextUrl.searchParams.has('error')) {
      return response;
    }
    if (isAuthenticated && user) {
      // If already authenticated, check if user is an active admin
      const { data: adminUser } = await supabase
        .from('admin_users')
        .select('admin_role, status')
        .eq('user_id', user.id)
        .maybeSingle();

      const { data: profile } = !adminUser
        ? await supabase.from('profiles').select('role, is_active').eq('id', user.id).maybeSingle()
        : { data: null };

      const role = adminUser?.admin_role || profile?.role;
      const isActive = adminUser ? adminUser.status === 'active' : profile?.is_active !== false;
      const isAdmin = role && ['super_admin', 'admin', 'moderator'].includes(role);

      if (isAdmin && isActive) {
        return redirectWithCookies(new URL('/admin/dashboard', request.url));
      }
    }
    // Unauthenticated or non-admin visiting /admin/login is allowed
    return response;
  }

  if (pathname.startsWith('/admin')) {
    if (!isAuthenticated || !user) {
      const loginUrl = new URL('/admin/login', request.url);
      loginUrl.searchParams.set('next', pathname);
      return redirectWithCookies(loginUrl);
    }

    // 1. Query dedicated admin_users table
    const { data: adminUser } = await supabase
      .from('admin_users')
      .select('admin_role, status')
      .eq('user_id', user.id)
      .maybeSingle();

    let role = adminUser?.admin_role;
    let isActive = adminUser?.status === 'active';

    // 2. Compatibility fallback: query profiles
    if (!adminUser) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, is_active')
        .eq('id', user.id)
        .maybeSingle();

      if (profile && ['super_admin', 'admin', 'moderator'].includes(profile.role)) {
        role = profile.role;
        isActive = profile.is_active !== false;
      }
    }

    const hasAdminPrivilege = Boolean(role && ['super_admin', 'admin', 'moderator'].includes(role));

    if (!hasAdminPrivilege) {
      const unauthUrl = new URL('/admin/login', request.url);
      unauthUrl.searchParams.set('error', 'unauthorized');
      return redirectWithCookies(unauthUrl);
    }

    if (!isActive) {
      const suspendedUrl = new URL('/admin/login', request.url);
      suspendedUrl.searchParams.set('error', 'suspended');
      return redirectWithCookies(suspendedUrl);
    }

    // Super Admin specific route restriction
    const SUPER_ADMIN_ONLY_ROUTES = ['/admin/admin-management', '/admin/settings', '/admin/security'];
    if (SUPER_ADMIN_ONLY_ROUTES.some((r) => pathname.startsWith(r)) && role !== 'super_admin') {
      const forbiddenUrl = new URL('/admin/dashboard', request.url);
      forbiddenUrl.searchParams.set('error', 'forbidden');
      return redirectWithCookies(forbiddenUrl);
    }
  }

  // ── Merchant route protection ───────────────────────────────────────────────
  if (PROTECTED_MERCHANT_ROUTES.some((r) => pathname.startsWith(r))) {
    if (!isAuthenticated || !user) {
      return NextResponse.redirect(new URL('/?auth=required&role=merchant', request.url));
    }
    // Check merchant role and active account status
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_active')
      .eq('id', user.id)
      .single();

    if (!profile || !['merchant', 'admin'].includes(profile.role)) {
      return NextResponse.redirect(new URL('/?auth=unauthorized', request.url));
    }

    if (profile.is_active === false) {
      return NextResponse.redirect(new URL('/?auth=suspended', request.url));
    }
  }

  // ── Customer protected routes ───────────────────────────────────────────────
  if (PROTECTED_CUSTOMER_ROUTES.some((r) => pathname.startsWith(r))) {
    if (!isAuthenticated || !user) {
      return NextResponse.redirect(new URL('/?auth=required', request.url));
    }
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_active')
      .eq('id', user.id)
      .single();

    if (profile && profile.is_active === false) {
      return NextResponse.redirect(new URL('/?auth=suspended', request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, logo.svg, robots.txt, sitemap.xml
     * - manifest.json and other PWA assets
     * - Public images and icons
     */
    '/((?!_next/static|_next/image|favicon.ico|logo.svg|robots.txt|sitemap.xml|manifest.json|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
