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
import { handleGalleryUpload } from '../middleware/upload.js';

const router = express.Router();

// Route to create a new venue
router.post('/', protect, createVenue);

// Route to get all venues
router.get('/', getAllVenues);

// Route to get a specific venue by ID
router.get('/:id', getVenueById);

// Route to update a venue
router.put('/:id', protect, updateVenue);
router.delete('/:id', protect, deleteVenue);

// Gallery management routes
router.get('/:id/gallery', getGallery);
router.post('/:id/gallery', protect, handleGalleryUpload, addPhotos);
router.delete('/:id/gallery', protect, removePhotos);
router.put('/:id/gallery/reorder', protect, reorderPhotos);
router.put('/:id/gallery/:photoId', protect, updatePhotoDetails);

export default router;