import express from 'express';
import {
  getAllCurators,
  getAllGuests,
  getAllCampaigns
} from '../controllers/UserManagementController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Get all curators
router.get('/curators', getAllCurators);

// Get all guests
router.get('/guests', getAllGuests);

// Get all campaigns
router.get('/campaigns', getAllCampaigns);

export default router; 