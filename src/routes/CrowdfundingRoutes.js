import express from 'express';
import {
  createCampaign,
  getCampaignsByEvent,
  getCampaignById,
  updateCampaign,
  launchCampaign,
  addCampaignUpdate,
  donateToCampaign
} from '../controllers/CrowdFundingController.js';

const router = express.Router();

// Route to create a new crowdfunding campaign
router.post('/', createCampaign);

// Route to get all campaigns for a specific event
router.get('/event/:eventId', getCampaignsByEvent);

// Route to get a specific campaign by ID
router.get('/:id', getCampaignById);

// Route to update a campaign
router.put('/:id', updateCampaign);

// Route to launch a campaign
router.post('/:id/launch', launchCampaign);

// Route to add an update to a campaign
router.post('/:id/updates', addCampaignUpdate);

// Route to donate to a campaign
router.post('/:id/donate', donateToCampaign);

export default router;