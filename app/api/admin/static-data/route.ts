import { NextResponse } from "next/server";
import { createClient } from "@/app/utils/supabase/server";

const ADMIN_SECRET = "my-secret-admin-key"; // The user can change this later or we can put it in .env

export async function POST(request: Request) {
  try {
    const { key, data, secret } = await request.json();

    if (secret !== ADMIN_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!key || !data) {
      return NextResponse.json({ error: "Missing key or data" }, { status: 400 });
    }

    const supabase = await createClient();

    const { error } = await supabase
      .from("static_data")
      .upsert({ key, data }, { onConflict: "key" });

    if (error) {
      console.error("Supabase Error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("static_data").select("*");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}
