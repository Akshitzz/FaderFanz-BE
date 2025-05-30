import Event from '../models/Event.js';
import Payment from '../models/Payment.js';
import Sponsor from '../models/Sponsor.js';
import Guest from '../models/Guest.js';
import Curator from '../models/Curator.js';
import VenueOwner from '../models/VenueOwner.js';
import jwt from 'jsonwebtoken';

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
    const { ticketQuantities, paymentMethod } = req.body;

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Validate and process ticket quantities
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

      // Update ticket sold count
      ticket.sold += item.quantity;
    }

    // Calculate final price
    const priceDetails = calculateTicketPrices(selectedTickets, quantities);

    // Create payment record
    const payment = new Payment({
      user: decoded.id,
      amount: priceDetails.total,
      paymentType: 'ticket',
      status: 'completed', // In production, this would be 'pending' until payment confirmation
      paymentMethod,
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

    // Create ticket booking record
    const ticketBooking = {
      event: eventId,
      tickets: selectedTickets.map((ticket, index) => ({
        ticketId: ticket._id,
        name: ticket.name,
        quantity: quantities[index],
        unitPrice: ticket.price,
        totalPrice: ticket.price * quantities[index]
      })),
      totalAmount: priceDetails.total,
      bookingDate: new Date(),
      paymentId: payment._id,
      status: 'confirmed'
    };

    // Save ticket booking based on user role
    let user;
    switch (decoded.role) {
      case 'sponsor':
        user = await Sponsor.findById(decoded.id);
        if (!user.ticketBookings) user.ticketBookings = [];
        user.ticketBookings.push(ticketBooking);
        await user.save();
        break;

      case 'curator':
        user = await Curator.findById(decoded.id);
        if (!user.ticketBookings) user.ticketBookings = [];
        user.ticketBookings.push(ticketBooking);
        await user.save();
        break;

      case 'guest':
        user = await Guest.findById(decoded.id);
        if (!user.ticketBookings) user.ticketBookings = [];
        user.ticketBookings.push(ticketBooking);
        await user.save();
        break;

      case 'venueOwner':
        user = await VenueOwner.findById(decoded.id);
        if (!user.ticketBookings) user.ticketBookings = [];
        user.ticketBookings.push(ticketBooking);
        await user.save();
        break;

      default:
        return res.status(403).json({ message: 'Invalid user role' });
    }

    await payment.save();
    await event.save();

    // Add user to event attendees if not already added
    if (!event.attendees.includes(decoded.id)) {
      event.attendees.push(decoded.id);
      await event.save();
    }

    res.json({
      message: 'Tickets booked successfully',
      bookingId: payment._id,
      tickets: selectedTickets.map((ticket, index) => ({
        name: ticket.name,
        quantity: quantities[index],
        unitPrice: ticket.price,
        subtotal: ticket.price * quantities[index]
      })),
      ...priceDetails,
      userRole: decoded.role
    });
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    }
    console.error('Error booking tickets:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
}; 