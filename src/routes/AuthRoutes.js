import express from 'express';
import { register, login, getProfile, updateProfile } from '../controllers/AuthController.js';

const router = express.Router();

// Route for user registration
router.post('/register', register);

// Route for user login
router.post('/login', login);

// Route to get user profile (protected route)
router.get('/profile', getProfile);

// Route to update user profile (protected route)
router.put('/profile', updateProfile);

export default router;