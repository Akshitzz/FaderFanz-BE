import mongoose from 'mongoose';

const GuestSchema = new mongoose.Schema({
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
}, { timestamps: true });

export default mongoose.model('Guest', GuestSchema);
