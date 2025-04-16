// src/controllers/productController.js
import Product from '../models/Product.js';
import Event from '../models/Event.js';

export const createProduct = async (req, res) => {
  try {
    const { name, description, price, stock, category, images, relatedEvent } = req.body;

    // Check if user can create products
    const allowedRoles = ['sponsor', 'curator', 'admin'];
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Not authorized to create products' });
    }

    // If event is provided, check if it exists and if user is associated with it
    if (relatedEvent) {
      const event = await Event.findById(relatedEvent);
      if (!event) {
        return res.status(404).json({ message: 'Event not found' });
      }

      // Check if user is creator or sponsor of the event
      const isCreator = event.creator.toString() === req.user.id;
      const isSponsor = event.sponsors.some(sponsor => sponsor.toString() === req.user.id);
      
      if (!isCreator && !isSponsor && req.user.role !== 'admin') {
        return res.status(403).json({ 
          message: 'You can only create products for events you created or sponsor' 
        });
      }
    }

    const product = new Product({
      name,
      description,
      price,
      stock,
      category,
      images,
      relatedEvent,
      seller: req.user.id
    });

    await product.save();

    res.status(201).json({
      message: 'Product created successfully',
      product
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getAllProducts = async (req, res) => {
  try {
    // Filter options
    const { category, minPrice, maxPrice, event, seller } = req.query;
    
    const filter = {};
    
    if (category) filter.category = category;
    if (event) filter.relatedEvent = event;
    if (seller) filter.seller = seller;
    
    // Price range filter
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = parseFloat(minPrice);
      if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
    }

    // Only show products with stock
    filter.stock = { $gt: 0 };

    const products = await Product.find(filter)
      .populate('seller', 'firstName lastName username')
      .populate('relatedEvent', 'title startDate')
      .sort({ createdAt: -1 });

    res.json(products);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('seller', 'firstName lastName username')
      .populate('relatedEvent', 'title description startDate');
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json(product);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const updateProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Check if user is authorized to update this product
    if (product.seller.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to update this product' });
    }

    const updateData = req.body;
    
    // Don't allow changing seller
    delete updateData.seller;

    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    res.json({
      message: 'Product updated successfully',
      product: updatedProduct
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Check if user is authorized to delete this product
    if (product.seller.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to delete this product' });
    }

    await Product.findByIdAndDelete(req.params.id);

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

