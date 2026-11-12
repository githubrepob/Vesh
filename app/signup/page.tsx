
"use client";

import { useActionState } from "react";
import Link from "next/link";

import { signupAction, type AuthState } from "../login/actions";

const initialState: AuthState = {};

export default function SignupPage() {
  const [state, formAction, pending] = useActionState(
    signupAction,
    initialState
  );

  return (
    <main className="min-h-screen bg-[#050606] text-[#eee] flex items-center justify-center px-5 py-12">
      <section className="w-full max-w-md">
        <Link href="/" className="inline-flex items-center gap-3 mb-12">
          <span className="flex items-center gap-[3px] h-6">
            <i className="block h-4 w-[3px] rounded-full bg-[#d9e6dd]" />
            <i className="block h-6 w-[3px] rounded-full bg-[#d9e6dd]" />
            <i className="block h-3 w-[3px] rounded-full bg-[#d9e6dd]" />
          </span>
          <span className="text-sm tracking-[.35em]">V E S H</span>
        </Link>

        <div className="rounded-3xl border border-white/10 bg-white/[.035] p-7 sm:p-9 shadow-2xl">
          <p className="text-[10px] tracking-[.24em] text-white/40 uppercase mb-4">
            Begin your journey
          </p>

          <h1 className="text-3xl font-normal tracking-tight">
            Create your VESH account.
          </h1>

          <p className="mt-3 text-sm leading-6 text-white/50">
            Your personal workspace starts here.
          </p>

          <form action={formAction} className="mt-8 space-y-5">
            <label className="block">
              <span className="block text-xs text-white/60 mb-2">
                Your name
              </span>

              <input
                type="text"
                name="displayName"
                required
                maxLength={80}
                autoComplete="name"
                placeholder="How should VESH address you?"
                className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none transition focus:border-white/30"
              />
            </label>

            <label className="block">
              <span className="block text-xs text-white/60 mb-2">
                Email address
              </span>

              <input
                type="email"
                name="email"
                required
                maxLength={254}
                autoComplete="email"
                placeholder="you@example.com"
                className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none transition focus:border-white/30"
              />
            </label>

            <label className="block">
              <span className="block text-xs text-white/60 mb-2">
                Password
              </span>

              <input
                type="password"
                name="password"
                required
                minLength={12}
                maxLength={128}
                autoComplete="new-password"
                placeholder="At least 12 characters"
                className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none transition focus:border-white/30"
              />
            </label>

            {state.error && (
              <p role="alert" className="text-sm text-red-300">
                {state.error}
              </p>
            )}

            {state.message && (
              <p role="status" className="text-sm text-emerald-300">
                {state.message}
              </p>
            )}

            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-xl bg-[#e8e9e2] text-[#171916] py-3.5 text-sm font-medium transition hover:bg-white disabled:opacity-50"
            >
              {pending ? "Creating account..." : "Create account"}
            </button>
          </form>

          <p className="mt-7 text-center text-sm text-white/45">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-white hover:underline underline-offset-4"
            >
              Sign in
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
