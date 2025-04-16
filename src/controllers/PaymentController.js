import Payment from '../models/Payment.js';
import Event from '../models/Event.js';
import Product from '../models/Product.js';

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

