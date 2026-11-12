
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type Context = {
  params: Promise<{ id: string }>;
};

type NewMessage = {
  role: "user" | "assistant";
  content: string;
};

export async function GET(
  _request: NextRequest,
  { params }: Context,
) {
  const { id } = await params;
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
    .from("messages")
    .select("id,role,content,created_at")
    .eq("conversation_id", id)
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Message retrieval failed:", error);
    return NextResponse.json(
      { error: "Could not load messages." },
      { status: 500 },
    );
  }

  return NextResponse.json({ messages: data ?? [] });
}

export async function POST(
  request: NextRequest,
  { params }: Context,
) {
  const { id } = await params;
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

  let body: { messages?: NewMessage[] };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 },
    );
  }

  const messages = body.messages;

  if (
    !Array.isArray(messages) ||
    messages.length < 1 ||
    messages.length > 2
  ) {
    return NextResponse.json(
      { error: "Send one or two messages." },
      { status: 400 },
    );
  }

  if (
    messages.some(
      (message) =>
        !message ||
        !["user", "assistant"].includes(message.role) ||
        typeof message.content !== "string" ||
        !message.content.trim() ||
        message.content.length > 8000,
    )
  ) {
    return NextResponse.json(
      { error: "One or more messages are invalid." },
      { status: 400 },
    );
  }

  // Verify that this conversation belongs to the signed-in user.
  const { data: conversation, error: conversationError } =
    await supabase
      .from("conversations")
      .select("id")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();

  if (conversationError) {
    console.error("Conversation lookup failed:", conversationError);

    return NextResponse.json(
      { error: "Could not verify conversation." },
      { status: 500 },
    );
  }

  if (!conversation) {
    return NextResponse.json(
      { error: "Conversation not found." },
      { status: 404 },
    );
  }

  // Use increasing timestamps to preserve message order.
  const baseTime = Date.now();

  const rows = messages.map((message, index) => ({
    conversation_id: id,
    user_id: user.id,
    role: message.role,
    content: message.content.trim(),
    created_at: new Date(baseTime + index).toISOString(),
  }));

  const { data, error: insertError } = await supabase
    .from("messages")
    .insert(rows)
    .select("id,role,content,created_at");

  if (insertError) {
    console.error("Message insertion failed:", insertError);

    return NextResponse.json(
      { error: "Could not save messages." },
      { status: 500 },
    );
  }

  // Update the conversation's last activity.
  const { error: updateError } = await supabase
    .from("conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id);

  if (updateError) {
    console.error("Conversation timestamp update failed:", updateError);
  }

  return NextResponse.json(
    { messages: data ?? [] },
    { status: 201 },
  );
}
