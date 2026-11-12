"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Check, Copy, Flame, ShareNetwork, X } from "@phosphor-icons/react";

type AttendanceStats = {
  checkedInToday: boolean;
  currentStreak: number;
  totalDays: number;
  lastCheckIn: string | null;
};

type ApiResponse = {
  attendance?: AttendanceStats;
  error?: string;
  alreadyCheckedIn?: boolean;
};

async function readApiResponse(response: Response): Promise<ApiResponse> {
  const contentType = response.headers.get("content-type") ?? "";
  const raw = await response.text();

  if (!contentType.toLowerCase().includes("application/json")) {
    if (response.status === 404) {
      throw new Error("Attendance API route not found. Check app/api/attendance/route.ts and restart the dev server.");
    }
    if (response.redirected || response.url.includes("/login")) {
      throw new Error("The attendance request was redirected to sign-in. Check the API authentication proxy.");
    }
    throw new Error(`Attendance API returned HTML or an unexpected response (HTTP ${response.status}). Check the terminal for the server error.`);
  }

  try {
    return JSON.parse(raw) as ApiResponse;
  } catch {
    throw new Error(`Attendance API returned invalid JSON (HTTP ${response.status}).`);
  }
}

const EMPTY_STATS: AttendanceStats = {
  checkedInToday: false,
  currentStreak: 0,
  totalDays: 0,
  lastCheckIn: null,
};

function getTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

