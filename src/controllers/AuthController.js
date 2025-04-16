import jwt from 'jsonwebtoken';
// import User from '../models/User.js';
import VenueOwner from '../models/VenueOwner.js';
import Sponsor from '../models/Sponsor.js';
import Curator from '../models/Curator.js';
import Guest from '../models/Guest.js';

export const registerSponsor = async (req, res) => {
  try {
    const {
      businessName,
      taxIdentificationNumber,
      description,
      contactName,
      role,
      preferredEvents,
      sponsorshipExpectations,
      products,
    } = req.body;

    const businessLogo = req.files?.businessLogo?.[0]?.path;
    const businessBanner = req.files?.businessBanner?.[0]?.path;

    if (
      !businessName ||
      !taxIdentificationNumber ||
      !description ||
      !contactName ||
      !role ||
      !preferredEvents ||
      !sponsorshipExpectations ||
      !businessBanner ||
      !businessLogo
    ) {
      return res.status(400).json({ error: 'Fill all the required fields' });
    }

    const sponsor = new Sponsor({
      businessName,
      taxIdentificationNumber,
      description,
      contactName,
      role,
      preferredEvents,
      sponsorshipExpectations,
      products,
      businessLogo,
      businessBanner,
    });

    await sponsor.save();

    // Generate JWT
    const token = jwt.sign({ id: sponsor._id, role: 'sponsor' }, process.env.JWT_SECRET, { expiresIn: '24h' });

    res.status(201).json({
      message: 'Sponsor registered successfully',
      sponsor,
      token,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

export const registerVenueOwner = async (req, res) => {
  try {
    const {
      venueName,
      address,
      gstInformation,
      contactPhone,
      email,
      website,
      hasMenu,
      menuProducts, // this comes as a stringified JSON from frontend
    } = req.body;

    const venueImage = req.files?.venueImage?.[0]?.path;
    if (!venueName || !address || !gstInformation || !contactPhone || !email || !website || !hasMenu || !menuProducts || !venueImage) {
      return res.status(400).json({ error: 'Fill all the required fields' });
    }

    let menuData = [];
    if (hasMenu === 'true' && menuProducts) {
      const parsedMenu = JSON.parse(menuProducts);
      parsedMenu.forEach((product, index) => {
        menuData.push({
          name: product.name,
          price: product.price,
          image: req.files?.menuImages?.[index]?.path || null,
        });
      });
    }

    const newVenue = new VenueOwner({
      venueName,
      address,
      gstInformation,
      venueImage,
      contactPhone,
      email,
      website,
      hasMenu: hasMenu === 'true',
      menuProducts: menuData,
    });

    await newVenue.save();

    // Generate JWT
    const token = jwt.sign({ id: newVenue._id, role: 'venueOwner' }, process.env.JWT_SECRET, { expiresIn: '24h' });

    res.status(201).json({ message: 'Venue owner registered', data: newVenue, token });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const registerCurator = async (req, res) => {
  try {
    const { firstName, lastName, stageName, bio } = req.body;
    const imagePaths = req.files ? req.files.map((file) => file.path) : [];

    if (!firstName || !lastName || !bio || !stageName || imagePaths.length === 0) {
      return res.status(400).json({ error: 'First name, stage name, last name, and bio are required.' });
    }

    const newCurator = new Curator({
      firstName,
      lastName,
      stageName,
      bio,
      images: imagePaths,
      user: req.user.id,
    });

    await newCurator.save();

    // Generate JWT
    const token = jwt.sign({ id: newCurator._id, role: 'curator' }, process.env.JWT_SECRET, { expiresIn: '24h' });

    res.status(201).json({
      message: 'Curator registered successfully',
      curator: newCurator,
      token,
    });
  } catch (error) {
    console.error('Error in registerCurator:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const registerGuest = async (req, res) => {
  try {
    const { firstName, lastName, stageName, bio } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !bio || !stageName) {
      return res.status(400).json({ message: 'First Name, Last Name, stageName, and bio are required' });
    }

    // Prepare the data to be saved
    const guestData = {
      firstName,
      lastName,
      stageName,
      bio,
      image: req.files?.image?.[0]?.path || null, // Store the image path if provided
      video: req.files?.video?.[0]?.path || null, // Store the video path if provided
    };

    // Create a new Guest document
    const newGuest = new Guest(guestData);

    // Save the guest to the database
    await newGuest.save();

    // Generate JWT
    const token = jwt.sign({ id: newGuest._id, role: 'guest' }, process.env.JWT_SECRET, { expiresIn: '24h' });

    return res.status(201).json({
      message: 'Guest registered successfully',
      guest: newGuest,
      token,
    });
  } catch (error) {
    console.error('Error registering guest:', error);
    return res.status(500).json({
      message: 'An error occurred while registering the guest.',
      error: error.message,
    });
  }
};

// export const getProfile = async (req, res) => {
//   try {
//     const user = await User.findById(req.user.id).select('-password');
//     if (!user) {
//       return res.status(404).json({ message: 'User not found' });
//     }
//     res.json(user);
//   } catch (error) {
//     res.status(500).json({ message: 'Server error', error: error.message });
//   }
// };

// export const updateProfile = async (req, res) => {
//   try {
//     const updateData = req.body;

//     // Don't allow role changes through this endpoint
//     delete updateData.role;

//     // Don't allow password updates through this endpoint
//     delete updateData.password;

//     const user = await User.findByIdAndUpdate(
//       req.user.id,
//       { $set: updateData },
//       { new: true, runValidators: true }
//     ).select('-password');

//     if (!user) {
//       return res.status(404).json({ message: 'User not found' });
//     }

//     res.json({
//       message: 'Profile updated successfully',
//       user,
//     });
//   } catch (error) {
//     res.status(500).json({ message: 'Server error', error: error.message });
//   }
// };