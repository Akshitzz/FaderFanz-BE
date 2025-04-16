import mongoose from 'mongoose';

const curatorSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  stageName: { type: String },
  bio: { type: String, required: true },
  images: [{ type: String }], // Array of image URLs
}, {
  timestamps: true,
});

const Curator = mongoose.model('Curator', curatorSchema);

export default Curator;
