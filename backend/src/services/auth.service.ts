import { supabase } from '../config/supabase';
import { createClient } from '@supabase/supabase-js';

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
            // Use ephemeral client to avoid polluting global service role client
            const tempClient = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!, {
                auth: { persistSession: false, autoRefreshToken: false }
            });
            const { data: signUpData, error: signUpErr } = await tempClient.auth.signUp({
                email,
                password,
                options: { data: { name, role } },
            });
            if (signUpErr) throw signUpErr;

            const user = signUpData?.user;
            if (user) {
                await supabase.from('profiles').upsert([
                    { id: user.id, email: user.email, name, role }
                ], { onConflict: 'id' }).then(async ({ error: pErr }) => {
                    if (pErr) console.error('Failed upserting profile:', pErr);
                    
                    if (!pErr && role === 'BRAND') {
                        const randomPrefix = `899${Math.floor(100 + Math.random() * 900)}`;
                        const { error: prefErr } = await supabase.from('brand_gtin_prefixes').insert([{
                            brand_id: user.id,
                            prefix: randomPrefix,
                            is_active: true
                        }]);
                        if (prefErr) console.error('Failed assigning GTIN prefix:', prefErr);
                    }
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
            } else if (role === 'BRAND') {
                const randomPrefix = `899${Math.floor(100 + Math.random() * 900)}`;
                const { error: prefErr } = await supabase.from('brand_gtin_prefixes').insert([{
                    brand_id: user.id,
                    prefix: randomPrefix,
                    is_active: true
                }]);
                if (prefErr) console.error('Failed assigning GTIN prefix:', prefErr);
            }
        }

        return adminData;
    }

    static async login(email: string, password: string) {
        // Use ephemeral client to avoid polluting global service role client
        const tempClient = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!, {
            auth: { persistSession: false, autoRefreshToken: false }
        });
        const { data, error } = await tempClient.auth.signInWithPassword({
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

    static async getGoogleOAuthUrl(redirectTo: string) {
        const tempClient = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!, {
            auth: { persistSession: false, autoRefreshToken: false }
        });
        const { data, error } = await tempClient.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo,
                queryParams: {
                    prompt: 'consent'
                }
            },
        });
        if (error) throw error;
        return data.url;
    }
}