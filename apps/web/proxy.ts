import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

const PUBLIC_PREFIXES = ["/sign-in", "/sign-up", "/forgot-password", "/api/auth", "/api/healthz", "/api/readyz"];

function isPublicPath(pathname: string): boolean {
  if (pathname === "/") return true;
  return PUBLIC_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function applySecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  return response;
}

export async function proxy(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request });
  const pathname = request.nextUrl.pathname;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const hasLiveSupabase = Boolean(
    supabaseUrl && supabaseAnonKey && !supabaseUrl.includes("example.supabase.co")
  );

  if (hasLiveSupabase && supabaseUrl && supabaseAnonKey) {
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    });

    const { data } = await supabase.auth.getUser();
    if (!data.user && !isPublicPath(pathname) && !pathname.startsWith("/api/")) {
      const loginUrl = new URL("/sign-in", request.url);
      loginUrl.searchParams.set("redirectTo", pathname);
      return applySecurityHeaders(NextResponse.redirect(loginUrl));
    }
  } else {
    const demoCookie = request.cookies.get("bp_demo_actor")?.value;
    if (demoCookie === "signed_out" && !isPublicPath(pathname) && !pathname.startsWith("/api/")) {
      const loginUrl = new URL("/sign-in", request.url);
      loginUrl.searchParams.set("redirectTo", pathname);
      return applySecurityHeaders(NextResponse.redirect(loginUrl));
    }
  }

  return applySecurityHeaders(response);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
