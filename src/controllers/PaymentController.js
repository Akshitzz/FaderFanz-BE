import Payment from '../models/Payment';
import Event from '../models/Event';
import User from '../models/User';
import Product from '../models/Product';

export const processTicketPayment = async (req, res) => {
  try {
    const { eventId, quantity, paymentMethod } = req.body;
    
    // Check if event exists
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Check if tickets are available
    if ((event.ticketsAvailable - event.ticketsSold) < quantity) {
      return res.status(400).json({ message: 'Not enough tickets available' });
    }

    // Calculate amount
    const amount = event.ticketPrice * quantity;

    // Process payment (simplified, in a real app would integrate with payment gateway)
    const payment = new Payment({
      user: req.user.id,
      amount,
      paymentType: 'ticket',
      status: 'completed', // In reality, this would be set after payment confirmation
      paymentMethod,
      event: eventId
    });

    await payment.save();

    // Update event with ticket sale
    event.ticketsSold += quantity;
    
    // Add user to attendees if not already there
    if (!event.attendees.includes(req.user.id)) {
      event.attendees.push(req.user.id);
    }
    
    await event.save();

    res.json({
      message: 'Ticket purchase successful',
      payment,
      event
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const processProductPayment = async (req, res) => {
  try {
    const { productId, quantity, paymentMethod } = req.body;
    
    // Check if product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Check if product is in stock
    if (product.stock < quantity) {
      return res.status(400).json({ message: 'Not enough stock available' });
    }

    // Calculate amount
    const amount = product.price * quantity;

    // Process payment (simplified, in a real app would integrate with payment gateway)
    const payment = new Payment({
      user: req.user.id,
      amount,
      paymentType: 'merchandise',
      status: 'completed', // In reality, this would be set after payment confirmation
      paymentMethod,
      product: productId
    });

    await payment.save();

    // Update product stock
    product.stock -= quantity;
    await product.save();

    res.json({
      message: 'Product purchase successful',
      payment,
      product
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getUserPaymentHistory = async (req, res) => {
  try {
    const payments = await Payment.find({ user: req.user.id })
      .populate('event', 'title startDate')
      .populate('campaign', 'title')
      .populate('product', 'name')
      .sort({ createdAt: -1 });

    res.json(payments);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getPaymentById = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('user', 'firstName lastName email')
      .populate('event', 'title startDate')
      .populate('campaign', 'title')
      .populate('product', 'name');
    
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    // Check if user is authorized to view this payment
    if (payment.user._id.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to view this payment' });
    }

    res.json(payment);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const processRefund = async (req, res) => {
  try {
    // Admin-only function
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to process refunds' });
    }

    const payment = await Payment.findById(req.params.id);
    
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    // Check if payment can be refunded
    if (payment.status !== 'completed') {
      return res.status(400).json({ message: `Payment cannot be refunded from ${payment.status} status` });
    }

    // Process refund (simplified, in a real app would integrate with payment gateway)
    payment.status = 'refunded';
    await payment.save();

    // Handle related entity updates
    if (payment.paymentType === 'ticket' && payment.event) {
      const event = await Event.findById(payment.event);
      if (event) {
        event.ticketsSold -= 1;
        event.attendees = event.attendees.filter(
          attendee => attendee.toString() !== payment.user.toString()
        );
        await event.save();
      }
    } else if (payment.paymentType === 'merchandise' && payment.product) {
      const product = await Product.findById(payment.product);
      if (product) {
        product.stock += 1;
        await product.save();
      }
    } else if (payment.paymentType === 'donation' && payment.campaign) {
      const campaign = await Campaign.findById(payment.campaign);
      if (campaign) {
        campaign.amountRaised -= payment.amount;
        campaign.donors = campaign.donors.filter(
          donor => donor.user.toString() !== payment.user.toString()
        );
        if (campaign.status === 'completed' && campaign.amountRaised < campaign.goal) {
          campaign.status = 'active';
        }
        await campaign.save();
      }
    }

    res.json({
      message: 'Refund processed successfully',
      payment
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// src/controllers/productController.js
const Product = require('../models/Product');
const Event = require('../models/Event');

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

