
import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_MEMORY_TYPES = [
  "fact",
  "preference",
  "goal",
  "project",
  "instruction",
] as const;

type MemoryType = (typeof VALID_MEMORY_TYPES)[number];

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

async function getAuthenticatedUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { supabase, user: null };
  }

  return { supabase, user };
}

function normalizeKey(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const key = value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");

  if (!key || key.length > 120) return null;

  // Keep memory keys predictable and safe to query.
  if (!/^[a-z0-9_:-]+$/.test(key)) return null;

  return key;
}

function isMemoryType(value: unknown): value is MemoryType {
  return (
    typeof value === "string" &&
    VALID_MEMORY_TYPES.includes(value as MemoryType)
  );
}

// GET /api/memories
// Returns only memories belonging to the authenticated user.
export async function GET() {
  try {
    const { supabase, user } = await getAuthenticatedUser();

    if (!user) {
      return jsonError("You must be signed in to access memories.", 401);
    }

    const { data, error } = await supabase
      .from("memories")
      .select(
        "id, memory_key, content, memory_type, source, created_at, updated_at"
      )
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("VESH memory list error:", error.message);
      return jsonError("Could not load your memories.", 500);
    }

    return Response.json(
      { memories: data ?? [] },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("VESH memory GET error:", error);
    return jsonError("Something went wrong while loading memories.", 500);
  }
}

// POST /api/memories
// Creates a memory or updates an existing memory with the same key.
export async function POST(request: NextRequest) {
  try {
    const { supabase, user } = await getAuthenticatedUser();

    if (!user) {
      return jsonError("You must be signed in to save memories.", 401);
    }

    let body: {
      memory_key?: unknown;
      content?: unknown;
      memory_type?: unknown;
    };

    try {
      body = await request.json();
    } catch {
      return jsonError("Invalid JSON request body.", 400);
    }

    const memoryKey = normalizeKey(body.memory_key);

    if (!memoryKey) {
      return jsonError(
        "Provide a valid memory key using letters, numbers, underscores, hyphens, or colons.",
        400
      );
    }

    if (
      typeof body.content !== "string" ||
      !body.content.trim() ||
      body.content.trim().length > 2000
    ) {
      return jsonError(
        "Memory content must contain between 1 and 2000 characters.",
        400
      );
    }

    const memoryType = body.memory_type ?? "fact";

    if (!isMemoryType(memoryType)) {
      return jsonError("Invalid memory type.", 400);
    }

    const content = body.content.trim();

    // Find an existing key for this user before inserting.
    const { data: existing, error: lookupError } = await supabase
      .from("memories")
      .select("id")
      .eq("user_id", user.id)
      .eq("memory_key", memoryKey)
      .maybeSingle();

    if (lookupError) {
      console.error("VESH memory lookup error:", lookupError.message);
      return jsonError("Could not check existing memories.", 500);
    }

    let savedMemory;

    if (existing) {
      const { data, error } = await supabase
        .from("memories")
        .update({
          content,
          memory_type: memoryType,
          source: "user",
        })
        .eq("id", existing.id)
        .eq("user_id", user.id)
        .select(
          "id, memory_key, content, memory_type, source, created_at, updated_at"
        )
        .single();

      if (error) {
        console.error("VESH memory update error:", error.message);
        return jsonError("Could not update this memory.", 500);
      }

      savedMemory = data;
    } else {
      const { data, error } = await supabase
        .from("memories")
        .insert({
          user_id: user.id,
          memory_key: memoryKey,
          content,
          memory_type: memoryType,
          source: "user",
        })
        .select(
          "id, memory_key, content, memory_type, source, created_at, updated_at"
        )
        .single();

      if (error) {
        console.error("VESH memory insert error:", error.message);
        return jsonError("Could not save this memory.", 500);
      }

      savedMemory = data;
    }

    return Response.json(
      {
        success: true,
        memory: savedMemory,
        message: existing ? "Memory updated." : "Memory saved.",
      },
      { status: existing ? 200 : 201 }
    );
  } catch (error) {
    console.error("VESH memory POST error:", error);
    return jsonError("Something went wrong while saving this memory.", 500);
  }
}

// PATCH /api/memories
// Updates an existing memory belonging to the authenticated user.
export async function PATCH(request: NextRequest) {
  try {
    const { supabase, user } = await getAuthenticatedUser();

    if (!user) {
      return jsonError("You must be signed in to update memories.", 401);
    }

    let body: {
      id?: unknown;
      content?: unknown;
      memory_type?: unknown;
    };

    try {
      body = await request.json();
    } catch {
      return jsonError("Invalid JSON request body.", 400);
    }

    if (typeof body.id !== "string" || !body.id.trim()) {
      return jsonError("A memory ID is required.", 400);
    }

    const updates: {
      content?: string;
      memory_type?: MemoryType;
    } = {};

    if (body.content !== undefined) {
      if (
        typeof body.content !== "string" ||
        !body.content.trim() ||
        body.content.trim().length > 2000
      ) {
        return jsonError("Invalid memory content.", 400);
      }

      updates.content = body.content.trim();
    }

    if (body.memory_type !== undefined) {
      if (!isMemoryType(body.memory_type)) {
        return jsonError("Invalid memory type.", 400);
      }

      updates.memory_type = body.memory_type;
    }

    if (Object.keys(updates).length === 0) {
      return jsonError("Provide content or memory_type to update.", 400);
    }

    const { data, error } = await supabase
      .from("memories")
      .update(updates)
      .eq("id", body.id)
      .eq("user_id", user.id)
      .select(
        "id, memory_key, content, memory_type, source, created_at, updated_at"
      )
      .maybeSingle();

    if (error) {
      console.error("VESH memory PATCH error:", error.message);
      return jsonError("Could not update this memory.", 500);
    }

    if (!data) {
      return jsonError("Memory not found.", 404);
    }

    return Response.json({
      success: true,
      memory: data,
      message: "Memory updated.",
    });
  } catch (error) {
    console.error("VESH memory PATCH exception:", error);
    return jsonError("Something went wrong while updating this memory.", 500);
  }
}

// DELETE /api/memories?id=<memory-id>
export async function DELETE(request: NextRequest) {
  try {
    const { supabase, user } = await getAuthenticatedUser();

    if (!user) {
      return jsonError("You must be signed in to delete memories.", 401);
    }

    const id = request.nextUrl.searchParams.get("id");

    if (!id) {
      return jsonError("A memory ID is required.", 400);
    }

    const { data, error } = await supabase
      .from("memories")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id)
      .select("id")
      .maybeSingle();

    if (error) {
      console.error("VESH memory DELETE error:", error.message);
      return jsonError("Could not delete this memory.", 500);
    }

    if (!data) {
      return jsonError("Memory not found.", 404);
    }

    return Response.json({
      success: true,
      message: "Memory deleted.",
    });
  } catch (error) {
    console.error("VESH memory DELETE exception:", error);
    return jsonError("Something went wrong while deleting this memory.", 500);
  }
}
