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
  startTime: {
    type: String,
    required: true
  },
  endTime: {
    type: String,
    required: true
  },
  calendarLink: {
    type: String
  },
  tickets: [{
    type: {
      type: String,
      required: true,
      enum: ['Standard', 'VIP', 'Early Bird', 'Group', 'Other']
    },
    price: {
      type: Number,
      required: true
    },
    currency: {
      type: String,
      default: 'INR'
    },
    available: {
      type: Number,
      required: true
    },
    sold: {
      type: Number,
      default: 0
    },
    description: String
  }],
  location: {
    address: {
      type: String,
      required: true
    },
    city: {
      type: String,
      required: true
    },
    state: {
      type: String,
      required: true
    },
    country: {
      type: String,
      required: true
    },
    postalCode: String,
    landmark: String,
    coordinates: {
      latitude: Number,
      longitude: Number
    }
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
