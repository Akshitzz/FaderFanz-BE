import express from 'express';
import {
  getVenueOwnerProfile,
  getSponsorProfile,
  getCuratorProfile,
  getGuestProfile,
  getSuggestions,
  getPopularEventOwners,
  getMe,
  getUserReviews,
  addUserReview
} from '../controllers/UserProfileController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Get venue owner profile with all related information
router.get('/venue-owner/:id', getVenueOwnerProfile);

// Get sponsor profile with all related information
router.get('/sponsor/:id', getSponsorProfile);

// Get curator profile with all related information
router.get('/curator/:id', getCuratorProfile);

// Get guest profile with all related information
router.get('/guest/:id', getGuestProfile);

// Suggestions endpoint
router.get('/suggestions', getSuggestions);

// Popular event owners endpoint
router.get('/popular-event-owners', getPopularEventOwners);

// Get current user's profile and related info
router.get('/me', protect, getMe);

// Get all reviews for a user (public)
router.get('/:role/:id/reviews', getUserReviews);

// Add a review to a user (protected)
router.post('/:role/:id/review', protect, addUserReview);

export default router; 