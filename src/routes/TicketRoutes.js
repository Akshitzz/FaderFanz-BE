import express from 'express';
import {
  getTicketDetails,
  calculatePrice,
  bookTickets
} from '../controllers/TicketBookingController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Get ticket details and availability for an event
router.get('/event/:eventId', getTicketDetails);

// Calculate price for selected tickets (including fees and GST)
router.post('/event/:eventId/calculate', calculatePrice);

// Book tickets for an event
router.post('/event/:eventId/book', protect, bookTickets);

export default router; 