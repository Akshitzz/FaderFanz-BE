import mongoose from "mongoose";

const ProductSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: false
  },
  price: {
    type: Number,
    required: true
  },
  stock: {
    type: Number,
    required: true,
    default: 0
  },
  category: {
    type: String,
    required: true
  },
  images: [String],
  relatedEvent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event'
  },
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Sponsor'
  }
}, { timestamps: true });

export default mongoose.model('Product', ProductSchema);