export default function HardworkCheckIn() {
  const [stats, setStats] = useState<AttendanceStats>(EMPTY_STATS);
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);
  const [open, setOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(true);
  const [error, setError] = useState("");
  const [celebration, setCelebration] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [sharing, setSharing] = useState(false);
  const [shareMessage, setShareMessage] = useState("");
  const timeZone = useMemo(() => getTimeZone(), []);

  useEffect(() => {
    const controller = new AbortController();

    async function loadAttendance() {
      try {
        const response = await fetch(
          `/api/attendance?timezone=${encodeURIComponent(timeZone)}`,
          { cache: "no-store", signal: controller.signal },
        );
        const payload = await readApiResponse(response);

        if (response.status === 401) {
          setSignedIn(false);
          return;
        }

        if (!response.ok || !payload.attendance) {
          throw new Error(payload.error || "Could not load your check-in.");
        }

        setStats(payload.attendance);
        setSignedIn(true);
      } catch (caught) {
        if (caught instanceof Error && caught.name !== "AbortError") {
          setError(caught.message);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void loadAttendance();
    return () => controller.abort();
  }, [timeZone]);

  async function checkIn() {
    if (checkingIn || stats.checkedInToday || !signedIn) return;

    setCheckingIn(true);
    setError("");

    try {
      const response = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timezone: timeZone }),
      });
      const payload = await readApiResponse(response);

      if (response.status === 401) {
        setSignedIn(false);
        throw new Error("Sign in to save your daily check-in.");
      }

      if (!response.ok || !payload.attendance) {
        throw new Error(payload.error || "Your check-in could not be saved.");
      }

      setStats(payload.attendance);
      setCelebration(!payload.alreadyCheckedIn);
      setOpen(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Check-in failed.");
      setOpen(true);
    } finally {
      setCheckingIn(false);
    }
  }

  const streakLabel = stats.currentStreak === 1 ? "day" : "days";

  async function shareStreak() {
    if (sharing || stats.totalDays < 1) return;
    setSharing(true);
    setShareMessage("");
    try {
      let url = shareUrl;
      if (!url) {
        const response = await fetch("/api/attendance/share", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ timezone: timeZone }),
        });
        const payload = await response.json();
        if (!response.ok || !payload.share?.token) throw new Error(payload.error || "Couldn't create your share link.");
        url = `${window.location.origin}/s/${payload.share.token}`;
        setShareUrl(url);
      }
      if (navigator.share) {
        await navigator.share({ title: "My VESH consistency streak", text: `I've shown up ${stats.totalDays} days with VESH. Current streak: ${stats.currentStreak} days.`, url });
        setShareMessage("Ready to share — thank you for spreading the consistency.");
      } else {
        await navigator.clipboard.writeText(url);
        setShareMessage("Your private share link has been copied.");
      }
    } catch (caught) {
      if (caught instanceof Error && caught.name === "AbortError") return;
      setShareMessage(caught instanceof Error ? caught.message : "Sharing isn't available in this browser.");
    } finally {
      setSharing(false);
    }
  }

  return (
    <div className="vesh-hardwork">
      <button
        type="button"
        className={`vesh-hardwork-trigger${stats.checkedInToday ? " is-checked" : ""}`}
        onClick={() => {
          setOpen((value) => !value);
          setCelebration(false);
        }}
        aria-label={stats.checkedInToday ? "View your Hardwork streak" : "Daily Hardwork check-in"}
        aria-expanded={open}
        title={stats.checkedInToday ? "Today's check-in is complete" : "Mark today as a day you showed up"}
      >
        <Flame size={17} weight="light" aria-hidden="true" />
        <span className="vesh-hardwork-trigger__count">{loading ? "—" : stats.currentStreak}</span>
      </button>

      {open && (
        <>
          <button
            type="button"
            className="vesh-hardwork-backdrop"
            aria-label="Close Hardwork panel"
            onClick={() => setOpen(false)}
          />
          <section className="vesh-hardwork-popover" aria-label="Hardwork check-in">
            <div className="vesh-hardwork-popover__topline">
              <span className="vesh-hardwork-popover__eyebrow">YOUR CONSISTENCY</span>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close">
                <X size={15} weight="light" />
              </button>
            </div>

            {celebration ? (
              <div className="vesh-hardwork-celebration" aria-live="polite">
                <span className="vesh-hardwork-celebration__flame">✦</span>
                <h3>You showed up today.</h3>
                <p>Small steps become something extraordinary when you keep returning.</p>
              </div>
            ) : (
              <div className="vesh-hardwork-intro">
                <h3>{stats.checkedInToday ? "You made today count." : "Make today count."}</h3>
                <p>
                  {stats.checkedInToday
                    ? "Today's effort is recorded. Keep building, one day at a time."
                    : "A little progress still counts. Mark today as a day you showed up."}
                </p>
              </div>
            )}

            <div className="vesh-hardwork-stats">
              <div>
                <strong>{stats.currentStreak}</strong>
                <span>Day streak</span>
              </div>
              <div>
                <strong>{stats.totalDays}</strong>
                <span>Days showed up</span>
              </div>
            </div>

            {!signedIn ? (
              <Link href="/login" className="vesh-hardwork-checkin">
                Sign in to check in
              </Link>
            ) : (
              <button
                type="button"
                className="vesh-hardwork-checkin"
                onClick={checkIn}
                disabled={loading || checkingIn || stats.checkedInToday}
              >
                {checkingIn
                  ? "Saving your day…"
                  : stats.checkedInToday
                    ? <><Check size={14} weight="light" /> Checked in today</>
                    : "Mark today · Check in"}
              </button>
            )}

            {error && <p className="vesh-hardwork-error" role="status">{error}</p>}

            {stats.currentStreak > 0 && !stats.checkedInToday && (
              <p className="vesh-hardwork-note">
                Your {stats.currentStreak}-{streakLabel} streak is waiting for today&apos;s check-in.
              </p>
            )}

            {stats.totalDays > 0 && signedIn && (
              <button type="button" className="vesh-hardwork-share" onClick={shareStreak} disabled={sharing}>
                <ShareNetwork size={15} weight="light" />
                {sharing ? "Preparing link…" : shareUrl ? "Share your streak again" : "Share your streak"}
              </button>
            )}
            {shareMessage && <p className="vesh-hardwork-share-message" role="status">{shareMessage}</p>}
            {shareUrl && <div className="vesh-hardwork-share-actions"><button type="button" className="vesh-hardwork-copy-link" onClick={async () => { try { await navigator.clipboard.writeText(shareUrl); setShareMessage("Link copied to clipboard."); } catch { setShareMessage(shareUrl); } }}><Copy size={13} /> Copy link</button><button type="button" className="vesh-hardwork-copy-link" onClick={async () => { const token = shareUrl.split("/").pop(); if (!token) return; const response = await fetch(`/api/attendance/share/${encodeURIComponent(token)}`, { method: "DELETE" }); if (response.ok) { setShareUrl(""); setShareMessage("Your share link has been revoked."); } else { setShareMessage("Couldn't revoke the share link. Please try again."); } }}>Revoke link</button></div>}

            <p className="vesh-hardwork-footnote">
              No competition. Just you, showing up for yourself.
            </p>
          </section>
        </>
      )}
    </div>
  );
}