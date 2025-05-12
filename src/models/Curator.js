import mongoose from 'mongoose';

const curatorSchema = new mongoose.Schema({
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
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  stageName: { type: String },
  bio: { type: String, required: true },
  images: [{ type: String }], // Array of image URLs
  followers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  role: {
    type: String,
    default: 'curator',
    enum: ['curator']
  }
}, {
  timestamps: true,
});

const Curator = mongoose.model('Curator', curatorSchema);

export default Curator;
