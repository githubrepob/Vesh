import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  if (!/^[A-Za-z0-9_-]{32,100}$/.test(token)) return Response.json({ error: "This share link is invalid or unavailable." }, { status: 404 });
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("attendance_shares")
      .select("current_streak, total_days, created_at")
      .eq("token", token)
      .eq("active", true)
      .maybeSingle();
    if (error || !data) return Response.json({ error: "This share link is no longer available." }, { status: 404 });
    return Response.json({ share: data }, { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" } });
  } catch {
    return Response.json({ error: "This share link is temporarily unavailable." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  if (!/^[A-Za-z0-9_-]{32,100}$/.test(token)) return Response.json({ error: "Invalid share link." }, { status: 400 });
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return Response.json({ error: "Sign in to revoke this link." }, { status: 401 });
    const { data, error } = await supabase.from("attendance_shares").update({ active: false, revoked_at: new Date().toISOString() }).eq("token", token).eq("user_id", user.id).eq("active", true).select("id").maybeSingle();
    if (error) return Response.json({ error: "Couldn't revoke this link." }, { status: 500 });
    if (!data) return Response.json({ error: "Share link not found." }, { status: 404 });
    return new Response(null, { status: 204 });
  } catch {
    return Response.json({ error: "Couldn't revoke this link." }, { status: 500 });
  }
}
