import express from 'express';
import { getAllUsers, getUsersByRole, getUserById } from '../controllers/UserController.js';

const router = express.Router();

// Route to get all users (admin only)
router.get('/', getAllUsers);

// Route to get users by role
router.get('/role/:role', getUsersByRole);

// Route to get a user by ID
router.get('/:id', getUserById);

export default router;