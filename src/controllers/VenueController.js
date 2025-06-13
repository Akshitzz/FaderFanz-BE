import Venue from '../models/Venue.js';
export const createVenue = async (req, res) => {
  try {
    // Check if user is a venue owner
    if (req.user.role !== 'venueOwner' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to create venues' });
    }

    const {
      name, location, capacity, amenities,
      description, availabilityCalendar, contactInformation
    } = req.body;

    // Parse JSON strings
    let parsedLocation;
    let parsedAvailabilityCalendar;
    let parsedAmenities;
    let parsedContactInformation;

    try {
      parsedLocation = typeof location === 'string' ? JSON.parse(location) : location;
      parsedAvailabilityCalendar = typeof availabilityCalendar === 'string' ? JSON.parse(availabilityCalendar) : availabilityCalendar;
      parsedAmenities = typeof amenities === 'string' ? JSON.parse(amenities) : amenities;
      parsedContactInformation = typeof contactInformation === 'string' ? JSON.parse(contactInformation) : contactInformation;
    } catch (error) {
      return res.status(400).json({ message: 'Invalid JSON format in request body' });
    }

    // Validate required location fields
    if (!parsedLocation.address || !parsedLocation.city || !parsedLocation.state || !parsedLocation.country) {
      return res.status(400).json({ message: 'Location must include address, city, state, and country' });
    }

    // Validate images
    if (!req.files?.venueImages || req.files.venueImages.length === 0) {
      return res.status(400).json({ message: 'At least one venue image is required' });
    }

    // Validate image file types
    const allowedImageTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    const images = req.files.venueImages;

    // Validate each image
    for (const image of images) {
      if (!allowedImageTypes.includes(image.mimetype)) {
        return res.status(400).json({ message: 'Invalid image type. Only JPEG, PNG, and JPG are allowed' });
      }
    }

    // Limit maximum number of images
    const MAX_IMAGES = 10;
    if (images.length > MAX_IMAGES) {
      return res.status(400).json({ message: `Maximum ${MAX_IMAGES} images allowed` });
    }

    // Process images for gallery
    const galleryPhotos = images.map((image, index) => ({
      url: image.path,
      caption: '',
      isFeatured: index === 0, // First image is featured by default
      order: index
    }));

    const venue = new Venue({
      name,
      owner: req.user.id,
      location: parsedLocation,
      capacity: parseInt(capacity),
      amenities: parsedAmenities,
      description,
      gallery: {
        photos: galleryPhotos,
        totalPhotos: galleryPhotos.length,
        lastUpdated: new Date()
      },
      availabilityCalendar: parsedAvailabilityCalendar,
      contactInformation: parsedContactInformation
    });

    await venue.save();

    res.status(201).json({
      message: 'Venue created successfully',
      venue
    });
  } catch (error) {
    console.error('Error in createVenue:', error);
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
