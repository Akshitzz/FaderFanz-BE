import Event from '../models/Event.js';
import Sponsor from '../models/Sponsor.js';
import Curator from '../models/Curator.js';

// Get available sponsors and curators for event creation
export const getEventCreationData = async (req, res) => {
  try {
    // Fetch all active sponsors
    const sponsors = await Sponsor.find()
      .select('businessName businessLogo description');

    // Fetch all curators
    const curators = await Curator.find()
      .select('firstName lastName stageName profileImage');

    res.json({
      success: true,
      data: {
        sponsors: sponsors.map(sponsor => ({
          id: sponsor._id,
          businessName: sponsor.businessName,
          businessLogo: sponsor.businessLogo,
          description: sponsor.description
        })),
        curators: curators.map(curator => ({
          id: curator._id,
          name: `${curator.firstName} ${curator.lastName}`,
          stageName: curator.stageName,
          profileImage: curator.profileImage
        }))
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const createEvent = async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      startDate,
      endDate,
      startTime,
      endTime,
      venue,
      eventType,
      tickets,
      isCrowdfunded,
      sponsors,
      curators,
      location
    } = req.body;
    // Debug log to see what's being received
    console.log('Received event data:', {
      title,
      description,
      category,
      startDate,
      endDate,
      startTime,
      endTime,
      eventType,
      hasFiles: !!req.files,
      numberOfFiles: req.files?.length,
      locationReceived: !!location,
      locationParsed: typeof location === 'string' ? 'needs parsing' : 'already object',
      ticketsReceived: !!tickets,
      ticketsParsed: typeof tickets === 'string' ? 'needs parsing' : 'already object'
    });

    // Check if user can create events
    const allowedRoles = ['sponsor', 'venueOwner', 'curator', 'admin'];
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Not authorized to create events' });
    }

    // Parse JSON strings if needed
    let parsedLocation = location;
    let parsedTickets = tickets;

    try {
      if (typeof location === 'string') {
        parsedLocation = JSON.parse(location);
      }
      if (typeof tickets === 'string') {
        parsedTickets = JSON.parse(tickets);
      }
    } catch (error) {
      console.error('Error parsing JSON:', error);
      return res.status(400).json({ message: 'Invalid JSON format for location or tickets' });
    }

    // Check if files were uploaded
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'Please upload at least one event image' });
    }

    // Get the banner image URL (first uploaded image)
    const bannerUrl = `/uploads/events/${req.files[0].filename}`;
    // Additional event images
    const mediaFiles = req.files.slice(1).map(file => `/uploads/events/${file.filename}`);

    // Validate required fields with detailed error message
    const missingFields = [];
    if (!title) missingFields.push('title');
    if (!description) missingFields.push('description');
    if (!category) missingFields.push('category');
    if (!startDate) missingFields.push('startDate');
    if (!endDate) missingFields.push('endDate');
    if (!startTime) missingFields.push('startTime');
    if (!endTime) missingFields.push('endTime');
    if (!eventType) missingFields.push('eventType');
    if (!parsedLocation) missingFields.push('location');

    if (missingFields.length > 0) {
      return res.status(400).json({ 
        message: 'Please provide all required fields', 
        missingFields: missingFields 
      });
    }

    // Validate event type and tickets
    if (eventType === 'ticketed' && (!parsedTickets || parsedTickets.length === 0)) {
      return res.status(400).json({ message: 'Ticketed events must have at least one ticket type' });
    }

    // Validate ticket information if provided
    if (parsedTickets) {
      for (const ticket of parsedTickets) {
        if (!ticket.name || !ticket.price || !ticket.available) {
          return res.status(400).json({ message: 'Each ticket must have a name, price, and available quantity' });
        }
      }
    }

    // Validate curators exist if specified
    let validatedCurators = [];
    if (curators && curators.length > 0) {
      const curatorIds = Array.isArray(curators) 
        ? curators.map(id => id.replace(/['"]+/g, ''))
        : [curators.replace(/['"]+/g, '')];
      
      const existingCurators = await Curator.find({ _id: { $in: curatorIds } });
      
      if (existingCurators.length !== curatorIds.length) {
        return res.status(400).json({ message: 'One or more selected curators do not exist' });
      }
      validatedCurators = curatorIds;
    }

    // Validate sponsors exist if specified
    let validatedSponsors = [];
    if (sponsors && sponsors.length > 0) {
      const sponsorIds = Array.isArray(sponsors) 
        ? sponsors.map(id => id.replace(/['"]+/g, ''))
        : [sponsors.replace(/['"]+/g, '')];

      const existingSponsors = await Sponsor.find({ _id: { $in: sponsorIds } });
      
      if (existingSponsors.length !== sponsorIds.length) {
        return res.status(400).json({ message: 'One or more selected sponsors do not exist' });
      }
      validatedSponsors = sponsorIds;
    }

    // Create event object
    const event = new Event({
      title,
      description,
      category,
      startDate,
      endDate,
      startTime,
      endTime,
      creator: req.user.id,
      curators: validatedCurators,
      venue,
      eventType,
      tickets: eventType === 'ticketed' ? parsedTickets : [],
      status: 'draft',
      mediaFiles,
      isCrowdfunded,
      sponsors: validatedSponsors,
      location: parsedLocation,
      banner: {
        url: bannerUrl,
        alt: title
      }
    });

    await event.save();

    // Populate the response with curator and sponsor details
    const populatedEvent = await Event.findById(event._id)
      .populate('creator', 'firstName lastName username profileImage stageName')
      .populate('curators', 'firstName lastName username profileImage stageName')
      .populate('sponsors', 'businessName businessLogo')
      .populate('venue', 'name location');

    res.status(201).json({
      message: 'Event created successfully',
      event: populatedEvent
    });
  } catch (error) {
    console.error('Error creating event:', error);
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
      .populate('creator', 'firstName lastName username profileImage')
      .populate('venue', 'name location')
      .select('title description banner startDate endDate location totalLikes totalInterested')
      .sort({ startDate: 1 });

    // Format the response
    const formattedEvents = events.map(event => ({
      id: event._id,
      title: event.title,
      description: event.description,
      banner: event.banner,
      startDate: event.startDate,
      endDate: event.endDate,
      location: event.location,
      venue: event.venue ? {
        id: event.venue._id,
        name: event.venue.name,
        location: event.venue.location
      } : null,
      creator: {
        id: event.creator._id,
        name: `${event.creator.firstName} ${event.creator.lastName}`,
        username: event.creator.username,
        profileImage: event.creator.profileImage
      },
      stats: {
        likes: event.totalLikes || 0,
        interested: event.totalInterested || 0
      }
    }));

    res.json({
      success: true,
      count: events.length,
      data: formattedEvents
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getEventById = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('creator', 'firstName lastName username profileImage bio stageName')
      .populate('venue', 'name location description images')
      .populate({
        path: 'sponsors',
        select: 'firstName lastName businessName businessLogo products',
        populate: {
          path: 'products',
          select: 'name price images description'
        }
      })
      .populate('attendees', 'firstName lastName username');
    
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Format location for iframe embedding
    const location = event.venue?.location || event.location;
    const embedUrl = location?.coordinates ? 
      `https://www.google.com/maps/embed/v1/place?key=${process.env.GOOGLE_MAPS_API_KEY}&q=${location.coordinates.latitude},${location.coordinates.longitude}` : 
      null;

    // Format the response
    const formattedEvent = {
      ...event.toObject(),
      location: {
        ...location,
        embedUrl
      },
      curator: {
        id: event.creator._id,
        name: `${event.creator.firstName} ${event.creator.lastName}`,
        username: event.creator.username,
        profileImage: event.creator.profileImage,
        bio: event.creator.bio,
        stageName: event.creator.stageName
      },
      sponsors: event.sponsors.map(sponsor => ({
        id: sponsor._id,
        name: `${sponsor.firstName} ${sponsor.lastName}`,
        businessName: sponsor.businessName,
        businessLogo: sponsor.businessLogo,
        products: sponsor.products
      }))
    };

    res.json(formattedEvent);
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

// Like/Unlike an event
export const toggleEventLike = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Check if user has already liked the event
    const likeIndex = event.likes.findIndex(like => 
      like.user.toString() === req.user.id
    );

    if (likeIndex !== -1) {
      // User has already liked, so unlike
      event.likes.splice(likeIndex, 1);
    } else {
      // Add new like
      event.likes.push({ user: req.user.id });
    }

    await event.save();

    res.json({
      success: true,
      message: likeIndex !== -1 ? 'Event unliked' : 'Event liked',
      totalLikes: event.totalLikes
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Toggle interest in an event
export const toggleEventInterest = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Check if user is already interested
    const interestIndex = event.interestedPeople.findIndex(interest => 
      interest.user.toString() === req.user.id
    );

    if (interestIndex !== -1) {
      // User is already interested, so remove interest
      event.interestedPeople.splice(interestIndex, 1);
    } else {
      // Add new interest
      event.interestedPeople.push({ user: req.user.id });
    }

    await event.save();

    res.json({
      success: true,
      message: interestIndex !== -1 ? 'Interest removed' : 'Interest added',
      totalInterested: event.totalInterested
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get event likes
export const getEventLikes = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('likes.user', 'firstName lastName username profileImage');
    
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    const likes = event.likes.map(like => ({
      id: like.user._id,
      name: `${like.user.firstName} ${like.user.lastName}`,
      username: like.user.username,
      profileImage: like.user.profileImage,
      likedAt: like.createdAt
    }));

    res.json({
      success: true,
      count: likes.length,
      data: likes
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get interested people
export const getEventInterested = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('interestedPeople.user', 'firstName lastName username profileImage');
    
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    const interested = event.interestedPeople.map(interest => ({
      id: interest.user._id,
      name: `${interest.user.firstName} ${interest.user.lastName}`,
      username: interest.user.username,
      profileImage: interest.user.profileImage,
      interestedSince: interest.createdAt
    }));

    res.json({
      success: true,
      count: interested.length,
      data: interested
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Add product to event
export const addEventProduct = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Check if user is authorized to add products
    if (event.creator.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to add products to this event' });
    }

    const { name, description, price, stock, category, images } = req.body;

    event.products.push({
      name,
      description,
      price,
      stock,
      category,
      images
    });

    await event.save();

    res.json({
      success: true,
      message: 'Product added successfully',
      product: event.products[event.products.length - 1]
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update event product
export const updateEventProduct = async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId);
    
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Check if user is authorized
    if (event.creator.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to update products in this event' });
    }

    const product = event.products.id(req.params.productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const updateData = req.body;
    Object.keys(updateData).forEach(key => {
      if (key !== '_id') {
        product[key] = updateData[key];
      }
    });

    await event.save();

    res.json({
      success: true,
      message: 'Product updated successfully',
      product
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete event product
export const deleteEventProduct = async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId);
    
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Check if user is authorized
    if (event.creator.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to delete products from this event' });
    }

    const productIndex = event.products.findIndex(
      product => product._id.toString() === req.params.productId
    );

    if (productIndex === -1) {
      return res.status(404).json({ message: 'Product not found' });
    }

    event.products.splice(productIndex, 1);
    await event.save();

    res.json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get event products
export const getEventProducts = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .select('products');
    
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    res.json({
      success: true,
      count: event.products.length,
      data: event.products
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};