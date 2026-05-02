import { Request, Response, NextFunction } from 'express';
import { supabase } from '../config/supabase';

export const protect = async (req: Request, res: Response, next: NextFunction) => {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ status: 'error', message: 'No token provided' });
    }

    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
        return res.status(401).json({ status: 'error', message: 'Invalid token' });
    }

    req.user = user;

    // fetch profile row and attach for easy authorization checks
    try {
        const { data: profile, error: pErr } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        if (pErr || !profile) {
            console.error('Failed fetching profile:', pErr);
            // Fallback to user_metadata
            req.profile = {
                id: user.id,
                email: user.email,
                name: user.user_metadata?.name || '',
                role: user.user_metadata?.role || 'KONSUMEN',
            } as any;
            
            // Try to auto-create profile row asynchronously
            supabase.from('profiles').upsert([req.profile], { onConflict: 'id' }).then();
        } else {
            req.profile = profile as any;
        }
    } catch (e) {
        console.error('Error fetching profile', e);
    }

    next();
}