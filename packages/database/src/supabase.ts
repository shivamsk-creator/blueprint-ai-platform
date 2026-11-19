import { createBrowserClient, createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { DomainError } from "@blueprint/domain";

export interface CookieStoreAdapter {
  getAll(): Array<{ name: string; value: string }>;
  setAll?(cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>): void;
}

export function createSupabaseBrowserClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new DomainError({
      status: 500,
      code: "SUPABASE_NOT_CONFIGURED",
      title: "Supabase Configuration Missing",
      detail: "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be configured.",
    });
  }
  return createBrowserClient(url, anonKey);
}

export function createSupabaseServerClient(cookiesAdapter: CookieStoreAdapter): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new DomainError({
      status: 500,
      code: "SUPABASE_NOT_CONFIGURED",
      title: "Supabase Configuration Missing",
      detail: "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be configured.",
    });
  }
  return createServerClient(url, anonKey, {
    cookies: {
      getAll: () => cookiesAdapter.getAll(),
      setAll: (cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>) => {
        try {
          cookiesAdapter.setAll?.(cookiesToSet);
        } catch {
          // Server Components cannot mutate response cookies directly; Proxy refreshes sessions.
        }
      },
    },
  });
}

export function createSupabaseServiceRoleClient(): SupabaseClient {
  if (typeof globalThis !== "undefined" && "document" in globalThis) {
    throw new Error("SECURITY VIOLATION: Service-role Supabase client must never execute in the browser.");
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new DomainError({
      status: 500,
      code: "SUPABASE_SERVICE_ROLE_MISSING",
      title: "Service-Role Configuration Missing",
      detail: "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured on the server/worker.",
    });
  }
  return createClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
