import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const UserSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['sponsor', 'venueOwner', 'curator', 'guest', 'admin'],
    required: true
  },
  username: {
    type: String,
    unique: true,
    trim: true
  },
  profileImage: String,
  bio: String,
  contactNumber: String,
  socialMediaHandles: {
    instagram: String,
    twitter: String,
    facebook: String,
    linkedin: String
  },
  // Sponsor-specific fields
  businessName: String,
  gstInformation: String,
  businessRole: String,
  eventCategories: [String],
  sponsorshipExpectations: [String],
  
  // Venue-specific fields
  venueName: String,
  venueLocation: {
    address: String,
    city: String,
    state: String,
    country: String,
    postalCode: String,
    gpsCoordinates: {
      latitude: Number,
      longitude: Number
    }
  },
  menuDetails: String,
  
  // Curator/Artist-specific fields
  stageName: String,
  mediaLinks: [String],
  
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Pre-save hook to hash password
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to validate password
UserSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model('User', UserSchema);