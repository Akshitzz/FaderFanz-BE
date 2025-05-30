import multer from 'multer';
import path from 'path';
import fs from 'fs';

import { fileURLToPath } from 'url';

// Define __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
      const uniqueFilename = `${Date.now()}-${file.originalname}`;
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

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }
});

export const sponsorUpload = upload.fields([
  { name: 'businessLogo', maxCount: 1 },
  { name: 'businessBanner', maxCount: 1 },
  { name: 'productImages', maxCount: 10 } // Allow up to 10 product images
]);

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
}).fields([
  { name: 'venueImages', maxCount: 10 }, // Multiple venue images
  { name: 'menuImages', maxCount: 1 },  // Single menu image
]);
export const mediaUpload2 = multer({
  storage: createStorage('media'),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB file size limit
  fileFilter,
}).fields([
  { name: 'image', maxCount: 1 }, // Single image file
  { name: 'video', maxCount: 1 }, // Single video file
]);
export const blogUpload = multer({
  storage: createStorage('blog'),
  limits: { fileSize: FILE_SIZE_LIMITS.BLOG },
  fileFilter,
}).fields([
  { name: 'featuredImage', maxCount: 1 },
  { name: 'contentImages', maxCount: 10 } // Allow up to 10 content images
]);

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

// Gallery photo upload configuration
export const galleryUpload = multer({
  storage: createStorage('venues/gallery'),
  limits: { fileSize: FILE_SIZE_LIMITS.VENUE },
  fileFilter: (req, file, cb) => {
    // Only allow image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed for gallery'), false);
    }
  }
}).array('photos', 20); // Allow up to 20 photos per upload

// Gallery upload error handler
export const handleGalleryUpload = (req, res, next) => {
  galleryUpload(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          message: 'File too large. Maximum size is 5MB'
        });
      }
      if (err.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({
          message: 'Too many files. Maximum is 20 photos per upload'
        });
      }
      return res.status(400).json({
        message: 'File upload error',
        error: err.message
      });
    }
    if (err) {
      return res.status(400).json({
        message: 'Invalid file type. Only images are allowed',
        error: err.message
      });
    }
    next();
  });
};

// Error handling middleware for upload errors
export const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
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
    return res.status(400).json({
      success: false,
      message: err.message || 'Error uploading file',
    });
  }
  next();
};