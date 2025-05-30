import VenueOwner from '../models/VenueOwner.js';
import Sponsor from '../models/Sponsor.js';
import Curator from '../models/Curator.js';
import Venue from '../models/Venue.js';
import Review from '../models/Review.js';
import Event from '../models/Event.js';
import Product from '../models/Product.js';
import BlogPost from '../models/BlogPost.js';

// Helper to format event with location, curator, sponsors, and products
async function formatEvent(event) {
  // Populate event with all necessary fields
  await event.populate([
    { path: 'creator', select: 'firstName lastName username profileImage bio stageName' },
    { path: 'venue', select: 'name location description images' },
    {
      path: 'sponsors',
      select: 'firstName lastName businessName businessLogo products',
      populate: { path: 'products', select: 'name price images description' }
    }
  ]);
  // Get products related to this event
  const Product = (await import('../models/Product.js')).default;
  const products = await Product.find({ relatedEvent: event._id }).select('name price images description');
  // Format location for iframe
  const location = event.venue?.location || event.location;
  const embedUrl = location?.coordinates ?
    `https://www.google.com/maps/embed/v1/place?key=${process.env.GOOGLE_MAPS_API_KEY}&q=${location.coordinates.latitude},${location.coordinates.longitude}` :
    null;
  return {
    ...event.toObject(),
    location: { ...location, embedUrl },
    curator: event.creator ? {
      id: event.creator._id,
      name: `${event.creator.firstName} ${event.creator.lastName}`,
      username: event.creator.username,
      profileImage: event.creator.profileImage,
      bio: event.creator.bio,
      stageName: event.creator.stageName
    } : null,
    sponsors: event.sponsors?.map(sponsor => ({
      id: sponsor._id,
      name: `${sponsor.firstName} ${sponsor.lastName}`,
      businessName: sponsor.businessName,
      businessLogo: sponsor.businessLogo,
      products: sponsor.products
    })) || [],
    products
  };
}

