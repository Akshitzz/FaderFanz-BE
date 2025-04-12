import crypto from 'crypto';
import jwt from 'jsonwebtoken';

/**
 * Generate JWT token for a user
 * @param {Object} user - User object with ID
 * @returns {String} JWT token
 */
export const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '30d' }
  );
};

/**
 * Set JWT token in HTTP-only cookie
 * @param {Object} res - Express response object
 * @param {String} token - JWT token
 */
export const sendTokenCookie = (res, token) => {
  const options = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  };

  res.cookie('token', token, options);
};

/**
 * Generate random token (for password reset, email verification, etc.)
 * @returns {String} Random token
 */
export const generateRandomToken = () => {
  return crypto.randomBytes(20).toString('hex');
};

/**
 * Paginate results for any query
 * @param {Object} model - Mongoose model
 * @param {Object} query - Mongoose query object
 * @param {Object} options - Pagination options (page, limit, sort, populate)
 * @returns {Object} Paginated results with metadata
 */
exports.paginate = async (model, query = {}, options = {}) => {
  const page = parseInt(options.page, 10) || 1;
  const limit = parseInt(options.limit, 10) || 10;
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const sort = options.sort || { createdAt: -1 };
  const populate = options.populate || '';

  const results = {};

  // Add next page if exists
  if (endIndex < await model.countDocuments(query)) {
    results.next = {
      page: page + 1,
      limit
    };
  }

  // Add previous page if exists
  if (startIndex > 0) {
    results.prev = {
      page: page - 1,
      limit
    };
  }

  // Execute query with pagination
  results.data = await model
    .find(query)
    .sort(sort)
    .skip(startIndex)
    .limit(limit)
    .populate(populate);

  // Add total count and pages
  results.total = await model.countDocuments(query);
  results.pages = Math.ceil(results.total / limit);
  results.currentPage = page;

  return results;
};

/**
 * Format date to human-readable string
 * @param {Date} date - Date object or string
 * @param {Object} options - Format options
 * @returns {String} Formatted date string
 */
exports.formatDate = (date, options = {}) => {
  const defaultOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  };

  const dateObj = new Date(date);
  const mergedOptions = { ...defaultOptions, ...options };

  return dateObj.toLocaleString('en-US', mergedOptions);
};

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {Number} lat1 - Latitude of first point
 * @param {Number} lon1 - Longitude of first point
 * @param {Number} lat2 - Latitude of second point
 * @param {Number} lon2 - Longitude of second point
 * @returns {Number} Distance in kilometers
 */
exports.calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  const d = R * c; // Distance in km
  return d;
};

/**
 * Generate a slug from a string
 * @param {String} text - Text to convert to slug
 * @returns {String} URL-friendly slug
 */
export const generateSlug = (text) => {
  return text
    .toString()
    .toLowerCase()
    .replace(/\s+/g, '-')        // Replace spaces with -
    .replace(/[^\w\-]+/g, '')    // Remove all non-word chars
    .replace(/\-\-+/g, '-')      // Replace multiple - with single -
    .replace(/^-+/, '')          // Trim - from start of text
    .replace(/-+$/, '');         // Trim - from end of text
};

/**
 * Create a unique filename with original extension
 * @param {String} originalname - Original filename
 * @returns {String} Unique filename
 */
export const createUniqueFilename = (originalname) => {
  const timestamp = Date.now();
  const extension = originalname.split('.').pop();
  return `${timestamp}-${Math.floor(Math.random() * 1000)}.${extension}`;
};

/**
 * Sanitize HTML content to prevent XSS attacks
 * @param {String} html - HTML content to sanitize
 * @returns {String} Sanitized HTML
 */
export const sanitizeHtml = (html) => {
  // This is a simple implementation - in production, use a library like DOMPurify
  return html
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

/**
 * Format currency amount
 * @param {Number} amount - Amount to format
 * @param {String} currency - Currency code (default: USD)
 * @returns {String} Formatted currency string
 */
export const formatCurrency = (amount, currency = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency
  }).format(amount);
};

/**
 * Truncate text to specific length with ellipsis
 * @param {String} text - Text to truncate
 * @param {Number} maxLength - Maximum length before truncation
 * @returns {String} Truncated text
 */
export const truncateText = (text, maxLength = 100) => {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};