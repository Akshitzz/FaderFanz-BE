import express from 'express';
import {
  createEvent,
  getAllEvents,
  getEventById,
  updateEvent,
  deleteEvent,
  attendEvent
} from '../controllers/EventController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Route to create a new event
router.post('/', protect, createEvent);

// Route to get all events
router.get('/', getAllEvents);

// Route to get a specific event by ID
router.get('/:id', getEventById);

// Route to update an event
router.put('/:id', protect, updateEvent);

// Route to delete an event
router.delete('/:id', protect, deleteEvent);

// Route to attend an event
router.post('/:id/attend', protect, attendEvent);

export default router;