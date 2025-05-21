import express from 'express';
import {
  getAllCurators,
  getAllGuests,
  getAllCampaigns,
  getAllVenueOwners,
  getAllSponsors,
  getCuratorById,
  getSponsorById
} from '../controllers/UserManagementController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Get all curators
router.get('/curators', getAllCurators);

// Get curator by ID
router.get('/curators/:id', getCuratorById);

// Get all guests
router.get('/guests', getAllGuests);

// Get all campaigns
router.get('/campaigns', getAllCampaigns);

// Get all venue owners
router.get('/venue-owners', getAllVenueOwners);

// Get all sponsors
router.get('/sponsors', getAllSponsors);

// Get sponsor by ID
router.get('/sponsors/:id', getSponsorById);

export default router; 