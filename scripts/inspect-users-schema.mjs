import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

function loadEnv() {
  const path = resolve(process.cwd(), '.env.local');
  const text = readFileSync(path, 'utf8');
  const env = {};
  for (const line of text.split('\n')) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
  }
  return env;
}

const env = loadEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY ?? env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const admin = createClient(url, key);

const telegramId = 'test_user_001';

const probes = [
  ['id, telegram_id, referral_code, username, points', 'full'],
  ['id, telegram_id', 'id_telegram'],
  ['telegram_id, username, points', 'no_id'],
  ['*', 'star'],
];

for (const [cols, label] of probes) {
  const { data, error } = await admin
    .from('users')
    .select(cols)
    .eq('telegram_id', telegramId)
    .maybeSingle();
  console.log(`\n--- select ${label} (${cols}) ---`);
  if (error) console.log('ERROR:', error.message, error.code, error.details);
  else console.log('ROW:', JSON.stringify(data, null, 2));
}

// try select by id = telegramId
const { data: byId, error: byIdErr } = await admin
  .from('users')
  .select('id, telegram_id, referral_code')
  .eq('id', telegramId)
  .maybeSingle();
console.log('\n--- select by id=telegramId ---');
if (byIdErr) console.log('ERROR:', byIdErr.message);
else console.log('ROW:', JSON.stringify(byId, null, 2));

const userId = '423a93c7-360e-419f-8fe8-c6a6840f578e';
const { error: updId } = await admin
  .from('users')
  .update({ referral_code: 'TEST01' })
  .eq('id', userId);
console.log('\n--- update referral_code by id ---');
console.log(updId?.message ?? 'ok', updId?.code);

const { error: updTg } = await admin
  .from('users')
  .update({ referral_code: 'TEST01' })
  .eq('telegram_id', telegramId);
console.log('\n--- update referral_code by telegram_id ---');
console.log(updTg?.message ?? 'ok', updTg?.code);
