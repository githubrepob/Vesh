import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/conversations
// Return only conversations owned by the authenticated user.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 },
    );
  }

  const { data, error } = await supabase
    .from("conversations")
    .select("id,title,created_at,updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error("Conversation list failed:", error.message);
    return NextResponse.json(
      { error: "Could not load conversations." },
      { status: 500 },
    );
  }

  return NextResponse.json(
    { conversations: data ?? [] },
    { headers: { "Cache-Control": "no-store" } },
  );
}

// POST /api/conversations
// Create a conversation for the authenticated user.
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 },
    );
  }

  let title = "New conversation";

  try {
    const body: { title?: unknown } = await request.json();

    if (typeof body.title === "string" && body.title.trim()) {
      title = body.title.trim().slice(0, 160);
    }
  } catch {
    // An empty or malformed optional body uses the default title.
  }

  const { data, error } = await supabase
    .from("conversations")
    .insert({ user_id: user.id, title })
    .select("id,title,created_at,updated_at")
    .single();

  if (error || !data) {
    console.error("Conversation creation failed:", error?.message);
    return NextResponse.json(
      { error: "Could not create conversation." },
      { status: 500 },
    );
  }

  return NextResponse.json({ conversation: data }, { status: 201 });
}
