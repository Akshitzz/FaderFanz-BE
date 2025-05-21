import Curator from '../models/Curator.js';
import Guest from '../models/Guest.js';
import Campaign from '../models/Campaign.js';
import VenueOwner from '../models/VenueOwner.js';
import Sponsor from '../models/Sponsor.js';

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

// Get curator by ID
export const getCuratorById = async (req, res) => {
  try {
    const curator = await Curator.findById(req.params.id)
      .select('-password')
      .populate('followers', 'firstName lastName stageName')
      .populate('posts.comments.userId', 'firstName lastName stageName');

    if (!curator) {
      return res.status(404).json({ message: 'Curator not found' });
    }

    res.json(curator);
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

// Get all venue owners with optional filtering
export const getAllVenueOwners = async (req, res) => {
  try {
    const { venueName, city } = req.query;
    const filter = {};

    if (venueName) {
      filter.venueName = { $regex: venueName, $options: 'i' };
    }
    if (city) {
      filter['address'] = { $regex: city, $options: 'i' };
    }

    const venueOwners = await VenueOwner.find(filter)
      .select('-password')
      .sort({ createdAt: -1 });

    res.json(venueOwners);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get all sponsors with optional filtering
export const getAllSponsors = async (req, res) => {
  try {
    const { businessName, preferredEvents, rating } = req.query;
    const filter = {};

    if (businessName) {
      filter.businessName = { $regex: businessName, $options: 'i' };
    }
    if (preferredEvents) {
      filter.preferredEvents = { $in: [preferredEvents] };
    }
    if (rating) {
      filter.rating = { $gte: parseFloat(rating) };
    }

    const sponsors = await Sponsor.find(filter)
      .select('-password')
      .sort({ rating: -1, eventsSponsoredCount: -1 });

    res.json(sponsors);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get sponsor by ID
export const getSponsorById = async (req, res) => {
  try {
    const sponsor = await Sponsor.findById(req.params.id)
      .select('-password')
      .populate('followers', 'firstName lastName stageName')
      .populate('eventsSponsored.eventId', 'title startDate endDate')
      .populate('posts.comments.userId', 'firstName lastName stageName');

    if (!sponsor) {
      return res.status(404).json({ message: 'Sponsor not found' });
    }

    res.json(sponsor);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
}; 