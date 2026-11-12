
"use client";

import { useActionState } from "react";
import Link from "next/link";

import { loginAction, type AuthState } from "./actions";

const initialState: AuthState = {};

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(
    loginAction,
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
            Welcome back
          </p>

          <h1 className="text-3xl font-normal tracking-tight">
            Sign in to VESH.
          </h1>

          <p className="mt-3 text-sm leading-6 text-white/50">
            Continue your conversations and pick up where you left off.
          </p>

          <form action={formAction} className="mt-8 space-y-5">
            <label className="block">
              <span className="block text-xs text-white/60 mb-2">
                Email address
              </span>

              <input
                type="email"
                name="email"
                required
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
                autoComplete="current-password"
                maxLength={128}
                placeholder="Your password"
                className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none transition focus:border-white/30"
              />
            </label>

            {state.error && (
              <p role="alert" className="text-sm text-red-300">
                {state.error}
              </p>
            )}

            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-xl bg-[#e8e9e2] text-[#171916] py-3.5 text-sm font-medium transition hover:bg-white disabled:opacity-50"
            >
              {pending ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <p className="mt-7 text-center text-sm text-white/45">
            New to VESH?{" "}
            <Link
              href="/signup"
              className="text-white hover:underline underline-offset-4"
            >
              Create an account
            </Link>
          </p>
        </div>

        <p className="mt-6 text-center text-[10px] tracking-wider text-white/25">
          YOUR PERSONAL AMBIENT INTELLIGENCE
        </p>
      </section>
    </main>
  );
}
