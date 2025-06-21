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
  addUserReview,
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing,
  createPost,
  likePost,
  commentOnPost
} from '../controllers/UserProfileController.js';
import { protect } from '../middleware/auth.js';
import { postUpload } from '../middleware/upload.js';

const router = express.Router();

// Get venue owner profile with all related information
router.get('/venue-owner/:id', getVenueOwnerProfile);

// Get sponsor profile with all related information
router.get('/sponsor/:id', protect, getSponsorProfile);

// Get curator profile with all related information
router.get('/curator/:id', protect, getCuratorProfile);

// Get guest profile with all related information
router.get('/guest/:id', protect, getGuestProfile);

// Suggestions endpoint
router.get('/suggestions', getSuggestions);

// Popular event owners endpoint
router.get('/popular-event-owners', getPopularEventOwners);

// Get current user's profile and related info
router.get('/me', protect, getMe);

// Create a new post
router.post('/posts', protect, postUpload, createPost);

// Like/Unlike a post
router.post('/posts/:postId/like', protect, likePost);

// Comment on a post
router.post('/posts/:postId/comment', protect, commentOnPost);

// Get all reviews for a user (public)
router.get('/:role/:id/reviews', getUserReviews);

// Add a review to a user (protected)
router.post('/:role/:id/review', protect, addUserReview);

// Follow/Unfollow Routes
router.post('/:role/:id/follow', protect, followUser);
router.post('/:role/:id/unfollow', protect, unfollowUser);

// Get Followers/Following Routes
router.get('/:role/:id/followers', getFollowers);
router.get('/:role/:id/following', getFollowing);

export default router; 