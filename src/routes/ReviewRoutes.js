import express from 'express';
import {
  createReview,
  getReviewsByEvent,
  updateReview,
  deleteReview,
  addReplyToReview
} from '../controllers/ReviewController.js';

const router = express.Router();

// Route to create a new review
router.post('/', createReview);

// Route to get all reviews for a specific event
router.get('/event/:eventId', getReviewsByEvent);

// Route to update a review
router.put('/:id', updateReview);

// Route to delete a review
router.delete('/:id', deleteReview);

// Route to add a reply to a review
router.post('/:id/replies', addReplyToReview);

export default router;