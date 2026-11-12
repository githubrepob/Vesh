
import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AttendanceRow = {
  attendance_date: string;
};

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

function normalizeTimeZone(value: unknown): string {
  if (typeof value !== "string" || value.length > 100) {
    return "UTC";
  }

  try {
    new Intl.DateTimeFormat("en", { timeZone: value });
    return value;
  } catch {
    return "UTC";
  }
}

function localDateInTimeZone(timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value])
  );

  return `${values.year}-${values.month}-${values.day}`;
}

function shiftDate(date: string, amount: number): string {
  const [year, month, day] = date.split("-").map(Number);
  const value = new Date(Date.UTC(year, month - 1, day + amount));
  return value.toISOString().slice(0, 10);
}

async function getAuthenticatedUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  return {
    supabase,
    user: error ? null : user,
  };
}

export async function getAttendanceStats(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  timeZone: string
) {
  const today = localDateInTimeZone(timeZone);

  const { data, count, error } = await supabase
    .from("user_attendance")
    .select("attendance_date", { count: "exact" })
    .eq("user_id", userId)
    .order("attendance_date", { ascending: false })
    .limit(5000);

  if (error) throw error;

  const rows = (data ?? []) as AttendanceRow[];
  const dates = new Set(rows.map((row) => row.attendance_date));
  const checkedInToday = dates.has(today);

  let cursor = checkedInToday ? today : shiftDate(today, -1);
  let currentStreak = 0;

  while (dates.has(cursor)) {
    currentStreak += 1;
    cursor = shiftDate(cursor, -1);
  }

  return {
    checkedInToday,
    currentStreak,
    totalDays: count ?? rows.length,
    lastCheckIn: rows[0]?.attendance_date ?? null,
  };
}

export async function GET(request: NextRequest) {
  try {
    const { supabase, user } = await getAuthenticatedUser();

    if (!user) {
      return jsonError("Sign in to view your Hardwork history.", 401);
    }

    const timeZone = normalizeTimeZone(
      request.nextUrl.searchParams.get("timezone")
    );

    const attendance = await getAttendanceStats(
      supabase,
      user.id,
      timeZone
    );

    return Response.json(
      { attendance },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch (error) {
    console.error("VESH attendance GET error:", error);
    return jsonError(
      "Could not load your attendance right now.",
      500
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, user } = await getAuthenticatedUser();

    if (!user) {
      return jsonError("Sign in to record your daily check-in.", 401);
    }

    let body: { timezone?: unknown };

    try {
      body = await request.json();
    } catch {
      return jsonError("Invalid check-in request.", 400);
    }

    const timeZone = normalizeTimeZone(body.timezone);
    const today = localDateInTimeZone(timeZone);

    const { error: insertError } = await supabase
      .from("user_attendance")
      .insert({
        user_id: user.id,
        attendance_date: today,
        timezone: timeZone,
      });

    const alreadyCheckedIn = insertError?.code === "23505";

    if (insertError && !alreadyCheckedIn) {
      console.error(
        "VESH attendance insert error:",
        insertError.message
      );

      return jsonError(
        "Your check-in could not be saved. Please try again.",
        500
      );
    }

    const attendance = await getAttendanceStats(
      supabase,
      user.id,
      timeZone
    );

    return Response.json(
      { attendance, alreadyCheckedIn },
      {
        status: alreadyCheckedIn ? 200 : 201,
        headers: { "Cache-Control": "no-store, max-age=0" },
      }
    );
  } catch (error) {
    console.error("VESH attendance POST error:", error);
    return jsonError(
      "Something went wrong while recording your check-in.",
      500
    );
  }
}
