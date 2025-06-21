import mongoose from 'mongoose';

const GuestSchema = new mongoose.Schema({
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
  firstName: {
    type: String,
    required: true,
  },
  lastName: {
    type: String,
    required: true,
  },
  stageName: {
    type: String,
    required: false,
  },
  bio: {
    type: String,
    required: false,
  },
  image: {
    type: String, // URL/path to image after upload
    required: false,
  },
  video: {
    type: String, // URL/path to video after upload
    required: false,
  },

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

  // Follower/Following fields
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

GuestSchema.pre('save', function(next) {
  if (this.isModified('followers')) {
    this.followersCount = this.followers.length;
  }
  if (this.isModified('following')) {
    this.followingCount = this.following.length;
  }
  next();
});

export default mongoose.model('Guest', GuestSchema);
