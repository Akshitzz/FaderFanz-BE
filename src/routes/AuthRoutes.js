import express from 'express';
import {
  registerSponsor,
  registerVenueOwner,
  registerCurator,
  registerGuest,
  login, // Import the login function
} from '../controllers/AuthController.js';
import {
  profileUpload,
  venueUpload,
  mediaUpload,
  handleUploadError,
  mediaUpload2,
} from '../middleware/upload.js';

const router = express.Router();

// Route to register a sponsor
router.post(
  '/register/sponsor',
  profileUpload, // Middleware to handle sponsor profile image uploads
  handleUploadError, // Middleware to handle upload errors
  registerSponsor
);

// Route to register a venue owner
router.post(
  '/register/venue-owner',
  venueUpload, // Middleware to handle venue image uploads
  handleUploadError, // Middleware to handle upload errors
  registerVenueOwner
);

// Route to register a curator
router.post(
  '/register/curator',
  mediaUpload, // Middleware to handle curator media uploads
  handleUploadError, // Middleware to handle upload errors
  registerCurator
);

// Route to register a guest
router.post(
  '/register/guest',
  mediaUpload2, // Middleware to handle guest media uploads
  handleUploadError, // Middleware to handle upload errors
  registerGuest
);

// Route to login
router.post('/login', login); // Add the login route

export default router;