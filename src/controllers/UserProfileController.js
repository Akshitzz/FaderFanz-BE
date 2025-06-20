import VenueOwner from '../models/VenueOwner.js';
import Sponsor from '../models/Sponsor.js';
import Curator from '../models/Curator.js';
import Venue from '../models/Venue.js';
import Review from '../models/Review.js';
import Event from '../models/Event.js';
import Product from '../models/Product.js';
import BlogPost from '../models/BlogPost.js';
import Guest from '../models/Guest.js';

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
      .select('-password')
      .populate('followers.user', 'firstName lastName stageName businessName profileImage');
    if (!venueOwner) {
      return res.status(404).json({ message: 'Venue owner not found' });
    }

    // Get all venues owned by this venue owner
    const venuesRaw = await Venue.find({ owner: id }).populate('reviews');

    // For each venue, fetch its events
    const venues = await Promise.all(venuesRaw.map(async (venue) => {
      const events = await Event.find({ venue: venue._id }).sort({ startDate: -1 });
      const formattedEvents = await Promise.all(events.map(formatEvent));
      return {
        venue,
        events: formattedEvents
      };
    }));

    // Get all reviews for venues owned by this venue owner
    const venueIds = venuesRaw.map(venue => venue._id);
    const reviews = await Review.find({ venue: { $in: venueIds } })
      .populate('reviewer', 'firstName lastName profileImage')
      .sort({ createdAt: -1 });

    // Feed (posts)
    const feed = venueOwner.posts || [];

    // Followers (with details)
    const followers = venueOwner.followers || [];

    // Products: collect all menuProducts from all venues
    let products = [];
    venuesRaw.forEach(venue => {
      if (venue.menuProducts && Array.isArray(venue.menuProducts)) {
        products = products.concat(venue.menuProducts.map(p => ({ ...p.toObject?.() || p, venue: venue._id })));
      }
    });
    // Also add menuProducts from VenueOwner if present
    if (venueOwner.menuProducts && Array.isArray(venueOwner.menuProducts)) {
      products = products.concat(venueOwner.menuProducts.map(p => ({ ...p.toObject?.() || p, venue: null })));
    }

    // Favorites (populate details)
    const favoriteEventIds = venueOwner.favorites.filter(f => f.type === 'event').map(f => f.item);
    const favoriteProductIds = venueOwner.favorites.filter(f => f.type === 'product').map(f => f.item);
    const favoriteVenueIds = venueOwner.favorites.filter(f => f.type === 'venue').map(f => f.item);
    const favoriteEvents = await Event.find({ _id: { $in: favoriteEventIds } });
    const favoriteProducts = await Product.find({ _id: { $in: favoriteProductIds } });
    const favoriteVenues = await Venue.find({ _id: { $in: favoriteVenueIds } });
    const favorites = [
      ...favoriteEvents.map(e => ({ type: 'event', data: e })),
      ...favoriteProducts.map(p => ({ type: 'product', data: p })),
      ...favoriteVenues.map(v => ({ type: 'venue', data: v }))
    ];

    // Calculate average rating
    const averageRating = reviews.length > 0
      ? reviews.reduce((acc, review) => acc + review.rating, 0) / reviews.length
      : 0;

    // Can edit profile if the requesting user is the venue owner
    const canEditProfile = req.user && req.user.id === venueOwner._id.toString();

    res.json({
      success: true,
      data: {
        profile: venueOwner,
        venues, // [{ venue, events: [...] }]
        followers,
        products,
        feed,
        favorites,
        reviews,
        canEditProfile,
        stats: {
          totalVenues: venues.length,
          totalReviews: reviews.length,
          totalEvents: venues.reduce((acc, v) => acc + v.events.length, 0),
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
      .populate('reviews.reviewer', 'firstName lastName profileImage')
      .populate('followers', 'firstName lastName stageName businessName profileImage');
    if (!sponsor) {
      return res.status(404).json({ message: 'Sponsor not found' });
    }

    // Get all products
    const products = await Product.find({ seller: id })
      .populate('reviews')
      .sort({ createdAt: -1 });

    // Get all events sponsored (with event details)
    const sponsoredEventIds = sponsor.eventsSponsored.map(e => e.eventId);
    let sponsoredEvents = await Event.find({ _id: { $in: sponsoredEventIds } })
      .sort({ startDate: -1 });
    sponsoredEvents = await Promise.all(sponsoredEvents.map(formatEvent));

    // Upcoming sponsored events
    const now = new Date();
    const upcomingSponsoredEvents = sponsoredEvents.filter(e => new Date(e.startDate) > now);

    // Get all blog posts
    const blogPosts = await BlogPost.find({ author: id })
      .populate('comments')
      .sort({ createdAt: -1 });

    // Feed (posts)
    const feed = sponsor.posts || [];

    // Followers (with details)
    const followers = sponsor.followers || [];

    // Favorites (populate details)
    const favoriteEventIds = sponsor.favorites.filter(f => f.type === 'event').map(f => f.item);
    const favoriteProductIds = sponsor.favorites.filter(f => f.type === 'product').map(f => f.item);
    const favoriteVenueIds = sponsor.favorites.filter(f => f.type === 'venue').map(f => f.item);
    const favoriteEvents = await Event.find({ _id: { $in: favoriteEventIds } });
    const favoriteProducts = await Product.find({ _id: { $in: favoriteProductIds } });
    const favoriteVenues = await Venue.find({ _id: { $in: favoriteVenueIds } });
    const favorites = [
      ...favoriteEvents.map(e => ({ type: 'event', data: e })),
      ...favoriteProducts.map(p => ({ type: 'product', data: p })),
      ...favoriteVenues.map(v => ({ type: 'venue', data: v }))
    ];

    // Calculate average rating from sponsor reviews
    const averageRating = sponsor.reviews.length > 0
      ? sponsor.reviews.reduce((acc, review) => acc + review.rating, 0) / sponsor.reviews.length
      : 0;

    // Can edit profile if the requesting user is the sponsor
    const canEditProfile = req.user && req.user.id === sponsor._id.toString();

    res.json({
      success: true,
      data: {
        profile: sponsor,
        sponsoredEvents,
        upcomingSponsoredEvents,
        products,
        followers,
        feed,
        favorites,
        blogPosts,
        reviews: sponsor.reviews,
        canEditProfile,
        stats: {
          totalProducts: products.length,
          totalEvents: sponsoredEvents.length,
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
      .select('-password')
      .populate('followers', 'firstName lastName stageName businessName profileImage');
    if (!curator) {
      return res.status(404).json({ message: 'Curator not found' });
    }

    // Get all events curated
    let events = await Event.find({ creator: id })
      .sort({ startDate: -1 });
    events = await Promise.all(events.map(formatEvent));

    // Feed (posts)
    const feed = curator.posts || [];

    // Followers (with details)
    const followers = curator.followers || [];

    // Favorites (populate details)
    const favoriteEventIds = curator.favorites.filter(f => f.type === 'event').map(f => f.item);
    const favoriteProductIds = curator.favorites.filter(f => f.type === 'product').map(f => f.item);
    const favoriteVenueIds = curator.favorites.filter(f => f.type === 'venue').map(f => f.item);
    const favoriteEvents = await Event.find({ _id: { $in: favoriteEventIds } });
    const favoriteProducts = await Product.find({ _id: { $in: favoriteProductIds } });
    const favoriteVenues = await Venue.find({ _id: { $in: favoriteVenueIds } });
    const favorites = [
      ...favoriteEvents.map(e => ({ type: 'event', data: e })),
      ...favoriteProducts.map(p => ({ type: 'product', data: p })),
      ...favoriteVenues.map(v => ({ type: 'venue', data: v }))
    ];

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

    // Can edit profile if the requesting user is the curator
    const canEditProfile = req.user && req.user.id === curator._id.toString();

    res.json({
      success: true,
      data: {
        profile: curator,
        events,
        followers,
        feed,
        favorites,
        blogPosts,
        reviews,
        canEditProfile,
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

// Get current user's profile and related info
export const getMe = async (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;
    if (!userId || !role) {
      return res.status(400).json({ message: 'User ID or role missing from token' });
    }
    if (role === 'venueOwner') {
      // Venue Owner logic (reuse getVenueOwnerProfile logic)
      const venueOwner = await VenueOwner.findById(userId).select('-password');
      if (!venueOwner) {
        return res.status(404).json({ message: 'Venue owner not found' });
      }

      // Correctly fetch venues and their associated events
      const venuesRaw = await Venue.find({ owner: userId }).populate('reviews');
      const venues = await Promise.all(venuesRaw.map(async (venue) => {
        const events = await Event.find({ venue: venue._id }).sort({ startDate: -1 });
        const formattedEvents = await Promise.all(events.map(formatEvent));
        return {
          venue,
          events: formattedEvents
        };
      }));

      const venueIds = venuesRaw.map(venue => venue._id);
      const reviews = await Review.find({ venue: { $in: venueIds } })
        .populate('reviewer', 'firstName lastName profileImage')
        .sort({ createdAt: -1 });

      const averageRating = reviews.length > 0 ? reviews.reduce((acc, review) => acc + review.rating, 0) / reviews.length : 0;
      return res.json({
        success: true,
        data: {
          profile: venueOwner,
          venues, // venues will be an array of { venue, events: [...] }
          reviews,
          stats: {
            totalVenues: venues.length,
            totalReviews: reviews.length,
            totalEvents: venues.reduce((acc, v) => acc + v.events.length, 0),
            averageRating
          }
        }
      });
    } else if (role === 'sponsor') {
      // Sponsor logic (reuse getSponsorProfile logic)
      const sponsor = await Sponsor.findById(userId)
        .select('-password')
        .populate('reviews.reviewer', 'firstName lastName profileImage');
      if (!sponsor) {
        return res.status(404).json({ message: 'Sponsor not found' });
      }
      const products = await Product.find({ owner: userId }).populate('reviews').sort({ createdAt: -1 });
      let events = await Event.find({ sponsors: userId }).sort({ startDate: -1 });
      events = await Promise.all(events.map(formatEvent));
      const blogPosts = await BlogPost.find({ author: userId }).populate('comments').sort({ createdAt: -1 });
      const averageRating = sponsor.reviews.length > 0 ? sponsor.reviews.reduce((acc, review) => acc + review.rating, 0) / sponsor.reviews.length : 0;
      return res.json({
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
    } else if (role === 'curator') {
      // Curator logic (reuse getCuratorProfile logic)
      const curator = await Curator.findById(userId).select('-password');
      if (!curator) {
        return res.status(404).json({ message: 'Curator not found' });
      }
      let events = await Event.find({ creator: userId }).sort({ startDate: -1 });
      events = await Promise.all(events.map(formatEvent));
      const blogPosts = await BlogPost.find({ author: userId }).populate('comments').sort({ createdAt: -1 });
      const reviews = await Review.find({ curator: userId })
        .populate('reviewer', 'firstName lastName profileImage')
        .sort({ createdAt: -1 });
      const averageRating = reviews.length > 0 ? reviews.reduce((acc, review) => acc + review.rating, 0) / reviews.length : 0;
      return res.json({
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
    } else if (role === 'guest') {
      // Guest logic: just return guest profile (excluding password)
      const guest = await Guest.findById(userId).select('-password');
      if (!guest) {
        return res.status(404).json({ message: 'Guest not found' });
      }
      return res.json({
        success: true,
        data: {
          profile: guest
        }
      });
    } else {
      return res.status(400).json({ message: 'Invalid user role' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get all reviews for a user (by id and role)
export const getUserReviews = async (req, res) => {
  try {
    const { id, role } = req.params;
    let Model;
    switch (role) {
      case 'guest': Model = Guest; break;
      case 'curator': Model = Curator; break;
      case 'sponsor': Model = Sponsor; break;
      case 'venueOwner': Model = VenueOwner; break;
      default: return res.status(400).json({ message: 'Invalid role' });
    }
    const user = await Model.findById(id).select('reviews');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ reviews: user.reviews });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Add a review to any user (by id and role) - REFACTORED
export const addUserReview = async (req, res) => {
  try {
    const { id, role } = req.params; // The user being reviewed
    const { rating, comment } = req.body;
    const reviewerUser = req.user; // The user writing the review

    if (!rating || !comment) {
      return res.status(400).json({ message: 'Rating and comment are required' });
    }

    if (id === reviewerUser.id && role === reviewerUser.role) {
      return res.status(400).json({ message: 'You cannot review yourself' });
    }

    let Model;
    let reviewerModel;

    switch (role) {
      case 'guest': Model = Guest; break;
      case 'curator': Model = Curator; break;
      case 'sponsor': Model = Sponsor; break;
      case 'venueOwner': Model = VenueOwner; break;
      default: return res.status(400).json({ message: 'Invalid role for user being reviewed' });
    }
    
    switch (reviewerUser.role) {
      case 'guest': reviewerModel = Guest; break;
      case 'curator': reviewerModel = Curator; break;
      case 'sponsor': reviewerModel = Sponsor; break;
      case 'venueOwner': reviewerModel = VenueOwner; break;
      default: return res.status(400).json({ message: 'Invalid role for reviewer' });
    }

    const userToReview = await Model.findById(id);
    if (!userToReview) {
      return res.status(404).json({ message: 'User to review not found' });
    }
    
    const reviewer = await reviewerModel.findById(reviewerUser.id);
    if (!reviewer) {
      return res.status(404).json({ message: 'Reviewer not found' });
    }

    let reviewerName = '';
    if (reviewerUser.role === 'guest' || reviewerUser.role === 'curator') {
      reviewerName = `${reviewer.firstName} ${reviewer.lastName}`;
    } else if (reviewerUser.role === 'sponsor') {
      reviewerName = reviewer.businessName;
    } else if (reviewerUser.role === 'venueOwner') {
      reviewerName = reviewer.venueName;
    }

    const newReview = {
      reviewer: reviewerUser.id,
      reviewerModel: reviewerUser.role.charAt(0).toUpperCase() + reviewerUser.role.slice(1),
      reviewerRole: reviewerUser.role,
      reviewerName,
      rating,
      comment,
      createdAt: new Date()
    };
    
    const updatedUser = await Model.findByIdAndUpdate(
      id,
      { $push: { reviews: newReview } },
      { new: true, runValidators: true }
    ).select('reviews');

    res.status(201).json({ message: 'Review added successfully', reviews: updatedUser.reviews });

  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get all reviews for a venue (by id)
export const getVenueReviews = async (req, res) => {
  try {
    const { id } = req.params;
    const venue = await Venue.findById(id).select('reviews owner');
    if (!venue) return res.status(404).json({ message: 'Venue not found' });
    res.json({ reviews: venue.reviews });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Add a review to a venue (by id) - REFACTORED
export const addVenueReview = async (req, res) => {
  try {
    const { id } = req.params; // Venue ID
    const { rating, comment } = req.body;
    const reviewerUser = req.user;

    if (!rating || !comment) {
      return res.status(400).json({ message: 'Rating and comment are required' });
    }

    const venue = await Venue.findById(id).select('reviews owner');
    if (!venue) {
      return res.status(404).json({ message: 'Venue not found' });
    }

    if (venue.owner.toString() === reviewerUser.id && reviewerUser.role === 'venueOwner') {
      return res.status(400).json({ message: 'You cannot review your own venue' });
    }
    
    let reviewerModel;
    switch (reviewerUser.role) {
      case 'guest': reviewerModel = Guest; break;
      case 'curator': reviewerModel = Curator; break;
      case 'sponsor': reviewerModel = Sponsor; break;
      case 'venueOwner': reviewerModel = VenueOwner; break;
      default: return res.status(400).json({ message: 'Invalid role for reviewer' });
    }

    const reviewer = await reviewerModel.findById(reviewerUser.id);
    if (!reviewer) {
      return res.status(404).json({ message: 'Reviewer not found' });
    }

    let reviewerName = '';
    if (reviewerUser.role === 'guest' || reviewerUser.role === 'curator') {
      reviewerName = `${reviewer.firstName} ${reviewer.lastName}`;
    } else if (reviewerUser.role === 'sponsor') {
      reviewerName = reviewer.businessName;
    } else if (reviewerUser.role === 'venueOwner') {
      reviewerName = reviewer.venueName;
    }

    const newReview = {
      reviewer: reviewerUser.id,
      reviewerModel: reviewerUser.role.charAt(0).toUpperCase() + reviewerUser.role.slice(1),
      reviewerRole: reviewerUser.role,
      reviewerName,
      rating,
      comment,
      createdAt: new Date()
    };
    
    const updatedVenue = await Venue.findByIdAndUpdate(
      id,
      { $push: { reviews: newReview } },
      { new: true, runValidators: true }
    ).select('reviews');

    res.status(201).json({ message: 'Review added successfully', reviews: updatedVenue.reviews });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Add getGuestProfile
export const getGuestProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const guest = await Guest.findById(id).select('-password');
    if (!guest) {
      return res.status(404).json({ message: 'Guest not found' });
    }
    // Events booked (from ticketBookings)
    const eventIds = (guest.ticketBookings || []).map(tb => tb.event);
    const events = await Event.find({ _id: { $in: eventIds } });
    // Feed (if any)
    const feed = guest.posts || [];
    // Followers (if any)
    const followers = guest.followers || [];
    // Favorites (populate details)
    const favoriteEventIds = guest.favorites.filter(f => f.type === 'event').map(f => f.item);
    const favoriteProductIds = guest.favorites.filter(f => f.type === 'product').map(f => f.item);
    const favoriteVenueIds = guest.favorites.filter(f => f.type === 'venue').map(f => f.item);
    const favoriteEvents = await Event.find({ _id: { $in: favoriteEventIds } });
    const favoriteProducts = await Product.find({ _id: { $in: favoriteProductIds } });
    const favoriteVenues = await Venue.find({ _id: { $in: favoriteVenueIds } });
    const favorites = [
      ...favoriteEvents.map(e => ({ type: 'event', data: e })),
      ...favoriteProducts.map(p => ({ type: 'product', data: p })),
      ...favoriteVenues.map(v => ({ type: 'venue', data: v }))
    ];
    // Can edit profile if the requesting user is the guest
    const canEditProfile = req.user && req.user.id === guest._id.toString();
    res.json({
      success: true,
      data: {
        profile: guest,
        events,
        followers,
        feed,
        favorites,
        canEditProfile
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
}; 