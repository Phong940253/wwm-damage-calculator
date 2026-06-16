// node --env-file=.env.local scripts/update_tides_skill.mjs
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in your environment.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const TIDES_SKILL_ID = "mystic_flute_of_the_tides";

const updatedHit1 = {
  physicalMultiplier: 1.9485,
  elementMultiplier: 1,
  hits: 1,
  flatPhysical: 400,
};

const updatedRippleHit = {
  physicalMultiplier: 0.7307,
  elementMultiplier: 1,
  hits: 5,
  flatPhysical: 150,
};

async function updateTidesSkill() {
  console.log(`🔍 Fetching current skills from Supabase...`);

  const { data, error } = await supabase
    .from('static_data')
    .select('data')
    .eq('key', 'skills')
    .single();

  if (error) {
    console.error('❌ Failed to fetch skills:', error.message);
    process.exit(1);
  }

  const skills = data.data;
  if (!Array.isArray(skills)) {
    console.error('❌ Skills data is not an array');
    process.exit(1);
  }

  const idx = skills.findIndex((s) => s.id === TIDES_SKILL_ID);
  if (idx === -1) {
    console.error(`❌ Skill "${TIDES_SKILL_ID}" not found in Supabase`);
    process.exit(1);
  }

  const old = skills[idx];
  console.log(`📦 Found skill: "${old.name}" (${old.id})`);
  console.log(`   Old hits:`);
  old.hits.forEach((h, i) => console.log(`     Hit ${i + 1}: physMult=${h.physicalMultiplier}, flatPhys=${h.flatPhysical}, hits=${h.hits}, scale=${JSON.stringify(h.scale) || 'none'}`));
  console.log(`   Old selfDamageBoostPct: ${old.selfDamageBoostPct}`);

  // Update the skill
  skills[idx] = {
    ...old,
    selfDamageBoostPct: 100,
    hits: [updatedHit1, updatedRippleHit],
  };

  console.log(`\n📤 Upserting updated skills array to Supabase...`);

  const { error: upsertError } = await supabase
    .from('static_data')
    .upsert({ key: 'skills', data: skills }, { onConflict: 'key' });

  if (upsertError) {
    console.error('❌ Update failed:', upsertError.message);
    process.exit(1);
  }

  console.log(`✅ Update successful!`);
  console.log(`   New hits:`);
  skills[idx].hits.forEach((h, i) => console.log(`     Hit ${i + 1}: physMult=${h.physicalMultiplier}, flatPhys=${h.flatPhysical}, hits=${h.hits}, scale=${JSON.stringify(h.scale) || 'none'}`));
  console.log(`   New selfDamageBoostPct: ${skills[idx].selfDamageBoostPct}`);
  console.log(`\n🏁 Done. The Realtime subscription will push changes to all connected clients.`);
}

updateTidesSkill();
