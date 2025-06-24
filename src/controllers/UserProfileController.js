import VenueOwner from '../models/VenueOwner.js';
import Sponsor from '../models/Sponsor.js';
import Curator from '../models/Curator.js';
import Venue from '../models/Venue.js';
import Review from '../models/Review.js';
import Event from '../models/Event.js';
import Product from '../models/Product.js';
import BlogPost from '../models/BlogPost.js';
import Guest from '../models/Guest.js';
import path from 'path';

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

// Helper to extract display name for any user type
function extractDisplayName(u) {
  if (!u) return 'Unknown';

  // Prioritize full name for any user type that has it
  if (u.firstName && u.lastName) {
    return `${u.firstName} ${u.lastName}`;
  }

  // Fallback to other name fields based on what's available
  if (u.businessName) {
    return u.businessName;
  }
  if (u.venueName) {
    return u.venueName;
  }
  if (u.stageName) {
    return u.stageName;
  }

  return u.name || 'Unknown'; // Final fallback
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

    const CurrentUserModel = getModelByRole(role);
    if (!CurrentUserModel) {
      return res.status(400).json({ message: 'Invalid user role' });
    }

    const user = await CurrentUserModel.findById(userId).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // --- Data cleanup: Find and permanently remove empty posts ---
    const originalPostCount = (user.posts || []).length;
    const validPosts = (user.posts || []).filter(p => (p.text && p.text.trim() !== '') || (p.images && p.images.length > 0));

    if (validPosts.length < originalPostCount) {
      user.posts = validPosts;
      await user.save();
    }
    // --- End of data cleanup ---

    // --- Fetch associated events based on user role ---
    let events = [];
    if (role === 'curator') {
      events = await Event.find({ creator: userId }).sort({ startDate: -1 });
    } else if (role === 'venueOwner') {
      const venues = await Venue.find({ owner: userId }).select('_id');
      const venueIds = venues.map(v => v._id);
      events = await Event.find({ venue: { $in: venueIds } }).sort({ startDate: -1 });
    } else if (role === 'sponsor') {
      const sponsoredEventIds = user.eventsSponsored.map(e => e.eventId);
      events = await Event.find({ _id: { $in: sponsoredEventIds } }).sort({ startDate: -1 });
    } else if (role === 'guest') {
      const eventIds = (user.ticketBookings || []).map(booking => booking.event);
      events = await Event.find({ _id: { $in: eventIds } }).sort({ startDate: -1 });
    }
    // --- End of event fetching ---

    // Manually populate 'following' to ensure correct data is fetched
    const following = await Promise.all(
      (user.following || []).map(async (followed) => {
        const FollowedModel = getModelByRole(followed.role);
        if (!FollowedModel) return null;

        const followedUser = await FollowedModel.findById(followed.user)
          .select('firstName lastName businessName venueName contactName stageName name role profileImage image businessLogo')
          .lean(); // .lean() for faster, plain JS objects

        if (!followedUser) return null;

        return {
          _id: followedUser._id,
          name: extractDisplayName(followedUser),
          role: followed.role || followedUser.role,
          image: followedUser.profileImage || followedUser.image || followedUser.businessLogo || null,
        };
      })
    );

    // Manually populate 'followers'
    const followers = await Promise.all(
      (user.followers || []).map(async (follower) => {
        const FollowerModel = getModelByRole(follower.role);
        if (!FollowerModel) return null;

        const followerUser = await FollowerModel.findById(follower.user)
          .select('firstName lastName businessName venueName contactName stageName name role profileImage image businessLogo')
          .lean();

        if (!followerUser) return null;

        return {
          _id: followerUser._id,
          name: extractDisplayName(followerUser),
          role: follower.role || followerUser.role,
          image: followerUser.profileImage || followerUser.image || followerUser.businessLogo || null,
        };
      })
    );

    // Format the user's posts to include author details for the feed, and filter out empty ones
    const feed = (user.posts || [])
      .filter(post => (post.text && post.text.trim()) || (post.images && post.images.length > 0))
      .map(post => ({
        ...post.toObject(),
        author: {
          _id: user._id,
          name: extractDisplayName(user),
          profileImage: user.profileImage || user.image || user.businessLogo,
          role: user.role,
        }
      }));

    return res.json({
      success: true,
      data: {
        profile: user.toObject(), // Use toObject() because we didn't use .lean() on the main user
        following: following.filter(Boolean),
        followers: followers.filter(Boolean),
        feed, // Include the formatted posts in the response
        events, // <-- Add events to the response
        followingCount: (user.following || []).length,
        followersCount: (user.followers || []).length,
      }
    });
  } catch (error) {
    console.error(`Error in getMe for user ${req.user.id}:`, error);
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

// Helper to get Mongoose model by role string
const getModelByRole = (role) => {
  switch (role) {
    case 'guest': return Guest;
    case 'curator': return Curator;
    case 'sponsor': return Sponsor;
    case 'venueOwner': return VenueOwner;
    default: return null;
  }
};

// Follow a user
export const followUser = async (req, res) => {
  try {
    const { id: userToFollowId, role: userToFollowRole } = req.params;
    const { id: currentUserId, role: currentUserRole } = req.user;

    if (userToFollowId === currentUserId) {
      return res.status(400).json({ message: 'You cannot follow yourself.' });
    }

    const UserToFollowModel = getModelByRole(userToFollowRole);
    const CurrentUserModel = getModelByRole(currentUserRole);

    if (!UserToFollowModel || !CurrentUserModel) {
      return res.status(400).json({ message: 'Invalid role specified.' });
    }

    // Check if already following to prevent duplicate operations
    const currentUser = await CurrentUserModel.findById(currentUserId).select('following');
    if (currentUser.following.some(f => f.user.toString() === userToFollowId)) {
      return res.status(400).json({ message: 'You are already following this user.' });
    }

    // Add current user to the target's followers list
    await UserToFollowModel.findByIdAndUpdate(userToFollowId, {
      $push: { followers: { user: currentUserId, role: currentUserRole } }
    });

    // Add target user to the current user's following list
    const updatedUser = await CurrentUserModel.findByIdAndUpdate(currentUserId,
      { $push: { following: { user: userToFollowId, role: userToFollowRole } } },
      { new: true }
    ).select('following followingCount');

    res.json({ message: 'Successfully followed user.', following: updatedUser.following, followingCount: updatedUser.followingCount });

  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Unfollow a user
export const unfollowUser = async (req, res) => {
  try {
    const { id: userToUnfollowId, role: userToUnfollowRole } = req.params;
    const { id: currentUserId, role: currentUserRole } = req.user;

    const UserToUnfollowModel = getModelByRole(userToUnfollowRole);
    const CurrentUserModel = getModelByRole(currentUserRole);

    if (!UserToUnfollowModel || !CurrentUserModel) {
      return res.status(400).json({ message: 'Invalid role specified.' });
    }

    // Remove current user from the target's followers list
    await UserToUnfollowModel.findByIdAndUpdate(userToUnfollowId, {
      $pull: { followers: { user: currentUserId } }
    });

    // Remove target user from the current user's following list
    const updatedUser = await CurrentUserModel.findByIdAndUpdate(currentUserId,
      { $pull: { following: { user: userToUnfollowId } } },
      { new: true }
    ).select('following followingCount');

    res.json({ message: 'Successfully unfollowed user.', following: updatedUser.following, followingCount: updatedUser.followingCount });

  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get a user's followers
export const getFollowers = async (req, res) => {
  try {
    const { id, role } = req.params;
    const Model = getModelByRole(role);
    if (!Model) return res.status(400).json({ message: 'Invalid role specified.' });

    const user = await Model.findById(id).select('followers');
    if (!user) return res.status(404).json({ message: 'User not found.' });

    const followersDetails = await Promise.all(
      user.followers.map(async (follower) => {
        const FollowerModel = getModelByRole(follower.role);
        const followerUser = await FollowerModel.findById(follower.user).select('firstName lastName businessName venueName profileImage image');
        if (!followerUser) return null;

        const name = followerUser.businessName || followerUser.venueName || `${followerUser.firstName} ${followerUser.lastName}`;
        const profileImage = followerUser.profileImage || followerUser.image;

        return {
          id: follower.user,
          role: follower.role,
          name,
          profileImage
        };
      })
    );

    res.json(followersDetails.filter(Boolean));
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get a user's following list
export const getFollowing = async (req, res) => {
  try {
    const { id, role } = req.params;
    const Model = getModelByRole(role);
    if (!Model) return res.status(400).json({ message: 'Invalid role specified.' });

    const user = await Model.findById(id).select('following');
    if (!user) return res.status(404).json({ message: 'User not found.' });

    const followingDetails = await Promise.all(
      user.following.map(async (followed) => {
        const FollowedModel = getModelByRole(followed.role);
        const followedUser = await FollowedModel.findById(followed.user)
          .select('firstName lastName businessName venueName contactName stageName name profileImage image businessLogo role');
        if (!followedUser) return null;
        return {
          id: followed.user,
          role: followed.role,
          name: extractDisplayName(followedUser),
          profileImage: followedUser.profileImage || followedUser.image || followedUser.businessLogo || null,
        };
      })
    );

    res.json(followingDetails.filter(Boolean));
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const createPost = async (req, res) => {
  try {
    const { text, visibility, location } = req.body;
    const { id: userId, role } = req.user;

    const images = req.files ? req.files.map(file => path.join('posts', file.filename).replace(/\\/g, '/')) : [];

    if ((!text || !text.trim()) && images.length === 0) {
      return res.status(400).json({ success: false, message: 'Post content cannot be empty.' });
    }

    const UserModel = getModelByRole(role);
    if (!UserModel) {
      return res.status(400).json({ success: false, message: 'Invalid user role' });
    }

    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const newPost = {
      text,
      images,
      visibility,
      location,
      createdAt: new Date(),
    };

    user.posts.unshift(newPost);
    await user.save();

    const createdPost = user.posts[0];

    // The frontend needs the author info along with the post to render it immediately
    const responseData = {
      ...createdPost.toObject(),
      author: {
        _id: user._id,
        name: extractDisplayName(user),
        profileImage: user.profileImage || user.image || user.businessLogo,
        role: user.role,
      }
    };

    res.status(201).json({
      success: true,
      message: 'Post created successfully',
      data: responseData,
    });
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

export const likePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const user = req.user;

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Find the user who owns the post
    const postOwner = await findUserWithPost(postId);

    if (!postOwner) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    const post = postOwner.posts.id(postId);

    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    // Check if the user has already liked the post
    const likeIndex = post.likes.findIndex(like => like.user.toString() === user._id.toString());

    if (likeIndex > -1) {
      // Unlike the post
      post.likes.splice(likeIndex, 1);
    } else {
      // Like the post
      post.likes.push({ user: user._id, role: user.role });
    }

    await postOwner.save();

    res.status(200).json({
      success: true,
      message: 'Post like status updated',
      data: post,
    });
  } catch (error) {
    console.error('Error liking post:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

export const commentOnPost = async (req, res) => {
  try {
    const { postId } = req.params;
    const { text } = req.body;
    const user = req.user;

    if (!user || !text) {
      return res.status(400).json({ success: false, message: 'User and text are required' });
    }

    const postOwner = await findUserWithPost(postId);

    if (!postOwner) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    const post = postOwner.posts.id(postId);

    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    const newComment = {
      user: user._id,
      role: user.role,
      name: user.firstName ? `${user.firstName} ${user.lastName}` : user.businessName || user.venueName,
      text,
    };

    post.comments.push(newComment);

    await postOwner.save();

    res.status(201).json({
      success: true,
      message: 'Comment added successfully',
      data: post.comments,
    });
  } catch (error) {
    console.error('Error commenting on post:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};// Helper function to find a user who owns a specific post
async function findUserWithPost(postId) {
  const users = await Promise.all([
    Guest.findOne({ 'posts._id': postId }),
    Curator.findOne({ 'posts._id': postId }),
    Sponsor.findOne({ 'posts._id': postId }),
    VenueOwner.findOne({ 'posts._id': postId }),
  ]);

  return users.find(user => user !== null);
}

