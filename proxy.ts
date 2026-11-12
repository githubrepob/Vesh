import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const pathname = request.nextUrl.pathname;

  const isProtectedWorkspace = pathname.startsWith("/workspace");
  const isProtectedAssistantApi = pathname.startsWith("/api/assistant");
  const isProtectedAttendanceApi = pathname.startsWith("/api/attendance");
  const isLoginPage = pathname === "/login";
  const isSignupPage = pathname === "/signup";

  if (!supabaseUrl || !supabaseKey) {
    if (
      isProtectedWorkspace ||
      isProtectedAssistantApi ||
      isProtectedAttendanceApi
    ) {
      return NextResponse.json(
        { error: "Authentication service is not configured." },
        { status: 503 },
      );
    }

    return response;
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          response = NextResponse.next({ request });

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  const isAuthenticated = Boolean(user && !error);

  if (
    !isAuthenticated &&
    (
      isProtectedWorkspace ||
      isProtectedAssistantApi ||
      isProtectedAttendanceApi
    )
  ) {
    if (isProtectedAssistantApi || isProtectedAttendanceApi) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 },
      );
    }

    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);

    const redirectResponse = NextResponse.redirect(loginUrl);

    response.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie);
    });

    return redirectResponse;
  }

  if (isAuthenticated && (isLoginPage || isSignupPage)) {
    const redirectResponse = NextResponse.redirect(
      new URL("/workspace", request.url),
    );

    response.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie);
    });

    return redirectResponse;
  }

  return response;
}

export const config = {
  matcher: [
    "/workspace/:path*",
    "/api/assistant/:path*",
    "/api/attendance/:path*",
    "/login",
    "/signup",
  ],
};