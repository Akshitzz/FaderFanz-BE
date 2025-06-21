// models/VenueOwner.js
import mongoose from 'mongoose';

const menuProductSchema = new mongoose.Schema({
  name: {type: String, required: true},
  price: {type: Number, required: true},
  image: {type: String, required: true}, // image file path
});

const VenueOwnerSchema = new mongoose.Schema({
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
  role: {
    type: String,
    default: 'venueOwner',
    enum: ['venueOwner']
  },
  venueName: {
    type: String,
    required: true
  },
  address: {
    type: String,
    required: true
  },
  gstInformation: {
    type: String,
    required: true
  },
  venueImage: [String], // uploaded image path
  contactPhone: {
    type: String,
    required: true
  },
  website: String,
  hasMenu: {
    type: Boolean,
    default: false
  },
  menuProducts: [menuProductSchema],
  // New fields
  about: {
    type: String,
    required: true,
    trim: true
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  totalRatings: {
    type: Number,
    default: 0
  },
  reviews: [{
    reviewer: { type: mongoose.Schema.Types.ObjectId, refPath: 'reviews.reviewerModel', required: true },
    reviewerModel: { type: String, required: true, enum: ['Guest', 'Curator', 'Sponsor', 'VenueOwner'] },
    reviewerRole: { type: String, required: true, enum: ['guest', 'curator', 'sponsor', 'venueOwner'] },
    reviewerName: { type: String, required: true },
    rating: { type: Number, min: 1, max: 5 },
    comment: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
  }],
  followers: [{
    user: { type: mongoose.Schema.Types.ObjectId, required: true },
    role: { type: String, required: true, enum: ['guest', 'curator', 'sponsor', 'venueOwner'] }
  }],
  following: [{
    user: { type: mongoose.Schema.Types.ObjectId, required: true },
    role: { type: String, required: true, enum: ['guest', 'curator', 'sponsor', 'venueOwner'] }
  }],
  followersCount: { type: Number, default: 0 },
  followingCount: { type: Number, default: 0 },
  totalFollowers: { // This seems redundant now, but leaving for compatibility if needed elsewhere
    type: Number,
    default: 0
  },
  socialMedia: {
    facebook: String,
    instagram: String,
    twitter: String
  },
  coverImage: String,
  profileImage: String,

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

  // Favorites field
  favorites: [{
    type: { type: String, required: true, enum: ['event', 'product', 'venue'] },
    item: { type: mongoose.Schema.Types.ObjectId, required: true, refPath: 'favorites.type' }
  }],

  posts: [{
    text: {
      type: String,
      required: false,
    },
    images: {
      type: [String],
      validate: [val => val.length <= 5, 'Images array can have at most 5 items'],
      default: [],
    },
    likes: [{
      user: { type: mongoose.Schema.Types.ObjectId, required: true },
      role: { type: String, required: true, enum: ['guest', 'curator', 'sponsor', 'venueOwner'] }
    }],
    comments: [{
      user: { type: mongoose.Schema.Types.ObjectId, required: true },
      role: { type: String, required: true, enum: ['guest', 'curator', 'sponsor', 'venueOwner'] },
      name: { type: String, required: true },
      text: { type: String, required: true },
      createdAt: { type: Date, default: Date.now }
    }],
    createdAt: {
      type: Date,
      default: Date.now,
    },
  }],

}, { timestamps: true });

// Pre-save middleware to update totals
VenueOwnerSchema.pre('save', function(next) {
  if (this.isModified('reviews')) {
    const totalRatings = this.reviews.length;
    const sumRatings = this.reviews.reduce((sum, review) => sum + review.rating, 0);
    this.rating = totalRatings > 0 ? sumRatings / totalRatings : 0;
    this.totalRatings = totalRatings;
  }
  if (this.isModified('followers')) {
    this.followersCount = this.followers.length;
    this.totalFollowers = this.followers.length; // Keep this in sync for now
  }
  if (this.isModified('following')) {
    this.followingCount = this.following.length;
  }
  next();
});

export default mongoose.model('VenueOwner', VenueOwnerSchema);
