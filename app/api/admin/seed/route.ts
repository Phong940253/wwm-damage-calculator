import { NextResponse } from "next/server";
import { createClient } from "@/app/utils/supabase/server";

// Import current static data
import skillsData from "@/app/domain/skill/data/skills.json";
import passiveSkillsData from "@/app/domain/skill/data/passiveSkills.json";
import innerWaysData from "@/app/domain/skill/data/innerWays.json";
import defaultRotationsData from "@/app/domain/skill/data/defaultRotations.json";
import martialArtsData from "@/app/domain/skill/data/martialArts.json";

const ADMIN_SECRET = "my-secret-admin-key";

export async function POST(request: Request) {
  try {
    const { secret } = await request.json();

    if (secret !== ADMIN_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await createClient();

    const dataToSeed = [
      { key: "skills", data: skillsData },
      { key: "passiveSkills", data: passiveSkillsData },
      { key: "innerWays", data: innerWaysData },
      { key: "defaultRotations", data: defaultRotationsData },
      { key: "martialArts", data: martialArtsData },
    ];

    const { error } = await supabase
      .from("static_data")
      .upsert(dataToSeed, { onConflict: "key" });

    if (error) {
      console.error("Supabase Error during seed:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Database seeded successfully!" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
