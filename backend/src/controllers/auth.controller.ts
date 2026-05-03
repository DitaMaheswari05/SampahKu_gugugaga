import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { ROLES } from '../constants';

export const register = async (req: Request, res: Response) => {
    const { email, password, name, role } = req.body;
    if (!email || !password || !name || !role) return res.status(400).json({ status: 'error', message: 'Missing required fields' });
    if (!ROLES.includes(role)) return res.status(400).json({ status: 'error', message: 'Invalid role' });

    try {
        const result = await AuthService.register(email, password, name, role);
        res.status(201).json({ status: 'success', data: { user: result.user } });
    } catch (e: any) {
        console.error('Register error:', e);
        const message = e.message || 'Registration failed';
        const status = e.status || 500;
        res.status(status).json({ status: 'error', message });
    }
};

export const login = async (req: Request, res: Response) => {
    const { email, password } = req.body;

    try {
        const result = await AuthService.login(email, password);
        res.status(200).json({
            status: 'success',
            data: {
                session: result.session,
                user: result.user
            }
        });
    } catch (e: any) {
        console.error('Login error:', e);
        const message = e.message || 'Login failed';
        const status = e.status || 401;
        res.status(status).json({ status: 'error', message });
    }
};

export const getMe = async (req: Request, res: Response) => {
    if (!req.user) return res.status(401).json({ status: 'error', message: 'Unauthorized' });

    try {
        const profile = await AuthService.getUserProfile(req.user.id);
        res.status(200).json({
            status: 'success',
            data: profile
        });
    } catch (e: any) {
        console.error('getMe error:', e);
        res.status(500).json({ status: 'error', message: e.message || 'Failed to fetch profile' });
    }
};

export const googleLogin = async (req: Request, res: Response) => {
    try {
        const redirectTo = req.query.redirectTo as string || 'http://localhost:3000/login';
        const url = await AuthService.getGoogleOAuthUrl(redirectTo);
        res.status(200).json({
            status: 'success',
            data: { url }
        });
    } catch (e: any) {
        console.error('googleLogin error:', e);
        res.status(500).json({ status: 'error', message: e.message || 'Failed to generate OAuth URL' });
    }
};