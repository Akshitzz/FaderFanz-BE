import Event from '../models/Event.js';
import VenueOwner from '../models/VenueOwner.js';
import Curator from '../models/Curator.js';
import Guest from '../models/Guest.js';
import Campaign from '../models/Campaign.js';
import Payment from '../models/Payment.js';

// Get popular events based on location and ratings
export const getPopularEvents = async (req, res) => {
  try {
    const { city, state, country, radius } = req.query;
    const limit = parseInt(req.query.limit) || 10;

    // Build location filter
    const locationFilter = {};
    if (city) locationFilter['location.city'] = city;
    if (state) locationFilter['location.state'] = state;
    if (country) locationFilter['location.country'] = country;

    console.log('Location filter:', locationFilter);

    // If coordinates and radius provided, use geospatial query
    if (req.query.lat && req.query.lng && radius) {
      locationFilter['location.coordinates'] = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(req.query.lng), parseFloat(req.query.lat)]
          },
          $maxDistance: parseInt(radius) * 1000 // Convert km to meters
        }
      };
    }

    // Get all events first (for debugging)
    const allEvents = await Event.find({});
    console.log('Total events in DB:', allEvents.length);
    
    // Log all event dates for debugging
    console.log('All event dates:', allEvents.map(e => ({
      id: e._id,
      title: e.title,
      startDate: e.startDate,
      status: e.status
    })));

    // Get events with minimal filtering
    const events = await Event.find({
      ...locationFilter
    })
    .populate('creator', 'firstName lastName username profileImage stageName rating')
    .populate('venue', 'name location')
    .populate('sponsors', 'businessName businessLogo')
    .sort({ 
      totalTicketsSold: -1,
      'reviews.rating': -1
    })
    .limit(limit);

    console.log('Found events:', events.length);

    res.json({
      success: true,
      count: events.length,
      data: events,
      debug: {
        totalEventsInDB: allEvents.length,
        eventDates: allEvents.map(e => ({
          id: e._id,
          title: e.title,
          startDate: e.startDate,
          status: e.status
        })),
        appliedFilters: {
          location: locationFilter
        },
        systemDate: new Date()
      }
    });
  } catch (error) {
    console.error('Error in getPopularEvents:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get popular venue owners based on event success and ratings
export const getPopularVenueOwners = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    const venueOwners = await VenueOwner.aggregate([
      {
        $lookup: {
          from: 'venues',
          localField: '_id',
          foreignField: 'owner',
          as: 'venues'
        }
      },
      {
        $lookup: {
          from: 'events',
          localField: 'venues._id',
          foreignField: 'venue',
          as: 'events'
        }
      },
      {
        $addFields: {
          totalEvents: { $size: '$events' },
          averageRating: { $avg: '$venues.rating' },
          totalRevenue: { $sum: '$events.totalRevenue' }
        }
      },
      {
        $sort: {
          totalEvents: -1,
          averageRating: -1,
          totalRevenue: -1
        }
      },
      {
        $limit: limit
      },
      {
        $project: {
          _id: 1,
          firstName: 1,
          lastName: 1,
          businessName: 1,
          profileImage: 1,
          totalEvents: 1,
          averageRating: 1,
          venues: { $size: '$venues' }
        }
      }
    ]);

    res.json({
      success: true,
      count: venueOwners.length,
      data: venueOwners
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get popular curators based on event success and following
export const getPopularCurators = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    const curators = await Curator.aggregate([
      {
        $lookup: {
          from: 'events',
          localField: '_id',
          foreignField: 'creator',
          as: 'events'
        }
      },
      {
        $addFields: {
          totalEvents: { $size: '$events' },
          totalAttendees: { $sum: { $size: '$events.attendees' } },
          averageRating: { $avg: '$rating' }
        }
      },
      {
        $sort: {
          followersCount: -1,
          totalEvents: -1,
          averageRating: -1
        }
      },
      {
        $limit: limit
      },
      {
        $project: {
          _id: 1,
          firstName: 1,
          lastName: 1,
          username: 1,
          profileImage: 1,
          stageName: 1,
          totalEvents: 1,
          followersCount: 1,
          averageRating: 1,
          totalAttendees: 1
        }
      }
    ]);

    res.json({
      success: true,
      count: curators.length,
      data: curators
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get all active campaigns with stats
export const getAllCampaigns = async (req, res) => {
  try {
    const { status, category, sort } = req.query;
    const filter = {};

    // Apply filters
    if (status) filter.status = status;
    if (category) filter.category = category;

    // Determine sort order
    let sortOption = { createdAt: -1 };
    if (sort === 'mostFunded') sortOption = { amountRaised: -1 };
    if (sort === 'endingSoon') sortOption = { endDate: 1 };
    if (sort === 'trending') sortOption = { fundingProgress: -1 };

    const campaigns = await Campaign.find(filter)
      .populate('creator', 'firstName lastName username profileImage')
      .populate('event', 'title description banner')
      .sort(sortOption);

    // Calculate campaign statistics
    const stats = {
      totalCampaigns: await Campaign.countDocuments(filter),
      totalRaised: await Campaign.aggregate([
        { $match: filter },
        { $group: { _id: null, total: { $sum: '$amountRaised' } } }
      ]),
      byCategoryCount: await Campaign.aggregate([
        { $match: filter },
        { $group: { _id: '$category', count: { $sum: 1 } } }
      ])
    };

    res.json({
      success: true,
      stats,
      data: campaigns
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get popular fans/guests based on event attendance and contributions
export const getPopularFans = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    // Aggregate guest activity
    const guests = await Guest.aggregate([
      // Lookup events attended
      {
        $lookup: {
          from: 'events',
          localField: '_id',
          foreignField: 'attendees',
          as: 'eventsAttended'
        }
      },
      // Lookup donations made
      {
        $lookup: {
          from: 'payments',
          localField: '_id',
          foreignField: 'user',
          as: 'payments'
        }
      },
      // Calculate metrics
      {
        $addFields: {
          totalEventsAttended: { $size: '$eventsAttended' },
          totalDonations: {
            $sum: {
              $filter: {
                input: '$payments',
                as: 'payment',
                cond: { $eq: ['$$payment.paymentType', 'donation'] }
              }
            }
          },
          totalSpent: { $sum: '$payments.amount' }
        }
      },
      // Sort by activity
      {
        $sort: {
          totalEventsAttended: -1,
          totalDonations: -1,
          totalSpent: -1
        }
      },
      {
        $limit: limit
      },
      // Project relevant fields
      {
        $project: {
          _id: 1,
          firstName: 1,
          lastName: 1,
          username: 1,
          profileImage: 1,
          totalEventsAttended: 1,
          totalDonations: 1,
          totalSpent: 1
        }
      }
    ]);

    res.json({
      success: true,
      count: guests.length,
      data: guests
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
}; 