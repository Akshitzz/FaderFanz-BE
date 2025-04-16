import Venue from '../models/Venue.js';
export const createVenue = async (req, res) => {
  try {
    // Check if user is a venue owner
    if (req.user.role !== 'venueOwner' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to create venues' });
    }

    const {
      name, location, capacity, amenities,
      images, description, availabilityCalendar, contactInformation
    } = req.body;

    const venue = new Venue({
      name,
      owner: req.user.id,
      location,
      capacity,
      amenities,
      images,
      description,
      availabilityCalendar,
      contactInformation
    });

    await venue.save();

    res.status(201).json({
      message: 'Venue created successfully',
      venue
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getAllVenues = async (req, res) => {
  try {
    // Filter options
    const { city, capacity, owner } = req.query;
    
    const filter = {};
    
    if (city) filter['location.city'] = city;
    if (capacity) filter.capacity = { $gte: parseInt(capacity) };
    if (owner) filter.owner = owner;

    const venues = await Venue.find(filter)
      .populate('owner', 'firstName lastName businessName');

    res.json(venues);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getVenueById = async (req, res) => {
  try {
    const venue = await Venue.findById(req.params.id)
      .populate('owner', 'firstName lastName businessName contactNumber email');
    
    if (!venue) {
      return res.status(404).json({ message: 'Venue not found' });
    }

    res.json(venue);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const updateVenue = async (req, res) => {
  try {
    const venue = await Venue.findById(req.params.id);
    
    if (!venue) {
      return res.status(404).json({ message: 'Venue not found' });
    }

    // Check if user is authorized to update this venue
    if (venue.owner.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to update this venue' });
    }

    const updateData = req.body;
    
    // Don't allow changing the owner
    delete updateData.owner;

    const updatedVenue = await Venue.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    res.json({
      message: 'Venue updated successfully',
      venue: updatedVenue
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const deleteVenue = async (req, res) => {
  try {
    const venue = await Venue.findById(req.params.id);
    
    if (!venue) {
      return res.status(404).json({ message: 'Venue not found' });
    }

    // Check if user is authorized to delete this venue
    if (venue.owner.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to delete this venue' });
    }

    await Venue.findByIdAndDelete(req.params.id);

    res.json({ message: 'Venue deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
