import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  image: { type: String } // store image URL/path
});

const sponsorSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
  },
  businessLogo: { type: String }, // store logo file URL/path
  businessBanner: { type: String }, // store banner file URL/path

  businessName: { type: String, required: true },
  taxIdentificationNumber: { type: String, required: true },
  description: { type: String, required: true },

  // Location fields
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

  // Social Media Handles
  socialMedia: {
    facebook: { type: String, required: true },
    instagram: { type: String, required: true },
    twitter: { type: String, required: true }
  },

  contactName: { type: String, required: true },
  role: {
    type: String,
    enum: ['owner', 'manager', 'representative'],
    required: true
  },

  preferredEvents: [{
    type: String,
    enum: ['Music Events', 'Sport Events', 'Cultural Events', 'Technology Events']
  }],

  sponsorshipExpectations: [{
    type: String,
    enum: ['Brand Exposure', 'Sales', 'Increase', 'Empowerment']
  }],

  products: [productSchema],

  // Reviews field
  reviews: [{
    reviewer: { type: mongoose.Schema.Types.ObjectId, refPath: 'reviews.reviewerModel', required: true },
    reviewerModel: { type: String, required: true, enum: ['Guest', 'Curator', 'Sponsor', 'VenueOwner'] },
    reviewerRole: { type: String, required: true, enum: ['guest', 'curator', 'sponsor', 'venueOwner'] },
    reviewerName: { type: String, required: true },
    rating: { type: Number, min: 1, max: 5 },
    comment: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
  }],

  // Posts field
  posts: [{
    content: { type: String, required: true },
    media: [{ type: String }], // Array of media URLs
    likes: { type: Number, default: 0 },
    comments: [{
      userId: { type: mongoose.Schema.Types.ObjectId },
      content: { type: String },
      createdAt: { type: Date, default: Date.now }
    }],
    createdAt: { type: Date, default: Date.now }
  }],
  
  // Events sponsored field
  eventsSponsored: [{
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event' },
    sponsorshipType: { type: String },
    amount: { type: Number },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'completed'],
      default: 'pending'
    },
    sponsoredAt: { type: Date, default: Date.now }
  }],
  
  // Add ticket bookings field
  ticketBookings: [{
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    tickets: [{
      ticketId: mongoose.Schema.Types.ObjectId,
      name: String,
      quantity: Number,
      unitPrice: Number,
      totalPrice: Number
    }],
    totalAmount: Number,
    bookingDate: { type: Date, default: Date.now },
    paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment' },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'cancelled'],
      default: 'pending'
    }
  }],

  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
 
  eventsSponsoredCount: {
    type: Number,
    default: 0
  },
  followers: [{
    user: { type: mongoose.Schema.Types.ObjectId, required: true },
    role: { type: String, required: true, enum: ['guest', 'curator', 'sponsor', 'venueOwner'] }
  }],
  following: [{
    user: { type: mongoose.Schema.Types.ObjectId, required: true },
    role: { type: String, required: true, enum: ['guest', 'curator', 'sponsor', 'venueOwner'] }
  }],
  followersCount: {
    type: Number,
    default: 0
  },
  followingCount: {
    type: Number,
    default: 0
  },
 
  createdAt: {
    type: Date,
    default: Date.now
  },

  // Favorites field
  favorites: [{
    type: { type: String, required: true, enum: ['event', 'product', 'venue'] },
    item: { type: mongoose.Schema.Types.ObjectId, required: true, refPath: 'favorites.type' }
  }]
}, { timestamps: true });

// Pre-save middleware to update counts
sponsorSchema.pre('save', function(next) {
  if (this.isModified('eventsSponsored')) {
    this.eventsSponsoredCount = this.eventsSponsored.length;
  }
  if (this.isModified('followers')) {
    this.followersCount = this.followers.length;
  }
  if (this.isModified('following')) {
    this.followingCount = this.following.length;
  }
  if (this.isModified('reviews')) {
    const totalRatings = this.reviews.length;
    const sumRatings = this.reviews.reduce((sum, review) => sum + review.rating, 0);
    this.rating = totalRatings > 0 ? sumRatings / totalRatings : 0;
  }
  next();
});

export default mongoose.model('Sponsor', sponsorSchema);
