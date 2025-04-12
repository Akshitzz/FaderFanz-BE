import mongoose from 'mongoose';

const EventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true,
    enum: ['music', 'art', 'food', 'sports', 'technology', 'business', 'other']
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  venue: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Venue'
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'cancelled', 'completed'],
    default: 'draft'
  },
  ticketPrice: {
    type: Number,
    default: 0
  },
  ticketsAvailable: {
    type: Number,
    default: 0
  },
  ticketsSold: {
    type: Number,
    default: 0
  },
  mediaFiles: [{
    type: String
  }],
  isCrowdfunded: {
    type: Boolean,
    default: false
  },
  sponsors: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  attendees: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }]
}, { timestamps: true });
export default mongoose.model('Event', EventSchema);
