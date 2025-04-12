import mongoose from 'mongoose';

const VenueSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
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
  images: [String],
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
  }
}, { timestamps: true });
export default mongoose.model('Venue', VenueSchema);
