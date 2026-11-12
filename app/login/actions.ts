
"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

export type AuthState = {
  error?: string;
  message?: string;
};

export async function loginAction(
  _previousState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();

  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Enter your email and password." };
  }

  if (password.length > 128) {
    return { error: "Invalid email or password." };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return {
      error: "Unable to sign in. Check your credentials and try again.",
    };
  }

  revalidatePath("/", "layout");
  redirect("/workspace");
}

export async function signupAction(
  _previousState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const displayName = String(formData.get("displayName") ?? "").trim();

  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();

  const password = String(formData.get("password") ?? "");

  if (!displayName || !email || !password) {
    return { error: "Complete all fields." };
  }

  if (displayName.length > 80) {
    return { error: "Your display name must be 80 characters or fewer." };
  }

  if (password.length < 12) {
    return {
      error: "Use a password with at least 12 characters.",
    };
  }

  if (password.length > 128) {
    return { error: "Your password is too long." };
  }

  const supabase = await createClient();

  const origin = process.env.NEXT_PUBLIC_SITE_URL;

  if (!origin) {
    return {
      error:
        "Site URL is not configured. Add NEXT_PUBLIC_SITE_URL to .env.local.",
    };
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: displayName,
      },
      emailRedirectTo: `${origin}/auth/callback?next=/workspace`,
    },
  });

  if (error) {
    return {
      error: "Unable to create your account. Check your details and try again.",
    };
  }

  if (data.session) {
    revalidatePath("/", "layout");
    redirect("/workspace");
  }

  return {
    message:
      "Your account has been created. Check your email for the confirmation link before signing in.",
  };
}

export async function logoutAction(_formData: FormData): Promise<void> {
  const cookieStore = await cookies();
  const supabase = await createClient();

  // Attempt to revoke this session at Supabase. A transient Auth API failure
  // must not prevent this browser from clearing its local session cookies.
  try {
    await supabase.auth.signOut({ scope: "local" });
  } catch {
    // Continue with local cookie cleanup below.
  }

  // Supabase SSR may split the auth token into multiple cookies.
  for (const cookie of cookieStore.getAll()) {
    if (
      cookie.name.startsWith("sb-") &&
      (cookie.name.includes("-auth-token") ||
        cookie.name.includes("-code-verifier"))
    ) {
      cookieStore.delete(cookie.name);
    }
  }

  revalidatePath("/", "layout");
  redirect("/login");
}
