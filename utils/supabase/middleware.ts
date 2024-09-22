import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

export const updateSession = async (request: NextRequest) => {
  try {
    // Create a response object that we can modify
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

    // This will refresh the session if it's expired
    const { data: { user }, error } = await supabase.auth.getUser();

    // Redirect to the login page if user is not authenticated and trying to access protected routes
    if (request.nextUrl.pathname.startsWith("/admin") && error) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    // Redirect to the admin dashboard if the user is authenticated and tries to access the root path
    if (request.nextUrl.pathname === "/" && user) {
      return NextResponse.redirect(new URL("/admin", request.url));
    }

    return response;
  } catch (e) {
    console.error("Error in middleware: ", e);
    return NextResponse.next();
  }
};
