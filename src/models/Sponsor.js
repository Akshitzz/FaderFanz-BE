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
    lowercase: true}
    ,
    password: {
        type:String,
        required:true,
    },
  businessLogo: { type: String }, // store logo file URL/path
  businessBanner: { type: String }, // store banner file URL/path

  businessName: { type: String, required: true },
  taxIdentificationNumber: { type: String, required: true },
  description: { type: String ,required: true},

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
    type: mongoose.Schema.Types.ObjectId
  }],
  followersCount: {
    type: Number,
    default: 0
  },
 

  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('Sponsor', sponsorSchema);
