import mongoose from 'mongoose';

const PhotoSchema = new mongoose.Schema({
  url: {
    type: String,
    required: true
  },
  caption: String,
  isFeatured: {
    type: Boolean,
    default: false
  },
  order: {
    type: Number,
    default: 0
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  }
});

const VenueSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VenueOwner',
    required: true
  },
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
    gpsCoordinates: {
      latitude: Number,
      longitude: Number
    }
  },
  capacity: {
    type: Number,
    required: true
  },
  amenities: [String],
  gallery: {
    photos: [PhotoSchema],
    totalPhotos: {
      type: Number,
      default: 0
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  },
  description: {
    type: String,
    required: true
  },
  availabilityCalendar: [{
    date: Date,
    isAvailable: Boolean,
    price: Number
  }],
  contactInformation: {
    email: String,
    phone: String,
    website: String
  },
  reviews: [{
    reviewer: { type: mongoose.Schema.Types.ObjectId, refPath: 'reviews.reviewerModel', required: true },
    reviewerModel: { type: String, required: true, enum: ['Guest', 'Curator', 'Sponsor', 'VenueOwner'] },
    reviewerRole: { type: String, required: true, enum: ['guest', 'curator', 'sponsor', 'venueOwner'] },
    reviewerName: { type: String, required: true },
    rating: { type: Number, min: 1, max: 5 },
    comment: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

// Pre-save middleware to update gallery metadata
VenueSchema.pre('save', function(next) {
  if (this.isModified('gallery.photos')) {
    this.gallery.totalPhotos = this.gallery.photos.length;
    this.gallery.lastUpdated = new Date();
  }
  next();
});

export default mongoose.model('Venue', VenueSchema);
