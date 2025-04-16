import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

// Define storage configuration for different types of uploads
const createStorage = (destination) => {
  return multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadPath = path.join(__dirname, '../../uploads', destination);

      // Create directory if it doesn't exist
      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
      }

      cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
      // Create unique filename with original extension
      const uniqueFilename = `${uuidv4()}${path.extname(file.originalname)}`;
      cb(null, uniqueFilename);
    },
  });
};

// File size limits in bytes
const FILE_SIZE_LIMITS = {
  PROFILE: 2 * 1024 * 1024, // 2MB
  EVENT: 5 * 1024 * 1024, // 5MB
  VENUE: 5 * 1024 * 1024, // 5MB
  BLOG: 3 * 1024 * 1024, // 3MB
  PRODUCT: 3 * 1024 * 1024, // 3MB
};

// File type validation
const fileFilter = (req, file, cb) => {
  // Allow images, PDFs, and specific document types
  const allowedMimeTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Unsupported file format. Please upload a valid image, PDF, or document file.'), false);
  }
};

// Configure multer for specific types of uploads
export const profileUpload = multer({
  storage: createStorage('profiles'),
  limits: { fileSize: FILE_SIZE_LIMITS.PROFILE },
  fileFilter,
}).single('profileImage');

export const eventUpload = multer({
  storage: createStorage('events'),
  limits: { fileSize: FILE_SIZE_LIMITS.EVENT },
  fileFilter,
}).array('eventImages', 5); // Allow up to 5 images for events

export const venueUpload = multer({
  storage: createStorage('venues'),
  limits: { fileSize: FILE_SIZE_LIMITS.VENUE },
  fileFilter,
}).array('venueImages', 10); // Allow up to 10 images for venues

export const blogUpload = multer({
  storage: createStorage('blog'),
  limits: { fileSize: FILE_SIZE_LIMITS.BLOG },
  fileFilter,
}).single('featuredImage');

export const productUpload = multer({
  storage: createStorage('products'),
  limits: { fileSize: FILE_SIZE_LIMITS.PRODUCT },
  fileFilter,
}).single('productImage');

// Middleware for handling multiple types of uploads in specific routes
export const mediaUpload = multer({
  storage: createStorage('media'),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter,
}).array('media', 10); // Allow up to 10 media files

// Error handling middleware for upload errors
export const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    // Handle Multer-specific errors
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Please upload a smaller file.',
      });
    }
    return res.status(400).json({
      success: false,
      message: `Upload error: ${err.message}`,
    });
  } else if (err) {
    // Handle other errors
    return res.status(400).json({
      success: false,
      message: err.message || 'Error uploading file',
    });
  }
  next();
};