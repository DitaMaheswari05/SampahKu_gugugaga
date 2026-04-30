import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';

export const register = async (req: Request, res: Response) => {
    const { email, password, name, role, station_type } = req.body;
    const result = await AuthService.register(email, password, name, role, station_type);

    res.status(201).json({
        status: 'success',
        data: { user: result.user }
    });
};

export const login = async (req: Request, res: Response) => {
    const { email, password } = req.body;
    const result = await AuthService.login(email, password);

    res.status(200).json({
        status: 'success',
        data: {
            session: result.session,
            user: result.user
        }
    })
};

export const getMe = async (req: Request, res: Response) => {
    if (!req.user) return res.status(401).json({ status: 'error', message: 'Unauthorized' });
    const profile = await AuthService.getUserProfile(req.user.id);

    res.status(200).json({
        status: 'success',
        data: profile
    })
}