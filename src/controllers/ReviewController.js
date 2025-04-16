import Review from '../models/Review.js';
import Event from '../models/Event.js';
export const createReview = async (req, res) => {
  try {
    const { event, rating, comment, mediaFiles } = req.body;

    // Check if event exists
    const eventExists = await Event.findById(event);
    if (!eventExists) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Check if user already reviewed this event
    const existingReview = await Review.findOne({
      event,
      reviewer: req.user.id
    });

    if (existingReview) {
      return res.status(400).json({ message: 'You have already reviewed this event' });
    }

    const review = new Review({
      event,
      reviewer: req.user.id,
      rating,
      comment,
      mediaFiles
    });

    await review.save();

    res.status(201).json({
      message: 'Review submitted successfully',
      review
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getReviewsByEvent = async (req, res) => {
  try {
    const { eventId } = req.params;

    const reviews = await Review.find({ event: eventId })
      .populate('reviewer', 'firstName lastName username profileImage')
      .sort({ createdAt: -1 });

    res.json(reviews);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const updateReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    // Check if user is authorized to update this review
    if (review.reviewer.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to update this review' });
    }

    const { rating, comment, mediaFiles } = req.body;

    review.rating = rating || review.rating;
    review.comment = comment || review.comment;
    review.mediaFiles = mediaFiles || review.mediaFiles;

    await review.save();

    res.json({
      message: 'Review updated successfully',
      review
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const deleteReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    // Check if user is authorized to delete this review
    if (review.reviewer.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to delete this review' });
    }

    await Review.findByIdAndDelete(req.params.id);

    res.json({ message: 'Review deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const addReplyToReview = async (req, res) => {
  try {
    const { comment } = req.body;
    const review = await Review.findById(req.params.id);
    
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    // Anyone can reply to a review
    review.replies.push({
      user: req.user.id,
      comment
    });

    await review.save();

    res.json({
      message: 'Reply added successfully',
      review
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};