import express from 'express';
import {
  createVenue,
  getAllVenues,
  getVenueById,
  updateVenue,
  deleteVenue
} from '../controllers/VenueController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Route to create a new venue
router.post('/', protect, createVenue);

// Route to get all venues
router.get('/', getAllVenues);

// Route to get a specific venue by ID
router.get('/:id', getVenueById);

// Route to update a venue
router.put('/:id', protect, updateVenue);

// Route to delete a venue
router.delete('/:id', protect, deleteVenue);

export default router;