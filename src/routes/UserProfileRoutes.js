import express from 'express';
import {
  getVenueOwnerProfile,
  getSponsorProfile,
  getCuratorProfile,
  getSuggestions,
  getPopularEventOwners,
  addSponsorReview
} from '../controllers/UserProfileController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Get venue owner profile with all related information
router.get('/venue-owner/:id', getVenueOwnerProfile);

// Get sponsor profile with all related information
router.get('/sponsor/:id', getSponsorProfile);

// Add review to sponsor (protected route, only for guests)
router.post('/sponsor/:id/review', protect, addSponsorReview);

// Get curator profile with all related information
router.get('/curator/:id', getCuratorProfile);

// Suggestions endpoint
router.get('/suggestions', getSuggestions);

// Popular event owners endpoint
router.get('/popular-event-owners', getPopularEventOwners);

export default router; 