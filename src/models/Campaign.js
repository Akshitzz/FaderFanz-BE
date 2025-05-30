import mongoose from 'mongoose';

const CampaignSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Curator',
    required: true
  },
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true
  },
  banner: {
    url: {
      type: String,
      required: true
    },
    alt: String
  },
  goal: {
    type: Number,
    required: true
  },
  amountRaised: {
    type: Number,
    default: 0
  },
  fundingProgress: {
    type: Number,
    default: 0
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['draft', 'active', 'completed', 'failed'],
    default: 'draft'
  },
  rewards: [{
    name: String,
    description: String,
    minimumDonation: Number
  }],
  donors: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Sponsor'
    },
    amount: Number,
    date: {
      type: Date,
      default: Date.now
    }
  }],
  totalDonors: {
    type: Number,
    default: 0
  },
  updates: [{
    title: String,
    content: String,
    date: {
      type: Date,
      default: Date.now
    }
  }],
  mediaGallery: [{
    url: String,
    type: {
      type: String,
      enum: ['image', 'video'],
      default: 'image'
    },
    caption: String
  }],
  category: {
    type: String,
    enum: ['charity', 'creative', 'emergency', 'community', 'education', 'other'],
    required: true
  },
  tags: [String]
}, { timestamps: true });

// Pre-save middleware to update campaign statistics
CampaignSchema.pre('save', function(next) {
  if (this.isModified('donors') || this.isModified('amountRaised') || this.isModified('goal')) {
    // Update total donors
    this.totalDonors = this.donors.length;
    
    // Calculate funding progress percentage
    this.fundingProgress = (this.amountRaised / this.goal) * 100;
    
    // Update status if goal is reached
    if (this.amountRaised >= this.goal && this.status === 'active') {
      this.status = 'completed';
    }
  }
  next();
});

export default mongoose.model('Campaign', CampaignSchema);