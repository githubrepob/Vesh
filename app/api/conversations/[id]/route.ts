
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type Context = {
  params: Promise<{ id: string }>;
};

// GET: Load a conversation and its messages.
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

  const { data: conversation, error } = await supabase
    .from("conversations")
    .select("id,title,created_at,updated_at")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: "Could not load conversation." },
      { status: 500 },
    );
  }

  if (!conversation) {
    return NextResponse.json(
      { error: "Conversation not found." },
      { status: 404 },
    );
  }

  const { data: messages, error: messagesError } = await supabase
    .from("messages")
    .select("id,role,content,created_at")
    .eq("conversation_id", id)
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (messagesError) {
    return NextResponse.json(
      { error: "Could not load messages." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    conversation,
    messages: messages ?? [],
  });
}

// PATCH: Update the conversation title.
export async function PATCH(
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

  let body: { title?: string };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 },
    );
  }

  if (
    typeof body.title !== "string" ||
    !body.title.trim() ||
    body.title.trim().length > 80
  ) {
    return NextResponse.json(
      { error: "Title must contain between 1 and 80 characters." },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("conversations")
    .update({
      title: body.title.trim(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id,title,created_at,updated_at")
    .single();

  if (error || !data) {
    console.error("Conversation title update failed:", error);

    return NextResponse.json(
      { error: "Could not update conversation title." },
      { status: 500 },
    );
  }

  return NextResponse.json({ conversation: data });
}

// DELETE: Delete a conversation.
export async function DELETE(
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

  const { error } = await supabase
    .from("conversations")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json(
      { error: "Could not delete conversation." },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
