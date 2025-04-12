import express from 'express';
import {
  createVenue,
  getAllVenues,
  getVenueById,
  updateVenue,
  deleteVenue
} from '../controllers/VenueController.js';

const router = express.Router();

// Route to create a new venue
router.post('/', createVenue);

// Route to get all venues
router.get('/', getAllVenues);

// Route to get a specific venue by ID
router.get('/:id', getVenueById);

// Route to update a venue
router.put('/:id', updateVenue);

// Route to delete a venue
router.delete('/:id', deleteVenue);

export default router;