import { Request, Response, NextFunction } from 'express';
import { supabase } from '../config/supabase';

export const protect = async (req: Request, res: Response, next: NextFunction) => {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
        return res.status(401).json({status: 'error', message: 'No token provided'});
    }

    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
        return res.status(401).json({ status: 'error', message: 'Invalid token' });

    }

    req.user = user;
    next();
}