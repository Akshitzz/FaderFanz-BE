import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  image: { type: String } // store image URL/path
});

const sponsorSchema = new mongoose.Schema({
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

  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('Sponsor', sponsorSchema);
