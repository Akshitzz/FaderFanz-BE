import Curator from '../models/Curator.js';
import Guest from '../models/Guest.js';
import Campaign from '../models/Campaign.js';

// Get all curators with optional filtering
export const getAllCurators = async (req, res) => {
  try {
    const { stageName, rating } = req.query;
    const filter = {};

    if (stageName) {
      filter.stageName = { $regex: stageName, $options: 'i' };
    }
    if (rating) {
      filter.averageRating = { $gte: parseFloat(rating) };
    }

    const curators = await Curator.find(filter)
      .select('-password')
      .sort({ averageRating: -1, followingCount: -1 });

    res.json(curators);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get all guests with optional filtering
export const getAllGuests = async (req, res) => {
  try {
    const { stageName } = req.query;
    const filter = {};

    if (stageName) {
      filter.stageName = { $regex: stageName, $options: 'i' };
    }

    const guests = await Guest.find(filter)
      .select('-password')
      .sort({ createdAt: -1 });

    res.json(guests);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get all campaigns with optional filtering
export const getAllCampaigns = async (req, res) => {
  try {
    const { status, creator, event } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (creator) filter.creator = creator;
    if (event) filter.event = event;

    const campaigns = await Campaign.find(filter)
      .populate('creator', 'firstName lastName stageName')
      .populate('event', 'title startDate endDate')
      .sort({ createdAt: -1 });

    res.json(campaigns);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
}; 