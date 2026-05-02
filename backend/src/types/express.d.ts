import { User } from '@supabase/supabase-js';

declare global {
    namespace Express {
        interface Request {
            user?: User;
            profile?: {
                id: string;
                email: string;
                name: string;
                role: string;
                points?: number;
                created_at?: string;
            } | null;
        }
    }
}

export {};