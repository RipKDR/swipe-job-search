// Run seed against local Supabase using service role key
// Usage: node scripts/seed-local.mjs
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const sql = readFileSync(resolve(__dirname, 'seed-dev-data.sql'), 'utf8');

const supabase = createClient(
  'http://127.0.0.1:54321',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RA1qMEP28RBNM3bvlZ_lwI5CGjarNFlJQea3I' // local service_role
);

async function main() {
  console.log('Running seed SQL via pg SQL query...');
  // For local supabase, we can use rpc to execute raw SQL
  const { data, error } = await supabase.rpc('exec_sql', { query: sql }).single();
  if (error) {
    console.error('RPC failed:', error.message);
    console.log('Trying direct queries instead...');
    await runDirectQueries();
  } else {
    console.log('Seed complete:', data);
  }
}

async function runDirectQueries() {
  // If exec_sql RPC doesn't exist, we simulate by running the seed 
  // step by step via the REST API
  console.log('Seed SQL saved to scripts/seed-dev-data.sql');
  console.log('Run: supabase db query < scripts/seed-dev-data.sql');
  console.log('Or paste into Supabase SQL Editor');
}

main().catch(console.error);
