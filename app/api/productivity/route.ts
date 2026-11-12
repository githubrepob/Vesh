import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Kind = "goals" | "tasks" | "events" | "notes";
const TABLES: Record<Kind, "goals" | "tasks" | "calendar_events" | "notes"> = {
  goals: "goals", tasks: "tasks", events: "calendar_events", notes: "notes",
};
const MAX_BODY = 12_000;

function error(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function parseKind(value: string | null): Kind | null {
  return value === "goals" || value === "tasks" || value === "events" || value === "notes" ? value : null;
}

function cleanText(value: unknown, max: number, required = false): string | null {
  if (typeof value !== "string") return required ? null : "";
  const result = value.trim();
  if ((required && !result) || result.length > max) return null;
  return result;
}

function validIsoOrNull(value: unknown): string | null | undefined {
  if (value === null || value === "") return null;
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) return undefined;
  return new Date(value).toISOString();
}

function pickFields(kind: Kind, body: Record<string, unknown>, partial: boolean) {
  const result: Record<string, unknown> = {};
  const textFields = kind === "notes" ? ["title", "content"] : ["title", "description"];

  for (const field of textFields) {
    if (!(field in body)) continue;
    const value = cleanText(body[field], field === "title" ? 160 : 12000, field === "title");
    if (value === null) return { error: `Invalid ${field}.` };
    result[field] = value;
  }
  if (!partial && !("title" in result)) return { error: "A title is required." };

  if (kind === "notes" && "pinned" in body) {
    if (typeof body.pinned !== "boolean") return { error: "Invalid pinned value." };
    result.pinned = body.pinned;
  }

  if (kind === "goals") {
    if ("target_date" in body) {
      const value = body.target_date;
      if (value !== null && value !== "" && (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))) return { error: "Invalid target date." };
      result.target_date = value || null;
    }
    if ("status" in body) {
      if (!["active", "completed", "archived"].includes(String(body.status))) return { error: "Invalid goal status." };
      result.status = body.status;
    }
  }

  if (kind === "tasks") {
    if ("status" in body) {
      if (!["todo", "in_progress", "completed"].includes(String(body.status))) return { error: "Invalid task status." };
      result.status = body.status;
    }
    if ("priority" in body) {
      if (!["low", "medium", "high"].includes(String(body.priority))) return { error: "Invalid task priority." };
      result.priority = body.priority;
    }
    for (const field of ["scheduled_at", "due_at"] as const) {
      if (field in body) {
        const value = validIsoOrNull(body[field]);
        if (value === undefined) return { error: `Invalid ${field}.` };
        result[field] = value;
      }
    }
    if ("estimated_minutes" in body) {
      const value = body.estimated_minutes;
      if (value !== null && (!Number.isInteger(value) || Number(value) < 1 || Number(value) > 1440)) return { error: "Estimated minutes must be between 1 and 1440." };
      result.estimated_minutes = value;
    }
  }

  if (kind === "events") {
    if ("event_type" in body) {
      if (!["deadline", "objective", "event"].includes(String(body.event_type))) return { error: "Invalid event type." };
      result.event_type = body.event_type;
    }
    if ("starts_at" in body) {
      const value = validIsoOrNull(body.starts_at);
      if (!value) return { error: "A valid start date and time is required." };
      result.starts_at = value;
    } else if (!partial) return { error: "A start date and time is required." };
    if ("ends_at" in body) {
      const value = validIsoOrNull(body.ends_at);
      if (value === undefined) return { error: "Invalid end date and time." };
      result.ends_at = value;
    }
    if ("task_id" in body) result.task_id = body.task_id || null;
  }
  return { data: result };
}

async function authenticatedClient() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  return { supabase, user: authError ? null : user };
}

