import Event from '../models/Event.js';
import Payment from '../models/Payment.js';
import Sponsor from '../models/Sponsor.js';
import Guest from '../models/Guest.js';
import Curator from '../models/Curator.js';
import VenueOwner from '../models/VenueOwner.js';
import jwt from 'jsonwebtoken';
import axios from 'axios';

// Constants for fee calculations
const BOOKING_FEE_PERCENTAGE = 2; // 2% booking fee
const GST_PERCENTAGE = 18; // 18% GST

// Helper function to calculate fees and total
const calculateTicketPrices = (tickets, quantities) => {
  // Calculate subtotal
  let subtotal = 0;
  tickets.forEach((ticket, index) => {
    subtotal += ticket.price * quantities[index];
  });

  // Calculate booking fee
  const bookingFee = (subtotal * BOOKING_FEE_PERCENTAGE) / 100;

  // Calculate GST (on subtotal + booking fee)
  const gst = ((subtotal + bookingFee) * GST_PERCENTAGE) / 100;

  // Calculate total
  const total = subtotal + bookingFee + gst;

  return {
    subtotal,
    bookingFee,
    gst,
    total
  };
};

// Get ticket availability and prices
export const getTicketDetails = async (req, res) => {
  try {
    const { eventId } = req.params;

    const event = await Event.findById(eventId).select('tickets eventType title');
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Get available tickets with remaining quantity and ticket ID
    const availableTickets = event.tickets.map(ticket => ({
      id: ticket._id,  // Include the ticket's MongoDB _id
      name: ticket.name,
      type: ticket.type,
      price: ticket.price,
      currency: ticket.currency,
      available: ticket.available - ticket.sold,
      description: ticket.description,
      benefits: ticket.benefits,
      saleStartDate: ticket.saleStartDate,
      saleEndDate: ticket.saleEndDate,
      _id: ticket._id  // Include it again as _id for clarity
    }));

    res.json({
      eventId: event._id,  // Include the event ID
      eventTitle: event.title,
      eventType: event.eventType,
      tickets: availableTickets,
      bookingInstructions: {
        endpoint: `/api/tickets/event/${event._id}/book`,
        method: 'POST',
        format: {
          ticketQuantities: [
            {
              ticketId: "TICKET_ID (_id from above)",
              quantity: "NUMBER_OF_TICKETS"
            }
          ],
          paymentMethod: "card"
        }
      }
    });
  } catch (error) {
    console.error('Error getting ticket details:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Calculate ticket prices with fees
export const calculatePrice = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { ticketQuantities } = req.body;
    // ticketQuantities format: [{ ticketId: "...", quantity: 2 }, ...]

    const event = await Event.findById(eventId).select('tickets');
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Validate and get selected tickets
    const selectedTickets = [];
    const quantities = [];
    
    for (const item of ticketQuantities) {
      const ticket = event.tickets.id(item.ticketId);
      if (!ticket) {
        return res.status(400).json({ message: `Invalid ticket ID: ${item.ticketId}` });
      }
      
      // Check if enough tickets are available
      const availableQuantity = ticket.available - ticket.sold;
      if (availableQuantity < item.quantity) {
        return res.status(400).json({ 
          message: `Only ${availableQuantity} tickets available for ${ticket.name}`
        });
      }

      selectedTickets.push(ticket);
      quantities.push(item.quantity);
    }

    // Calculate prices
    const priceDetails = calculateTicketPrices(selectedTickets, quantities);

    // Return detailed price breakdown
    res.json({
      tickets: selectedTickets.map((ticket, index) => ({
        name: ticket.name,
        quantity: quantities[index],
        unitPrice: ticket.price,
        subtotal: ticket.price * quantities[index]
      })),
      ...priceDetails
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Book tickets
export const bookTickets = async (req, res) => {
  try {
    // Verify JWT token
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded || !decoded.id || !decoded.role) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    const { eventId } = req.params;
    const { ticketQuantities, email } = req.body;

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Validate and process ticket quantities
    const selectedTickets = [];
    const quantities = [];
    let subtotal = 0;
    for (const item of ticketQuantities) {
      const ticket = event.tickets.id(item.ticketId);
      if (!ticket) {
        return res.status(400).json({ message: `Invalid ticket ID: ${item.ticketId}` });
      }
      // Check if enough tickets are available
      const availableQuantity = ticket.available - ticket.sold;
      if (availableQuantity < item.quantity) {
        return res.status(400).json({ 
          message: `Only ${availableQuantity} tickets available for ${ticket.name}`
        });
      }
      selectedTickets.push(ticket);
      quantities.push(item.quantity);
      subtotal += ticket.price * item.quantity;
    }

    // Calculate final price
    const priceDetails = calculateTicketPrices(selectedTickets, quantities);

    // Create payment record (pending)
    const payment = new Payment({
      user: decoded.id,
      amount: priceDetails.total,
      paymentType: 'ticket',
      status: 'pending',
      paymentMethod: 'paystack',
      event: eventId,
      metadata: {
        bookingFee: priceDetails.bookingFee,
        gst: priceDetails.gst,
        subtotal: priceDetails.subtotal,
        tickets: selectedTickets.map((ticket, index) => ({
          id: ticket._id,
          name: ticket.name,
          quantity: quantities[index],
          unitPrice: ticket.price
        }))
      }
    });
    await payment.save();

    // Initialize Paystack transaction
    const paystackRes = await axios.post(
      'https://api.paystack.co/transaction/initialize',
      {
        email: email, // must be provided in req.body
        amount: Math.round(priceDetails.total * 100), // Paystack expects amount in kobo
        reference: payment._id.toString(),
        metadata: {
          eventId,
          userId: decoded.id,
          paymentId: payment._id.toString(),
        }
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        }
      }
    );

    const { authorization_url } = paystackRes.data.data;

    // Return payment link to frontend
    res.json({
      message: 'Proceed to payment',
      paymentUrl: authorization_url,
      paymentId: payment._id,
      amount: priceDetails.total
    });
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    }
    console.error('Error booking tickets:', error.response?.data || error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Paystack webhook handler
export const paystackWebhook = async (req, res) => {
  try {
    // Paystack sends events as JSON
    const event = req.body;
    if (event.event === 'charge.success') {
      const reference = event.data.reference;
      // Find the payment by reference (which is payment._id)
      const payment = await Payment.findById(reference);
      if (!payment || payment.status === 'completed') {
        return res.status(200).send('Already processed');
      }
      // Verify payment with Paystack
      const verifyRes = await axios.get(
        `https://api.paystack.co/transaction/verify/${reference}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          }
        }
      );
      if (verifyRes.data.data.status === 'success') {
        // Mark payment as completed
        payment.status = 'completed';
        await payment.save();
        // Update ticket sold counts and confirm booking
        const eventDoc = await Event.findById(payment.event);
        const userId = payment.user;
        const tickets = payment.metadata.tickets;
        // Update ticket sold
        tickets.forEach(t => {
          const ticket = eventDoc.tickets.id(t.id);
          if (ticket) {
            ticket.sold += t.quantity;
          }
        });
        await eventDoc.save();
        // Add user to event attendees if not already
        if (!eventDoc.attendees.includes(userId)) {
          eventDoc.attendees.push(userId);
          await eventDoc.save();
        }
        // Add booking to user
        let user;
        const ticketBooking = {
          event: eventDoc._id,
          tickets: tickets.map(t => ({
            ticketId: t.id,
            name: t.name,
            quantity: t.quantity,
            unitPrice: t.unitPrice,
            totalPrice: t.unitPrice * t.quantity
          })),
          totalAmount: payment.amount,
          bookingDate: new Date(),
          paymentId: payment._id,
          status: 'confirmed'
        };
        // Try all user types
        const SponsorModel = Sponsor;
        const CuratorModel = Curator;
        const GuestModel = Guest;
        const VenueOwnerModel = VenueOwner;
        user = await SponsorModel.findById(userId) || await CuratorModel.findById(userId) || await GuestModel.findById(userId) || await VenueOwnerModel.findById(userId);
        if (user) {
          if (!user.ticketBookings) user.ticketBookings = [];
          user.ticketBookings.push(ticketBooking);
          await user.save();
        }
        return res.status(200).send('Payment processed and booking confirmed');
      } else {
        return res.status(400).send('Payment not successful');
      }
    }
    res.status(200).send('Event ignored');
  } catch (error) {
    console.error('Paystack webhook error:', error.response?.data || error);
    res.status(500).send('Webhook error');
  }
}; 