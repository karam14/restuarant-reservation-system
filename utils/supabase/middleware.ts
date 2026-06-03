import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

export const updateSession = async (request: NextRequest) => {
  try {
    let response = NextResponse.next();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options);
            });
          },
        },
      }
    );

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    const pathname = request.nextUrl.pathname;

    // Public routes that don't require auth
    const isPublicRoute =
      pathname === "/login" ||
      pathname.startsWith("/api/");

    if (isPublicRoute) {
      // If logged in and hitting /login, redirect to select-tenant
      if (pathname === "/login" && user) {
        return NextResponse.redirect(new URL("/select-tenant", request.url));
      }
      return response;
    }

    // Everything else requires auth
    if (error || !user) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    // Root redirect
    if (pathname === "/") {
      return NextResponse.redirect(new URL("/select-tenant", request.url));
    }

    // Legacy /admin routes redirect to select-tenant
    if (pathname.startsWith("/admin")) {
      return NextResponse.redirect(new URL("/select-tenant", request.url));
    }

    return response;
  } catch (e) {
    console.error("Error in middleware: ", e);
    return NextResponse.next();
  }
};