// Get venue owner profile with all related information
export const getVenueOwnerProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const venueOwner = await VenueOwner.findById(id)
      .select('-password');
    if (!venueOwner) {
      return res.status(404).json({ message: 'Venue owner not found' });
    }

    // Get all venues owned by this venue owner
    const venues = await Venue.find({ owner: id })
      .populate('reviews')
      .populate('events');

    // Get all reviews for venues owned by this venue owner
    const venueIds = venues.map(venue => venue._id);
    const reviews = await Review.find({ venue: { $in: venueIds } })
      .populate('reviewer', 'firstName lastName profileImage')
      .sort({ createdAt: -1 });

    // Get all events hosted at venues owned by this venue owner
    let events = await Event.find({ venue: { $in: venueIds } })
      .sort({ startDate: -1 });

    // Format each event
    events = await Promise.all(events.map(formatEvent));

    // Calculate average rating
    const averageRating = reviews.length > 0
      ? reviews.reduce((acc, review) => acc + review.rating, 0) / reviews.length
      : 0;

    res.json({
      success: true,
      data: {
        profile: venueOwner,
        venues,
        reviews,
        events,
        stats: {
          totalVenues: venues.length,
          totalReviews: reviews.length,
          totalEvents: events.length,
          averageRating
        }
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get sponsor profile with all related information
export const getSponsorProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const sponsor = await Sponsor.findById(id)
      .select('-password')
      .populate('reviews.reviewer', 'firstName lastName profileImage');
    if (!sponsor) {
      return res.status(404).json({ message: 'Sponsor not found' });
    }

    // Get all products
    const products = await Product.find({ owner: id })
      .populate('reviews')
      .sort({ createdAt: -1 });

    // Get all events sponsored
    let events = await Event.find({ sponsors: id })
      .sort({ startDate: -1 });

    // Format each event
    events = await Promise.all(events.map(formatEvent));

    // Get all blog posts
    const blogPosts = await BlogPost.find({ author: id })
      .populate('comments')
      .sort({ createdAt: -1 });

    // Calculate average rating from sponsor reviews
    const averageRating = sponsor.reviews.length > 0
      ? sponsor.reviews.reduce((acc, review) => acc + review.rating, 0) / sponsor.reviews.length
      : 0;

    res.json({
      success: true,
      data: {
        profile: sponsor,
        products,
        events,
        blogPosts,
        reviews: sponsor.reviews,
        stats: {
          totalProducts: products.length,
          totalEvents: events.length,
          totalBlogPosts: blogPosts.length,
          totalReviews: sponsor.reviews.length,
          averageRating
        }
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get curator profile with all related information
export const getCuratorProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const curator = await Curator.findById(id)
      .select('-password');
    if (!curator) {
      return res.status(404).json({ message: 'Curator not found' });
    }

    // Get all events created
    let events = await Event.find({ creator: id })
      .sort({ startDate: -1 });

    // Format each event
    events = await Promise.all(events.map(formatEvent));

    // Get all blog posts
    const blogPosts = await BlogPost.find({ author: id })
      .populate('comments')
      .sort({ createdAt: -1 });

    // Get all reviews received
    const reviews = await Review.find({ curator: id })
      .populate('reviewer', 'firstName lastName profileImage')
      .sort({ createdAt: -1 });

    // Calculate average rating
    const averageRating = reviews.length > 0
      ? reviews.reduce((acc, review) => acc + review.rating, 0) / reviews.length
      : 0;

    res.json({
      success: true,
      data: {
        profile: curator,
        events,
        blogPosts,
        reviews,
        stats: {
          totalEvents: events.length,
          totalBlogPosts: blogPosts.length,
          totalReviews: reviews.length,
          averageRating
        }
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Suggestions endpoint: returns top sponsors/curators to follow
export const getSuggestions = async (req, res) => {
  try {
    // Get top 5 sponsors and curators by rating or followers
    const sponsors = await (await import('../models/Sponsor.js')).default.find()
      .select('contactName businessName rating businessLogo')
      .sort({ rating: -1 })
      .limit(3);
    const curators = await (await import('../models/Curator.js')).default.find()
      .select('firstName lastName stageName rating profileImage')
      .sort({ rating: -1 })
      .limit(2);
    // Format suggestions
    const suggestions = [
      ...sponsors.map(s => ({
        name: s.contactName || s.businessName,
        rating: s.rating,
        profileImage: s.businessLogo
      })),
      ...curators.map(c => ({
        name: c.stageName || `${c.firstName} ${c.lastName}`,
        rating: c.rating,
        profileImage: c.profileImage
      }))
    ];
    res.json({ suggestions });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Popular event owners endpoint: returns top venue owners
export const getPopularEventOwners = async (req, res) => {
  try {
    const venueOwners = await (await import('../models/VenueOwner.js')).default.find()
      .select('venueName venueImage')
      .sort({ followersCount: -1 })
      .limit(4);
    // Format owners
    const owners = venueOwners.map(v => ({
      name: v.venueName,
      category: 'Music', // You can update this if you have category info
      image: v.venueImage?.[0] || null
    }));
    res.json({ popularEventOwners: owners });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Add review to sponsor
export const addSponsorReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;

    // Check if the reviewer is a guest
    if (req.user.role !== 'guest') {
      return res.status(403).json({ message: 'Only guests can add reviews' });
    }

    const sponsor = await Sponsor.findById(id);
    if (!sponsor) {
      return res.status(404).json({ message: 'Sponsor not found' });
    }

    // Add the review
    sponsor.reviews.push({
      reviewer: req.user.id,
      rating,
      comment
    });

    // Update sponsor's overall rating
    const totalRating = sponsor.reviews.reduce((acc, review) => acc + review.rating, 0);
    sponsor.rating = totalRating / sponsor.reviews.length;

    await sponsor.save();

    // Populate the reviewer details in the new review
    const populatedSponsor = await Sponsor.findById(id)
      .populate('reviews.reviewer', 'firstName lastName profileImage');

    res.json({
      success: true,
      message: 'Review added successfully',
      reviews: populatedSponsor.reviews
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
}; 