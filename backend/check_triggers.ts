import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

async function checkTriggers() {
  const { data, error } = await supabase.rpc('run_sql', { sql_query: "SELECT tgname FROM pg_trigger WHERE tgrelid = 'auth.users'::regclass;" });
  if (error) {
    console.error('Failed RPC, falling back to profiles check:', error.message);
  } else {
    console.log('Triggers on auth.users:', data);
  }
}

checkTriggers();
