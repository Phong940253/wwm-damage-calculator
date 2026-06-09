import { NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/app/utils/supabase/server";

const ADMIN_SECRET = process.env.ADMIN_SECRET || "my-secret-admin-key";

export async function POST(request: Request) {
  try {
    const { key, data, secret } = await request.json();

    if (secret !== ADMIN_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!key || !data) {
      return NextResponse.json({ error: "Missing key or data" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Supabase UPSERT
    const { error } = await supabase
      .from("static_data")
      .upsert({ key, data } as { key: string; data: unknown }, { onConflict: "key" });

    if (error) {
      console.error("Supabase Error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

export async function GET() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from("static_data").select("*");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
