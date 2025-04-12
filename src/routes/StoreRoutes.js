import express from 'express';
import {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getFeaturedProducts,
  getProductsByEvent,
  updateInventory,
  searchProducts
} from '../controllers/StoreController.js';

const router = express.Router();

// Route to get all products
router.get('/', getAllProducts);

// Route to get a single product by ID
router.get('/:id', getProductById);

// Route to create a new product (admin only)
router.post('/', createProduct);

// Route to update an existing product (admin only)
router.put('/:id', updateProduct);

// Route to delete a product (admin only)
router.delete('/:id', deleteProduct);

// Route to get featured products
router.get('/featured', getFeaturedProducts);

// Route to get products by event ID
router.get('/event/:eventId', getProductsByEvent);

// Route to update product inventory (admin only)
router.put('/inventory', updateInventory);

// Route to search products
router.get('/search', searchProducts);

export default router;