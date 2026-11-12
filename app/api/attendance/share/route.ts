import { randomBytes } from "node:crypto";
import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAttendanceStats } from "../route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return Response.json({ error: "Sign in to share your streak." }, { status: 401 });

    let body: { timezone?: unknown } = {};
    try { body = await request.json(); } catch { /* timezone defaults to UTC */ }
    let timezone = typeof body.timezone === "string" ? body.timezone.slice(0, 100) : "UTC";
    try { new Intl.DateTimeFormat("en", { timeZone: timezone }); } catch { timezone = "UTC"; }
    const stats = await getAttendanceStats(supabase, user.id, timezone);
    if (stats.totalDays < 1) return Response.json({ error: "Check in at least once before sharing your streak." }, { status: 400 });

    const token = randomBytes(24).toString("base64url");
    const { data, error } = await supabase.from("attendance_shares").insert({
      user_id: user.id,
      token,
      current_streak: stats.currentStreak,
      total_days: stats.totalDays,
    }).select("token, current_streak, total_days").single();
    if (error || !data) {
      console.error("VESH attendance share creation failed:", error);
      return Response.json({ error: "Couldn't create your share link. Please try again." }, { status: 500 });
    }
    return Response.json({ share: data }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("VESH attendance share error:", error);
    return Response.json({ error: "Couldn't create your share link." }, { status: 500 });
  }
}
