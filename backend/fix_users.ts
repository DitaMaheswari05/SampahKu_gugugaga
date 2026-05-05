import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

async function createUsers() {
  const usersToCreate = [
    { email: 'konsumen@gmail.com', password: '123456', name: 'Akun Konsumen', role: 'KONSUMEN' },
    { email: 'petugas@gmail.com', password: '123456', name: 'Akun Petugas', role: 'PETUGAS' },
    { email: 'produsen@gmail.com', password: '123456', name: 'Akun Produsen', role: 'BRAND' }
  ];

  for (const u of usersToCreate) {
    console.log(`\n--- Creating ${u.email} ---`);
    
    const { data, error } = await supabase.auth.admin.createUser({
      email: u.email,
      password: u.password,
      email_confirm: true,
      user_metadata: { name: u.name, role: u.role }
    });

    if (error) {
      console.error(`FAILED: ${error.message} (status: ${error.status})`);
      continue;
    }

    const user = data.user;
    console.log(`SUCCESS: ID = ${user.id}`);

    // Create profile
    const { error: pErr } = await supabase.from('profiles').upsert([
      { id: user.id, email: u.email, name: u.name, role: u.role, points: 0 }
    ], { onConflict: 'id' });

    if (pErr) {
      console.error(`Profile upsert failed: ${pErr.message}`);
    } else {
      console.log(`Profile created for ${u.email}`);
    }
  }

  // Verify
  console.log('\n--- Verification ---');
  const { data: profiles } = await supabase.from('profiles').select('id, email, role')
    .in('email', ['konsumen@gmail.com', 'petugas@gmail.com', 'produsen@gmail.com']);
  console.log('Profiles:', profiles);

  // Test login
  console.log('\n--- Login Test ---');
  const tempClient = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  
  for (const u of usersToCreate) {
    const { data: loginData, error: loginErr } = await tempClient.auth.signInWithPassword({
      email: u.email,
      password: u.password,
    });
    if (loginErr) {
      console.error(`Login ${u.email}: FAILED - ${loginErr.message}`);
    } else {
      console.log(`Login ${u.email}: SUCCESS (token: ${loginData.session?.access_token?.substring(0, 20)}...)`);
    }
  }
}

createUsers();
