import mongoose from 'mongoose';

const TicketSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: ['Standard', 'VIP', 'Early Bird', 'Group', 'Other']
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'INR'
  },
  available: {
    type: Number,
    required: true,
    min: 0
  },
  sold: {
    type: Number,
    default: 0
  },
  description: String,
  benefits: [String],
  saleStartDate: Date,
  saleEndDate: Date
});

const ProductSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: String,
  price: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'INR'
  },
  images: [{
    url: {
      type: String,
      required: true
    },
    alt: String
  }],
  stock: {
    type: Number,
    required: true,
    min: 0
  },
  soldCount: {
    type: Number,
    default: 0
  },
  category: {
    type: String,
    enum: ['merchandise', 'food', 'beverage', 'souvenir', 'other'],
    default: 'other'
  },
  isAvailable: {
    type: Boolean,
    default: true
  }
});

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
  eventType: {
    type: String,
    required: true,
    enum: ['ticketed', 'free'],
    default: 'ticketed'
  },
  category: {
    type: String,
    required: true,
    enum: ['music', 'art', 'food', 'sports', 'technology', 'business', 'other']
  },
  banner: {
    url: {
      type: String,
      required: true
    },
    alt: String
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
  calendarLink: String,
  tickets: [TicketSchema],
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
    },
    virtualLink: String // For virtual/hybrid events
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Curator',
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
    ref: 'Sponsor'
  }],
  attendees: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Curator'
  }],
  totalTicketsSold: {
    type: Number,
    default: 0
  },
  totalRevenue: {
    type: Number,
    default: 0
  },
  likes: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Curator',
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  totalLikes: {
    type: Number,
    default: 0
  },
  interestedPeople: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Curator',
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  totalInterested: {
    type: Number,
    default: 0
  },
  products: [ProductSchema],
  totalProductRevenue: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

// Pre-save middleware to update totals
EventSchema.pre('save', function(next) {
  if (this.isModified('tickets')) {
    this.totalTicketsSold = this.tickets.reduce((total, ticket) => total + ticket.sold, 0);
    this.totalRevenue = this.tickets.reduce((total, ticket) => total + (ticket.sold * ticket.price), 0);
  }
  if (this.isModified('likes')) {
    this.totalLikes = this.likes.length;
  }
  if (this.isModified('interestedPeople')) {
    this.totalInterested = this.interestedPeople.length;
  }
  if (this.isModified('products')) {
    this.totalProductRevenue = this.products.reduce((total, product) => 
      total + (product.soldCount * product.price), 0
    );
  }
  next();
});

export default mongoose.model('Event', EventSchema);
