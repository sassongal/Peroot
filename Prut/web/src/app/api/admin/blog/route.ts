import { NextRequest, NextResponse } from "next/server";
import { validateAdminSession } from "@/lib/admin/admin-security";
import { logger } from "@/lib/logger";

// GET - list all posts (including drafts) for admin
export async function GET() {
  try {
    const { error, supabase } = await validateAdminSession();
    if (error || !supabase)
      return NextResponse.json({ error: error || "Forbidden" }, { status: 403 });

    const { data, error: dbError } = await supabase
      .from("blog_posts")
      .select("*")
      .order("created_at", { ascending: false });

    if (dbError)
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (error) {
    logger.error("[admin/blog] Error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// POST - create new post
export async function POST(req: NextRequest) {
  try {
    const { error, supabase } = await validateAdminSession();
    if (error || !supabase)
      return NextResponse.json({ error: error || "Forbidden" }, { status: 403 });

    const body = await req.json();
    const { data, error: dbError } = await supabase
      .from("blog_posts")
      .insert(body)
      .select()
      .single();

    if (dbError)
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    logger.error("[admin/blog] Error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// PUT - update existing post
export async function PUT(req: NextRequest) {
  try {
    const { error, supabase } = await validateAdminSession();
    if (error || !supabase)
      return NextResponse.json({ error: error || "Forbidden" }, { status: 403 });

    const body = await req.json();
    const { id, ...updates } = body;

    if (!id)
      return NextResponse.json({ error: "Missing post id" }, { status: 400 });

    const { data, error: dbError } = await supabase
      .from("blog_posts")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (dbError)
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (error) {
    logger.error("[admin/blog] Error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// DELETE - delete a post
export async function DELETE(req: NextRequest) {
  try {
    const { error, supabase } = await validateAdminSession();
    if (error || !supabase)
      return NextResponse.json({ error: error || "Forbidden" }, { status: 403 });

    const { id } = await req.json();

    if (!id)
      return NextResponse.json({ error: "Missing post id" }, { status: 400 });

    const { error: dbError } = await supabase
      .from("blog_posts")
      .delete()
      .eq("id", id);

    if (dbError)
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("[admin/blog] Error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
