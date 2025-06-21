import mongoose from 'mongoose';

const curatorSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true}
        ,
        password: {
            type:String,
            required:true,
        },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  stageName: { type: String },
  bio: { type: String, required: true },
  images: [{ type: String }], // Array of image URLs
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
  // Posts field
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
  // Rating and Reviews
  ratings: [{
    userId: { type: mongoose.Schema.Types.ObjectId },
    rating: { 
      type: Number, 
      required: true,
      min: 1,
      max: 5
    },
    review: { type: String },
    createdAt: { type: Date, default: Date.now }
  }],
  // Add reviews field
  reviews: [{
    reviewer: { type: mongoose.Schema.Types.ObjectId, refPath: 'reviews.reviewerModel', required: true },
    reviewerModel: { type: String, required: true, enum: ['Guest', 'Curator', 'Sponsor', 'VenueOwner'] },
    reviewerRole: { type: String, required: true, enum: ['guest', 'curator', 'sponsor', 'venueOwner'] },
    reviewerName: { type: String, required: true },
    rating: { type: Number, min: 1, max: 5 },
    comment: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
  }],
  // Favorites field
  favorites: [{
    type: { type: String, required: true, enum: ['event', 'product', 'venue'] },
    item: { type: mongoose.Schema.Types.ObjectId, required: true, refPath: 'favorites.type' }
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
  averageRating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  totalRatings: {
    type: Number,
    default: 0
  },
  role: {
    type: String,
    default: 'curator',
    enum: ['curator']
  }
}, {
  timestamps: true,
});

curatorSchema.pre('save', function(next) {
  if (this.isModified('followers')) {
    this.followersCount = this.followers.length;
  }
  if (this.isModified('following')) {
    this.followingCount = this.following.length;
  }
  next();
});

const Curator = mongoose.model('Curator', curatorSchema);

export default Curator;
