import jwt from 'jsonwebtoken';
import Guest from '../models/Guest.js';
import Sponsor from '../models/Sponsor.js';
import Curator from '../models/Curator.js';
import VenueOwner from '../models/VenueOwner.js';

/**
 * Verify JWT token and add user to request object
 */
export const protect = async (req, res, next) => {
  try {
    let token;

    // Check if token exists in headers
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    // If no token found, return error
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route',
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Debugging: Log the decoded payload
    console.log('Decoded Token:', decoded);

    // Determine the model to query based on the role
    let Model;
    switch (decoded.role) {
      case 'guest':
        Model = Guest;
        break;
      case 'sponsor':
        Model = Sponsor;
        break;
      case 'curator':
        Model = Curator;
        break;
      case 'venueOwner':
        Model = VenueOwner;
        break;
      default:
        return res.status(400).json({ message: 'Invalid role in token' });
    }

    // Find user by ID from decoded token
    const user = await Model.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found with this ID',
      });
    }

    // Debugging: Log the found user
    console.log('User Found:', user);

    // Add user to request object
    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error in authentication',
    });
  }
};

/**
 * Grant access to specific roles
 */
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not found in request'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role ${req.user.role} is not authorized to access this route`
      });
    }
    next();
  };
};

/**
 * Check if user is owner of resource or admin
 * For routes where a user should only access their own resources
 * @param {Function} getResourceUserId - Function to extract owner ID from request
 */
export const checkOwnership = (getResourceUserId) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'User not found in request'
        });
      }

      // Admin bypass - admins can access any resource
      if (req.user.role === 'admin') {
        return next();
      }

      // Get the resource owner's ID using the provided function
      const resourceUserId = await getResourceUserId(req);
      
      // If no resource owner ID found, move to next middleware
      // This allows for creation routes where there is no owner yet
      if (!resourceUserId) {
        return next();
      }

      // Check if current user is the owner
      if (resourceUserId.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to access this resource'
        });
      }

      next();
    } catch (error) {
      console.error('Ownership check error:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error checking resource ownership'
      });
    }
  };
};