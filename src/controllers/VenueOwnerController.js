import VenueOwner from '../models/VenueOwner.js';

// Toggle follow venue owner
export const toggleFollowVenueOwner = async (req, res) => {
  try {
    const venueOwner = await VenueOwner.findById(req.params.id);
    
    if (!venueOwner) {
      return res.status(404).json({ message: 'Venue owner not found' });
    }

    // Check if user is already following
    const followIndex = venueOwner.followers.findIndex(follow => 
      follow.user.toString() === req.user.id
    );

    if (followIndex !== -1) {
      // User is already following, so unfollow
      venueOwner.followers.splice(followIndex, 1);
    } else {
      // Add new follower
      venueOwner.followers.push({ user: req.user.id });
    }

    await venueOwner.save();

    res.json({
      success: true,
      message: followIndex !== -1 ? 'Unfollowed venue owner' : 'Following venue owner',
      totalFollowers: venueOwner.totalFollowers
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Add review for venue owner
export const addVenueOwnerReview = async (req, res) => {
  try {
    const venueOwner = await VenueOwner.findById(req.params.id);
    
    if (!venueOwner) {
      return res.status(404).json({ message: 'Venue owner not found' });
    }

    const { rating, comment } = req.body;

    // Check if user has already reviewed
    const existingReview = venueOwner.reviews.find(review => 
      review.user.toString() === req.user.id
    );

    if (existingReview) {
      return res.status(400).json({ message: 'You have already reviewed this venue owner' });
    }

    venueOwner.reviews.push({
      user: req.user.id,
      rating,
      comment
    });

    await venueOwner.save();

    res.json({
      success: true,
      message: 'Review added successfully',
      rating: venueOwner.rating,
      totalRatings: venueOwner.totalRatings
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get venue owner reviews
export const getVenueOwnerReviews = async (req, res) => {
  try {
    const venueOwner = await VenueOwner.findById(req.params.id)
      .populate('reviews.user', 'firstName lastName username profileImage');
    
    if (!venueOwner) {
      return res.status(404).json({ message: 'Venue owner not found' });
    }

    const reviews = venueOwner.reviews.map(review => ({
      id: review._id,
      user: {
        id: review.user._id,
        name: `${review.user.firstName} ${review.user.lastName}`,
        username: review.user.username,
        profileImage: review.user.profileImage
      },
      rating: review.rating,
      comment: review.comment,
      createdAt: review.createdAt
    }));

    res.json({
      success: true,
      count: reviews.length,
      averageRating: venueOwner.rating,
      totalRatings: venueOwner.totalRatings,
      data: reviews
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get venue owner followers
export const getVenueOwnerFollowers = async (req, res) => {
  try {
    const venueOwner = await VenueOwner.findById(req.params.id)
      .populate('followers.user', 'firstName lastName username profileImage');
    
    if (!venueOwner) {
      return res.status(404).json({ message: 'Venue owner not found' });
    }

    const followers = venueOwner.followers.map(follow => ({
      id: follow.user._id,
      name: `${follow.user.firstName} ${follow.user.lastName}`,
      username: follow.user.username,
      profileImage: follow.user.profileImage,
      followingSince: follow.createdAt
    }));

    res.json({
      success: true,
      count: followers.length,
      data: followers
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
}; 