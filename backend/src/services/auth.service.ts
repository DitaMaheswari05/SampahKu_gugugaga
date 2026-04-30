import { supabase } from '../config/supabase';

export class AuthService {
    static async register(email: string, password: string, name: string, role: string, station_type?: string) {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { name, role, station_type }
            }
        });

        if(error) throw error;
        return data;
    }

    static async login(email: string, password: string) {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        if(error) throw error;
        return data;
    }

    static async getUserProfile(userId: string) {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if(error) throw error;
        return data;
    }
}