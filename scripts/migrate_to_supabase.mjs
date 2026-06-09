import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// --- CONFIGURATION ---
// node --env-file=.env.local scripts/migrate_to_supabase.mjs
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in your environment.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '../app/domain/skill/data');

const JSON_FILES = [
  { file: 'skills.json', key: 'skills' },
  { file: 'passiveSkills.json', key: 'passiveSkills' },
  { file: 'innerWays.json', key: 'innerWays' },
  { file: 'defaultRotations.json', key: 'defaultRotations' },
  { file: 'martialArts.json', key: 'martialArts' },
];

async function migrate() {
  console.log('🚀 Starting Data Migration to "static_data" table...');

  const dataToUpsert = [];

  for (const { file, key } of JSON_FILES) {
    const filePath = path.join(DATA_DIR, file);
    
    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️ Warning: ${file} not found, skipping.`);
      continue;
    }

    try {
      const raw = fs.readFileSync(filePath, 'utf8');
      const jsonData = JSON.parse(raw);
      
      dataToUpsert.push({
        key,
        data: jsonData
      });

      console.log(`📦 Loaded ${file} as key "${key}"`);
    } catch (err) {
      console.error(`❌ Error parsing ${file}:`, err.message);
    }
  }

  if (dataToUpsert.length === 0) {
    console.log('ℹ️ No data to migrate.');
    return;
  }

  console.log(`\n📤 Upserting ${dataToUpsert.length} records to Supabase...`);

  const { error } = await supabase
    .from('static_data')
    .upsert(dataToUpsert, { onConflict: 'key' });

  if (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Details:', error.details);
  } else {
    console.log('✅ Migration successful! All data moved to "static_data" table.');
  }

  console.log('\n🏁 Process finished.');
}

migrate();
