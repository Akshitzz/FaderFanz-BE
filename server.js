import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import errorHandler from './src/middleware/error.js';
import cors from 'cors'
import path from 'path';
import { fileURLToPath } from 'url';
// Import routes
import authRoutes from './src/routes/AuthRoutes.js';
import eventRoutes from './src/routes/EventRoutes.js';
import venueRoutes from './src/routes/VenueRoutes.js';
import blogRoutes from './src/routes/BlogRoutes.js';
import storeRoutes from './src/routes/StoreRoutes.js';
import crowdfundingRoutes from './src/routes/CrowdfundingRoutes.js';
import paymentRoutes from './src/routes/PaymentRoutes.js';
import reviewRoutes from './src/routes/ReviewRoutes.js';
import productRoutes from './src/routes/ProductRoutes.js';
import userManagementRoutes from './src/routes/UserManagementRoutes.js';
import userProfileRoutes from './src/routes/UserProfileRoutes.js';
import trendingRoutes from './src/routes/TrendingRoutes.js';
import ticketRoutes from './src/routes/TicketRoutes.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Define __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(express.json({ limit: '20mb' }));
app.use(cors()); // Enable CORS for all routes
app.use(cookieParser());
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Serve static files from /uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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
app.use('/events', eventRoutes);
app.use('/venues', venueRoutes);
app.use('/blogs', blogRoutes);
app.use('/store', storeRoutes);
app.use('/crowdfunding', crowdfundingRoutes);
app.use('/payments', paymentRoutes);
app.use('/reviews', reviewRoutes);
app.use('/products', productRoutes);
app.use('/management', userManagementRoutes);
app.use('/profiles', userProfileRoutes);
app.use('/trending', trendingRoutes);
app.use('/tickets', ticketRoutes);

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