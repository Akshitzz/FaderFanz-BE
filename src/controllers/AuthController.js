import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
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
      email,
      password,
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
      !email ||
      !password
    ) {
      return res.status(400).json({ error: 'Fill all the required fields' });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

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
      email,
      password: hashedPassword, // Save the hashed password
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
      menuProducts,
      password,
    } = req.body;

    const venueImages = req.files?.venueImages?.map((file) => file.path);
    const menuImages = req.files?.menuImages?.map((file) => file.path);

    if (!venueName || !address || !gstInformation || !contactPhone || !email || !website || !hasMenu || !menuProducts || !venueImages || !password) {
      return res.status(400).json({ error: 'Fill all the required fields' });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    let menuData = [];
    if (hasMenu === 'true' && menuProducts) {
      const parsedMenu = JSON.parse(menuProducts);
      parsedMenu.forEach((product, index) => {
        menuData.push({
          name: product.name,
          price: product.price,
          image: menuImages?.[index] || null,
        });
      });
    }

    const newVenue = new VenueOwner({
      venueName,
      address,
      gstInformation,
      venueImages,
      contactPhone,
      email,
      website,
      hasMenu: hasMenu === 'true',
      menuProducts: menuData,
      password: hashedPassword, // Save the hashed password
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
    const { firstName, lastName, stageName, bio, email, password } = req.body;
    const imagePaths = req.files ? req.files.map((file) => file.path) : [];

    if (!firstName || !lastName || !bio || !stageName || imagePaths.length === 0 || !email || !password) {
      return res.status(400).json({ error: 'First name, stage name, last name, and bio are required.' });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    const newCurator = new Curator({
      firstName,
      lastName,
      stageName,
      email,
      password: hashedPassword, // Save the hashed password
      bio,
      images: imagePaths,
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
    const { firstName, lastName, stageName, bio, email, password } = req.body;

    if (!firstName || !lastName || !bio || !stageName || !email || !password) {
      return res.status(400).json({ message: 'First Name, Last Name, stageName, and bio are required' });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    const guestData = {
      firstName,
      lastName,
      stageName,
      bio,
      email,
      password: hashedPassword, // Save the hashed password
      image: req.files?.image?.[0]?.path || null,
      video: req.files?.video?.[0]?.path || null,
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

export const login =async (req, res) => {
  try{
    const { email, password ,role} = req.body;
    // validation
    if(!email || !password || !role) {
      return res.status(400).json({ message: 'Email, password, and role are required' });
    }
    // determine the modal to query based on role
    let Model;
    switch(role){
      case 'sponsor':
      Model = Sponsor;
      break;
      case 'venueOwner':
      Model = VenueOwner;
      break;
      case 'curator':
      Model = Curator;  
      break;
      case 'guest':
      Model = Guest;
      break;
      default:
      return res.status(400).json({ message: 'Invalid role' });
    }
      // Find the user by email
      const user = await Model.findOne({ email });
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
  
      // Check if the password matches (assuming passwords are hashed)
      // const isMatch = await user.comparePassword(password); // Ensure your schema has a `comparePassword` method
      // if (!isMatch) {
      //   return res.status(401).json({ message: 'Invalid credentials' });
      // }
  
      // Generate JWT
      const token = jwt.sign({ id: user._id, role }, process.env.JWT_SECRET, { expiresIn: '24h' });
  
      res.status(200).json({
        message: 'Login successful',
        token,
        user: {
          id: user._id,
          email: user.email,
          role,
        },
      });      
    
  }catch(error) {
    console.error('Error in login:', error);
    return res.status(500).json({ message: 'Server error' });
  }
}

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