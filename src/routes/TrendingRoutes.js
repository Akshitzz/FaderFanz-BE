import express from 'express';
import {
  getPopularEvents,
  getPopularVenueOwners,
  getPopularCurators,
  getAllCampaigns,
  getPopularFans
} from '../controllers/TrendingController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Popular events routes
router.get('/events', getPopularEvents);

// Popular venue owners routes
router.get('/venue-owners', getPopularVenueOwners);

// Popular curators routes
router.get('/curators', getPopularCurators);

// All campaigns with stats
router.get('/campaigns', getAllCampaigns);

// Popular fans/guests routes
router.get('/fans', protect, getPopularFans);

export default router; 