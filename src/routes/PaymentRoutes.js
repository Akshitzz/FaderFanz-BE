import express from 'express';
import {
  processTicketPayment,
  processProductPayment,
  getUserPaymentHistory,
  getPaymentById,
  processRefund
} from '../controllers/PaymentController.js';

const router = express.Router();

// Route to process ticket payment
router.post('/tickets', processTicketPayment);

// Route to process product payment
router.post('/products', processProductPayment);

// Route to get user payment history
router.get('/history', getUserPaymentHistory);

// Route to get payment details by ID
router.get('/:id', getPaymentById);

// Route to process a refund (admin only)
router.post('/:id/refund', processRefund);

export default router;