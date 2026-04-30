import { Router } from 'express'
import * as authController from '../controllers/auth.controller'
import { protect } from '../middlewares/auth.middleware'

const router = Router()

router.get('/login', (req, res) => {
    return res.status(200)
})

router.get('/register', (req, res) => {
    return res.status(200)
})

router.post('/login', authController.login)
router.post('/register', authController.register);

router.get('/me', protect, authController.getMe);

export default router;