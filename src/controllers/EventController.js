import Event from '../models/Event';
import User from '../models/User';

export const createEvent = async (req, res) => {
  try {
    const {
      title, description, category, startDate, endDate,
      venue, ticketPrice, ticketsAvailable, mediaFiles, isCrowdfunded
    } = req.body;

    // Check if user can create events
    const allowedRoles = ['sponsor', 'venueOwner', 'curator', 'admin'];
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Not authorized to create events' });
    }

    const event = new Event({
      title,
      description,
      category,
      startDate,
      endDate,
      creator: req.user.id,
      venue,
      status: 'draft',
      ticketPrice,
      ticketsAvailable,
      mediaFiles,
      isCrowdfunded
    });

    await event.save();

    res.status(201).json({
      message: 'Event created successfully',
      event
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getAllEvents = async (req, res) => {
  try {
    // Filter options
    const { 
      category, status, startDateFrom, startDateTo,
      venue, creator, isCrowdfunded 
    } = req.query;
    
    const filter = {};
    
    if (category) filter.category = category;
    if (status) filter.status = status;
    if (venue) filter.venue = venue;
    if (creator) filter.creator = creator;
    if (isCrowdfunded !== undefined) filter.isCrowdfunded = isCrowdfunded === 'true';
    
    // Date range filter
    if (startDateFrom || startDateTo) {
      filter.startDate = {};
      if (startDateFrom) filter.startDate.$gte = new Date(startDateFrom);
      if (startDateTo) filter.startDate.$lte = new Date(startDateTo);
    }

    const events = await Event.find(filter)
      .populate('creator', 'firstName lastName username')
      .populate('venue', 'name location')
      .sort({ startDate: 1 });

    res.json(events);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getEventById = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('creator', 'firstName lastName username')
      .populate('venue', 'name location description')
      .populate('sponsors', 'firstName lastName businessName')
      .populate('attendees', 'firstName lastName username');
    
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    res.json(event);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const updateEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Check if user is authorized to update this event
    if (event.creator.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to update this event' });
    }

    const updateData = req.body;
    
    // Don't allow changing the creator
    delete updateData.creator;

    const updatedEvent = await Event.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    res.json({
      message: 'Event updated successfully',
      event: updatedEvent
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const deleteEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Check if user is authorized to delete this event
    if (event.creator.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to delete this event' });
    }

    await Event.findByIdAndDelete(req.params.id);

    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const attendEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Check if user is already attending
    if (event.attendees.includes(req.user.id)) {
      return res.status(400).json({ message: 'You are already attending this event' });
    }

    // Add user to attendees
    event.attendees.push(req.user.id);
    event.ticketsSold += 1;
    
    await event.save();

    res.json({
      message: 'Successfully registered for event',
      event
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};