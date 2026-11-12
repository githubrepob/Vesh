"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type SharedStats = { current_streak: number; total_days: number; created_at: string };

export default function StreakSharePage({ token }: { token: string }) {
  const [stats, setStats] = useState<SharedStats | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/attendance/share/${encodeURIComponent(token)}`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok || !payload.share) throw new Error(payload.error || "This share link is unavailable.");
        setStats(payload.share as SharedStats);
      })
      .catch((caught: unknown) => {
        if (caught instanceof Error && caught.name !== "AbortError") setError(caught.message);
      });
    return () => controller.abort();
  }, [token]);

  return (
    <main style={{ minHeight: "100vh", background: "radial-gradient(circle at 50% 20%, #17231f 0, #070a09 42%, #030404 100%)", color: "#edf2ee", display: "grid", placeItems: "center", padding: 24, fontFamily: "Arial, sans-serif" }}>
      <section style={{ width: "min(100%, 520px)", border: "1px solid rgba(196,223,206,.18)", borderRadius: 28, padding: 32, background: "rgba(13,19,16,.86)", boxShadow: "0 24px 90px rgba(0,0,0,.45)" }}>
        <div style={{ letterSpacing: ".38em", fontSize: 13, color: "#c4dfce", fontWeight: 700 }}>V E S H</div>
        {error ? <><h1 style={{ fontSize: 28, marginTop: 36 }}>This streak link is unavailable.</h1><p style={{ color: "#9ca9a1", lineHeight: 1.6 }}>{error}</p></> : !stats ? <p style={{ color: "#9ca9a1", marginTop: 42 }}>Loading shared progress…</p> : <>
          <p style={{ color: "#a8b6ad", letterSpacing: ".16em", fontSize: 11, marginTop: 42 }}>A LITTLE CONSISTENCY GOES A LONG WAY</p>
          <h1 style={{ fontSize: "clamp(32px, 7vw, 48px)", lineHeight: 1.08, margin: "14px 0" }}>Showing up, one day at a time.</h1>
          <p style={{ color: "#9ca9a1", lineHeight: 1.6 }}>Someone in the VESH community is building a habit of showing up for themselves.</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, margin: "28px 0" }}>
            <div style={{ background: "rgba(255,255,255,.045)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 18, padding: 20 }}><strong style={{ display: "block", fontSize: 42, color: "#e5bd91", fontWeight: 500 }}>{stats.current_streak}</strong><span style={{ color: "#aab5ae", fontSize: 13 }}>Current day streak</span></div>
            <div style={{ background: "rgba(255,255,255,.045)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 18, padding: 20 }}><strong style={{ display: "block", fontSize: 42, color: "#e5bd91", fontWeight: 500 }}>{stats.total_days}</strong><span style={{ color: "#aab5ae", fontSize: 13 }}>Days showed up</span></div>
          </div>
          <p style={{ color: "#aab5ae", fontSize: 14, lineHeight: 1.6 }}>No competition. Just a reminder that small steps add up.</p>
        </>}
        <Link href="/signup" style={{ display: "block", textAlign: "center", textDecoration: "none", background: "#c4dfce", color: "#101713", fontWeight: 700, padding: "15px 18px", borderRadius: 14, marginTop: 28 }}>Build your own streak with VESH ↗</Link>
        <p style={{ color: "#68756d", fontSize: 11, textAlign: "center", marginTop: 20 }}>Your time. Your focus. Your pace.</p>
      </section>
    </main>
  );
}
