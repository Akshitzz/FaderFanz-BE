import express from 'express';
import {
  createProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct,
} from '../controllers/ProductController.js';
import { productUpload, handleUploadError } from '../middleware/upload.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Route to create a new product (restricted to specific roles)
router.post('/', createProduct);

// Route to get all products with optional filters
router.get('/', getAllProducts);

// Route to get a single product by ID
router.get('/:id', getProductById);

// Route to update an existing product
router.put('/:id', protect, productUpload, handleUploadError, updateProduct);

// Route to delete a product
router.delete('/:id', deleteProduct);

export default router;