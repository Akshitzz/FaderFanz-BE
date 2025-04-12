import express from 'express';
import {
  createEvent,
  getAllEvents,
  getEventById,
  updateEvent,
  deleteEvent,
  attendEvent
} from '../controllers/EventController.js';

const router = express.Router();

// Route to create a new event
router.post('/', createEvent);

// Route to get all events
router.get('/', getAllEvents);

// Route to get a specific event by ID
router.get('/:id', getEventById);

// Route to update an event
router.put('/:id', updateEvent);

// Route to delete an event
router.delete('/:id', deleteEvent);

// Route to attend an event
router.post('/:id/attend', attendEvent);

export default router;