import { supabase } from '../config/supabase';

export class AuthService {
    static async register(email: string, password: string, name: string, role: string) {
        // Use admin API to create user — bypasses the DB trigger that causes
        // "Database error saving new user" when the trigger's INSERT doesn't match the profiles schema.
        const { data: adminData, error: adminErr } = await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true,  // auto-confirm for hackathon
            user_metadata: { name, role },
        });

        if (adminErr) {
            // Fallback: try regular signUp (may work if trigger is disabled/fixed)
            console.warn('admin.createUser failed, trying signUp:', adminErr.message);
            const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
                email,
                password,
                options: { data: { name, role } },
            });
            if (signUpErr) throw signUpErr;

            const user = signUpData?.user;
            if (user) {
                await supabase.from('profiles').upsert([
                    { id: user.id, email: user.email, name, role }
                ], { onConflict: 'id' }).then(({ error: pErr }) => {
                    if (pErr) console.error('Failed upserting profile:', pErr);
                });
            }
            return signUpData;
        }

        // Admin create succeeded — now explicitly insert profile
        const user = adminData?.user;
        if (user) {
            const { error: pErr } = await supabase.from('profiles').upsert([
                { id: user.id, email: user.email, name, role }
            ], { onConflict: 'id' });

            if (pErr) {
                console.error('Failed upserting profile:', pErr);
            }
        }

        return adminData;
    }

    static async login(email: string, password: string) {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        if (error) throw error;
        return data;
    }

    static async getUserProfile(userId: string) {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (error) throw error;
        return data;
    }
}