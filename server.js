import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import errorHandler from './src/middleware/error.js';

// Import routes
import authRoutes from './src/routes/AuthRoutes.js';
import userRoutes from './src/routes/UserRoutes.js';
import eventRoutes from './src/routes/EventRoutes.js';
import venueRoutes from './src/routes/VenueRoutes.js';
import blogRoutes from './src/routes/BLogRoutes.js';
import storeRoutes from './src/routes/StoreRoutes.js';
import crowdfundingRoutes from './src/routes/CrowdfundingRoutes.js';
import paymentRoutes from './src/routes/PaymentRoutes.js';
import reviewRoutes from './src/routes/ReviewRoutes.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(cookieParser());

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Routes
app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/events', eventRoutes);
app.use('/venues', venueRoutes);
app.use('/blogs', blogRoutes);
app.use('/store', storeRoutes);
app.use('/crowdfunding', crowdfundingRoutes);
app.use('/payments', paymentRoutes);
app.use('/reviews', reviewRoutes);

// Global error handler
app.use(errorHandler);

// Default route
app.get('/', (req, res) => {
  res.send('Welcome to the FaderFanz API!');
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});