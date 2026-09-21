// ==============================================================================
// scripts/verify_admin_auth_flow.mjs
// Automated Verification for ShopMitra Admin Magic Link & RBAC Isolation
// ==============================================================================

let passed = 0;
let total = 0;

function assert(condition, testName, detail) {
  total++;
  if (condition) {
    console.log(`✅ [PASS] ${testName}`);
    passed++;
  } else {
    console.error(`❌ [FAIL] ${testName}${detail ? ` - ${detail}` : ''}`);
  }
}

// Logic mirror of getSafeRedirect in src/app/auth/callback/route.ts
function getSafeRedirect(next) {
  if (!next) return '/';
  let decoded = next;
  try {
    decoded = decodeURIComponent(next);
  } catch {}

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

// Logic mirror of route.ts destination decision
function determineAuthDestination({
  explicitNext,
  originatedFromAdmin,
  isAdmin,
  isSuspended,
}) {
  const safeNext = getSafeRedirect(explicitNext);

  if (isSuspended) {
    return '/admin/login?error=suspended';
  }

  if (isAdmin) {
    if (safeNext.startsWith('/admin') && safeNext !== '/admin/login') {
      return safeNext;
    }
    return '/admin/dashboard';
  }

  // Non-admin (Customer or Merchant)
  if (safeNext.startsWith('/admin')) {
    return '/';
  }
  return safeNext;
}

// Logic mirror of middleware /admin guard
function checkMiddlewareAdminAccess({
  isAuthenticated,
  role,
  status,
  pathname,
}) {
  if (pathname === '/admin/login') {
    return { allowed: true };
  }

  if (pathname.startsWith('/admin')) {
    if (!isAuthenticated) {
      return { allowed: false, redirectUrl: `/admin/login?next=${pathname}` };
    }

    const hasAdminPrivilege = Boolean(role && ['super_admin', 'admin', 'moderator'].includes(role));
    if (!hasAdminPrivilege) {
      return { allowed: false, redirectUrl: '/admin/login?error=unauthorized' };
    }

    if (status !== 'active') {
      return { allowed: false, redirectUrl: '/admin/login?error=suspended' };
    }

    return { allowed: true };
  }

  return { allowed: true };
}

async function runTests() {
  console.log('======================================================================');
  console.log('🧪 RUNNING SHOPMITRA ADMIN MAGIC LINK & ROUTING TESTS');
  console.log('======================================================================\n');

  // TEST 1: Admin → Magic Link → /admin/dashboard
  const test1a = determineAuthDestination({
    explicitNext: null, // Magic link without query param
    originatedFromAdmin: true,
    isAdmin: true,
    isSuspended: false,
  });
  assert(test1a === '/admin/dashboard', 'TEST 1A: Admin with no next param redirects to /admin/dashboard');

  const test1b = determineAuthDestination({
    explicitNext: '/admin/dashboard',
    originatedFromAdmin: true,
    isAdmin: true,
    isSuspended: false,
  });
  assert(test1b === '/admin/dashboard', 'TEST 1B: Admin with explicit /admin/dashboard redirects to /admin/dashboard');

  const test1c = determineAuthDestination({
    explicitNext: '/admin/merchant-verification',
    originatedFromAdmin: true,
    isAdmin: true,
    isSuspended: false,
  });
  assert(test1c === '/admin/merchant-verification', 'TEST 1C: Admin with sub-route /admin/merchant-verification preserves sub-route');

  // TEST 2: Customer → Magic Link → Customer page
  const test2a = determineAuthDestination({
    explicitNext: null,
    originatedFromAdmin: false,
    isAdmin: false,
    isSuspended: false,
  });
  assert(test2a === '/', 'TEST 2A: Customer with no next param redirects to / (consumer storefront)');

  const test2b = determineAuthDestination({
    explicitNext: '/wishlist',
    originatedFromAdmin: false,
    isAdmin: false,
    isSuspended: false,
  });
  assert(test2b === '/wishlist', 'TEST 2B: Customer with explicit /wishlist redirects to /wishlist');

  // TEST 3: Merchant → Magic Link → existing Merchant/Customer routing
  const test3a = determineAuthDestination({
    explicitNext: '/',
    originatedFromAdmin: false,
    isAdmin: false,
    isSuspended: false,
  });
  assert(test3a === '/', 'TEST 3A: Merchant default redirect goes to / where dual-account portal activates');

  const test3b = determineAuthDestination({
    explicitNext: '/account',
    originatedFromAdmin: false,
    isAdmin: false,
    isSuspended: false,
  });
  assert(test3b === '/account', 'TEST 3B: Merchant explicit relative path preserves destination');

  // TEST 4: Normal user manually opens /admin/dashboard → denied
  const test4a = determineAuthDestination({
    explicitNext: '/admin/dashboard',
    originatedFromAdmin: false,
    isAdmin: false,
    isSuspended: false,
  });
  assert(test4a === '/', 'TEST 4A: Non-admin attempting callback with next=/admin/dashboard is denied & sent to /');

  const test4b = checkMiddlewareAdminAccess({
    isAuthenticated: true,
    role: 'customer',
    status: 'active',
    pathname: '/admin/dashboard',
  });
  assert(
    !test4b.allowed && test4b.redirectUrl === '/admin/login?error=unauthorized',
    'TEST 4B: Authenticated Customer directly opening /admin/dashboard is denied by middleware'
  );

  const test4c = checkMiddlewareAdminAccess({
    isAuthenticated: true,
    role: 'merchant',
    status: 'active',
    pathname: '/admin/dashboard',
  });
  assert(
    !test4c.allowed && test4c.redirectUrl === '/admin/login?error=unauthorized',
    'TEST 4C: Authenticated Merchant directly opening /admin/dashboard is denied by middleware'
  );

  // TEST 5: Suspended admin → denied
  const test5a = determineAuthDestination({
    explicitNext: '/admin/dashboard',
    originatedFromAdmin: true,
    isAdmin: false,
    isSuspended: true,
  });
  assert(test5a === '/admin/login?error=suspended', 'TEST 5A: Suspended admin in callback is redirected to /admin/login?error=suspended');

  const test5b = checkMiddlewareAdminAccess({
    isAuthenticated: true,
    role: 'admin',
    status: 'suspended',
    pathname: '/admin/dashboard',
  });
  assert(
    !test5b.allowed && test5b.redirectUrl === '/admin/login?error=suspended',
    'TEST 5B: Suspended admin opening /admin/dashboard is denied by middleware with error=suspended'
  );

  // TEST 6: Admin logs out → session ends
  const test6 = checkMiddlewareAdminAccess({
    isAuthenticated: false, // session cleared
    role: undefined,
    status: undefined,
    pathname: '/admin/dashboard',
  });
  assert(
    !test6.allowed && test6.redirectUrl === '/admin/login?next=/admin/dashboard',
    'TEST 6: After sign out, attempting to access /admin/dashboard redirects to /admin/login'
  );

  // TEST 7: Admin logs in again → /admin/dashboard
  const test7 = determineAuthDestination({
    explicitNext: '/admin/dashboard',
    originatedFromAdmin: true,
    isAdmin: true,
    isSuspended: false,
  });
  assert(test7 === '/admin/dashboard', 'TEST 7: Admin logging in again after session recreation lands on /admin/dashboard');

  // Security: Open redirect prevention tests
  const evilUrl1 = getSafeRedirect('https://malicious-site.com');
  assert(evilUrl1 === '/', 'Security: External URL in next param is rejected');

  const evilUrl2 = getSafeRedirect('//malicious-site.com');
  assert(evilUrl2 === '/', 'Security: Protocol-relative // URL in next param is rejected');

  const evilUrl3 = getSafeRedirect('javascript:alert(1)');
  assert(evilUrl3 === '/', 'Security: JavaScript URI scheme in next param is rejected');

  console.log('\n======================================================================');
  console.log(`📊 TEST SUMMARY: ${passed} / ${total} TESTS PASSED`);
  console.log('======================================================================\n');

  if (passed !== total) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
