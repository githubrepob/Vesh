
"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

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
      error: "Site URL is not configured. Add NEXT_PUBLIC_SITE_URL to .env.local.",
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
    redirect("/workspace");
  }

  return {
    message:
      "Your account has been created. Check your email for the confirmation link before signing in.",
  };
}

export async function logoutAction(): Promise<void> {
  const supabase = await createClient();

  await supabase.auth.signOut();

  redirect("/login");
}
