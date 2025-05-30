import express from 'express';
import {
  createEvent,
  getAllEvents,
  getEventById,
  updateEvent,
  deleteEvent,
  attendEvent,
  toggleEventLike,
  toggleEventInterest,
  getEventLikes,
  getEventInterested,
  addEventProduct,
  updateEventProduct,
  deleteEventProduct,
  getEventProducts,
  getEventCreationData
} from '../controllers/EventController.js';
import { protect } from '../middleware/auth.js';
import { eventUpload, handleUploadError } from '../middleware/upload.js';

const router = express.Router();

// Route to get sponsors and curators for event creation
router.get('/creation-data', protect, getEventCreationData);

// Route to create a new event
router.post('/', protect, eventUpload, handleUploadError, createEvent);

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

// Routes for likes and interests
router.post('/:id/like', protect, toggleEventLike);
router.post('/:id/interest', protect, toggleEventInterest);
router.get('/:id/likes', getEventLikes);
router.get('/:id/interested', getEventInterested);

// Routes for event products
router.post('/:id/products', protect, addEventProduct);
router.put('/:eventId/products/:productId', protect, updateEventProduct);
router.delete('/:eventId/products/:productId', protect, deleteEventProduct);
router.get('/:id/products', getEventProducts);

export default router;