export async function GET(request: NextRequest) {
  const kind = parseKind(request.nextUrl.searchParams.get("kind"));
  if (!kind) return error("Choose goals, tasks, events or notes.", 400);
  try {
    const { supabase, user } = await authenticatedClient();
    if (!user) return error("Authentication required.", 401);
    const table = TABLES[kind];
    const orderColumn = kind === "goals" ? "target_date" : kind === "tasks" ? "due_at" : kind === "events" ? "starts_at" : "updated_at";
    let query = supabase.from(table).select("*").eq("user_id", user.id);
    if (kind === "notes") query = query.order("pinned", { ascending: false }).order("updated_at", { ascending: false });
    else query = query.order(orderColumn, { ascending: true, nullsFirst: false });
    const { data, error: queryError } = await query.limit(500);
    if (queryError) throw queryError;
    return NextResponse.json({ [kind]: data ?? [] }, { headers: { "Cache-Control": "no-store" } });
  } catch (caught) {
    console.error(`Productivity ${kind} GET failed:`, caught);
    return error("Could not load your productivity data.", 500);
  }
}

export async function POST(request: NextRequest) {
  const kind = parseKind(request.nextUrl.searchParams.get("kind"));
  if (!kind) return error("Choose goals, tasks, events or notes.", 400);
  const raw = await request.text();
  if (raw.length > MAX_BODY) return error("Request is too large.", 413);
  let body: Record<string, unknown>;
  try { body = JSON.parse(raw) as Record<string, unknown>; } catch { return error("Invalid JSON body.", 400); }
  const parsed = pickFields(kind, body, false);
  if ("error" in parsed) return error(parsed.error as string, 400);
  try {
    const { supabase, user } = await authenticatedClient();
    if (!user) return error("Authentication required.", 401);
    const { data, error: insertError } = await supabase.from(TABLES[kind]).insert({ ...parsed.data, user_id: user.id }).select("*").single();
    if (insertError) throw insertError;
    return NextResponse.json({ [kind.slice(0, -1)]: data }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (caught) {
    console.error(`Productivity ${kind} POST failed:`, caught);
    return error("Could not save this item.", 500);
  }
}

export async function PATCH(request: NextRequest) {
  const kind = parseKind(request.nextUrl.searchParams.get("kind"));
  if (!kind) return error("Choose goals, tasks, events or notes.", 400);
  const raw = await request.text();
  if (raw.length > MAX_BODY) return error("Request is too large.", 413);
  let body: Record<string, unknown>;
  try { body = JSON.parse(raw) as Record<string, unknown>; } catch { return error("Invalid JSON body.", 400); }
  const id = typeof body.id === "string" ? body.id : "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) return error("A valid item ID is required.", 400);
  const parsed = pickFields(kind, body, true);
  if ("error" in parsed) return error(parsed.error as string, 400);
  if (!Object.keys(parsed.data ?? {}).length) return error("No valid changes supplied.", 400);
  try {
    const { supabase, user } = await authenticatedClient();
    if (!user) return error("Authentication required.", 401);
    const { data, error: updateError } = await supabase.from(TABLES[kind]).update(parsed.data).eq("id", id).eq("user_id", user.id).select("*").maybeSingle();
    if (updateError) throw updateError;
    if (!data) return error("Item not found.", 404);
    return NextResponse.json({ [kind.slice(0, -1)]: data }, { headers: { "Cache-Control": "no-store" } });
  } catch (caught) {
    console.error(`Productivity ${kind} PATCH failed:`, caught);
    return error("Could not update this item.", 500);
  }
}

export async function DELETE(request: NextRequest) {
  const kind = parseKind(request.nextUrl.searchParams.get("kind"));
  const id = request.nextUrl.searchParams.get("id") ?? "";
  if (!kind || !/^[0-9a-f-]{36}$/i.test(id)) return error("A valid kind and item ID are required.", 400);
  try {
    const { supabase, user } = await authenticatedClient();
    if (!user) return error("Authentication required.", 401);
    const { data, error: deleteError } = await supabase.from(TABLES[kind]).delete().eq("id", id).eq("user_id", user.id).select("id").maybeSingle();
    if (deleteError) throw deleteError;
    if (!data) return error("Item not found.", 404);
    return new NextResponse(null, { status: 204 });
  } catch (caught) {
    console.error(`Productivity ${kind} DELETE failed:`, caught);
    return error("Could not delete this item.", 500);
  }
}
