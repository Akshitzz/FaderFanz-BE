import express from 'express';
import {
  createCampaign,
  getCampaignsByEvent,
  getCampaignById,
  updateCampaign,
  launchCampaign,
  addCampaignUpdate,
  donateToCampaign,
  getCampaignStats,
  getCampaignDetails
} from '../controllers/CrowdFundingController.js';
import { protect } from '../middleware/auth.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = express.Router();

// Configure multer for campaign banner uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = 'uploads/campaigns';
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, JPG, PNG and WebP are allowed.'));
    }
  }
});

// Get campaign statistics
router.get('/stats', getCampaignStats);

// Get detailed campaign information
router.get('/:id/details', getCampaignDetails);

// Route to create a new crowdfunding campaign
router.post('/', protect, upload.single('banner'), createCampaign);

// Route to get all campaigns for a specific event
router.get('/event/:eventId', getCampaignsByEvent);

// Route to get a specific campaign by ID
router.get('/:id', getCampaignById);

// Route to update a campaign
router.put('/:id', protect, updateCampaign);

// Route to launch a campaign
router.post('/:id/launch', protect, launchCampaign);

// Route to add an update to a campaign
router.post('/:id/updates', protect, addCampaignUpdate);

// Route to donate to a campaign
router.post('/:id/donate', protect, donateToCampaign);

export default router;