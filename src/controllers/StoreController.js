
import Product from '../models/Product';

import { validationResult } from 'express-validator';
import fs from 'fs';
import path from 'path';

/**
 * Get all products with pagination
 */
export const getAllProducts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    const filters = {};
    
    // Apply filters if provided
    if (req.query.category) filters.category = req.query.category;
    if (req.query.eventId) filters.eventId = req.query.eventId;
    
    const products = await Product.find(filters)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });
      
    const total = await Product.countDocuments(filters);
    
    res.status(200).json({
      success: true,
      data: products,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching products',
      error: error.message
    });
  }
};

/**
 * Get a single product by ID
 */
export const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: product
    });
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching product',
      error: error.message
    });
  }
};

/**
 * Create a new product
 * Admin only
 */
export const createProduct = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }
  
  try {
    // Handle file upload if there's an image
    let imageUrl = null;
    if (req.file) {
      imageUrl = `/uploads/products/${req.file.filename}`;
    }
    
    const {
      name,
      description,
      price,
      category,
      inventory,
      eventId,
      featured
    } = req.body;
    
    const newProduct = new Product({
      name,
      description,
      price: parseFloat(price),
      category,
      imageUrl,
      inventory: parseInt(inventory) || 0,
      eventId,
      featured: featured === 'true'
    });
    
    const savedProduct = await newProduct.save();
    
    res.status(201).json({
      success: true,
      data: savedProduct,
      message: 'Product created successfully'
    });
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating product',
      error: error.message
    });
  }
};

/**
 * Update an existing product
 * Admin only
 */
export const updateProduct = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }
  
  try {
    // Check if product exists
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    // Handle file upload if there's a new image
    let imageUrl = product.imageUrl;
    if (req.file) {
      // Delete old image if exists
      if (product.imageUrl) {
        const oldImagePath = path.join(__dirname, '../../', product.imageUrl);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
      imageUrl = `/uploads/products/${req.file.filename}`;
    }
    
    const {
      name,
      description,
      price,
      category,
      inventory,
      eventId,
      featured
    } = req.body;
    
    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      {
        name: name || product.name,
        description: description || product.description,
        price: price ? parseFloat(price) : product.price,
        category: category || product.category,
        imageUrl,
        inventory: inventory ? parseInt(inventory) : product.inventory,
        eventId: eventId || product.eventId,
        featured: featured !== undefined ? featured === 'true' : product.featured
      },
      { new: true }
    );
    
    res.status(200).json({
      success: true,
      data: updatedProduct,
      message: 'Product updated successfully'
    });
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating product',
      error: error.message
    });
  }
};

/**
 * Delete a product
 * Admin only
 */
export const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    // Delete product image if exists
    if (product.imageUrl) {
      const imagePath = path.join(__dirname, '../../', product.imageUrl);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }
    
    await Product.findByIdAndDelete(req.params.id);
    
    res.status(200).json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting product',
      error: error.message
    });
  }
};

/**
 * Get featured products
 */
export const getFeaturedProducts = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 4;
    
    const featuredProducts = await Product.find({ featured: true })
      .limit(limit)
      .sort({ createdAt: -1 });
      
    res.status(200).json({
      success: true,
      data: featuredProducts
    });
  } catch (error) {
    console.error('Error fetching featured products:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching featured products',
      error: error.message
    });
  }
};

/**
 * Get products by event ID
 */
export const getProductsByEvent = async (req, res) => {
  try {
    const eventId = req.params.eventId;
    const products = await Product.find({ eventId });
    
    res.status(200).json({
      success: true,
      data: products
    });
  } catch (error) {
    console.error('Error fetching event products:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching event products',
      error: error.message
    });
  }
};

/**
 * Update product inventory
 * Admin only - typically called after order processing
 */
export const updateInventory = async (req, res) => {
  const { productId, quantity, operation } = req.body;
  
  try {
    const product = await Product.findById(productId);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    let newInventory;
    
    if (operation === 'add') {
      newInventory = product.inventory + parseInt(quantity);
    } else if (operation === 'subtract') {
      newInventory = product.inventory - parseInt(quantity);
      
      // Check if resulting inventory would be negative
      if (newInventory < 0) {
        return res.status(400).json({
          success: false,
          message: 'Insufficient inventory'
        });
      }
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid operation. Use "add" or "subtract"'
      });
    }
    
    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      { inventory: newInventory },
      { new: true }
    );
    
    res.status(200).json({
      success: true,
      data: updatedProduct,
      message: 'Inventory updated successfully'
    });
  } catch (error) {
    console.error('Error updating inventory:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating inventory',
      error: error.message
    });
  }
};

/**
 * Search products
 */
export const searchProducts = async (req, res) => {
  try {
    const searchTerm = req.query.q;
    
    if (!searchTerm) {
      return res.status(400).json({
        success: false,
        message: 'Search term is required'
      });
    }
    
    const products = await Product.find({
      $or: [
        { name: { $regex: searchTerm, $options: 'i' } },
        { description: { $regex: searchTerm, $options: 'i' } },
        { category: { $regex: searchTerm, $options: 'i' } }
      ]
    });
    
    res.status(200).json({
      success: true,
      data: products
    });
  } catch (error) {
    console.error('Error searching products:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while searching products',
      error: error.message
    });
  }
};