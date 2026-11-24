import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { sanitizeRedirectPath } from '@/features/auth/api/auth';

export const config = {
  matcher: [
    '/wardrobe/:path*',
    '/outfits/:path*',
    '/planner/:path*',
    '/shopping/:path*',
    '/try-on/:path*',
    '/profile/:path*',
    '/login',
    '/signup',
  ],
};

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const response = NextResponse.next({ request: { headers: request.headers } });

  if (process.env['PLAYWRIGHT_TEST'] === '1') {
    return response;
  }

  const supabaseUrl = process.env['NEXT_PUBLIC_SUPABASE_URL'];
  const supabaseKey =
    process.env['NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'] ||
    process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'];
  if (!supabaseUrl || !supabaseKey) {
    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isAuthRoute = pathname === '/login' || pathname === '/signup';

  if (isAuthRoute) {
    if (user) {
      const target = sanitizeRedirectPath(
        request.nextUrl.searchParams.get('redirectTo'),
        '/wardrobe'
      );
      return NextResponse.redirect(new URL(target, request.url));
    }
    return response;
  }

  if (!user) {
    const redirectTo = request.nextUrl.pathname + request.nextUrl.search;
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirectTo', redirectTo);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}
