// models/VenueOwner.js
import mongoose from 'mongoose';

const menuProductSchema = new mongoose.Schema({
  name: {type: String, required: true},
  price: {type: Number, required: true},
  image: {type :String , required :true}, // image file path
});

const VenueOwnerSchema = new mongoose.Schema({
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
  venueImage: String, // uploaded image path

  contactPhone: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  website: String,

  hasMenu: {
    type: Boolean,
    default: false
  },
  menuProducts: [menuProductSchema]
}, { timestamps: true });

export default mongoose.model('VenueOwner', VenueOwnerSchema);
