import express from 'express';
import {
  createVenue,
  getAllVenues,
  getVenueById,
  updateVenue,
  deleteVenue
} from '../controllers/VenueController.js';
import {
  addPhotos,
  removePhotos,
  updatePhotoDetails,
  getGallery,
  reorderPhotos
} from '../controllers/VenueGalleryController.js';
import { protect } from '../middleware/auth.js';
import { venueUpload, handleUploadError } from '../middleware/upload.js';
import {
  getVenueReviews,
  addVenueReview
} from '../controllers/UserProfileController.js';

const router = express.Router();

// Route to create a new venue
router.post('/', protect, venueUpload, handleUploadError, createVenue);

// Route to get all venues
router.get('/', getAllVenues);

// Route to get a specific venue by ID
router.get('/:id', getVenueById);

// Route to update a venue
router.put('/:id', protect, updateVenue);
router.delete('/:id', protect, deleteVenue);

// Gallery management routes
router.get('/:id/gallery', getGallery);
router.post('/:id/gallery', protect, venueUpload, addPhotos);
router.delete('/:id/gallery', protect, removePhotos);
router.put('/:id/gallery/reorder', protect, reorderPhotos);
router.put('/:id/gallery/:photoId', protect, updatePhotoDetails);

// Route to get all reviews for a venue
router.get('/:id/reviews', getVenueReviews);
// Route to add a review to a venue
router.post('/:id/review', protect, addVenueReview);

export default router;