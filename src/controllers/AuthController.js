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
      email,
      password,
      facebook,
      instagram,
      twitter
    } = req.body;

    let products = [];
    if (req.body.products) {
      try {
        products = JSON.parse(req.body.products);
      } catch (error) {
        return res.status(400).json({ error: 'Invalid products format' });
      }
    }

    const businessLogo = req.files?.businessLogo?.[0]?.path;
    const businessBanner = req.files?.businessBanner?.[0]?.path;
    console.log("Recieved Data :",req.body);
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
      return res.status(400).json({ error: 'Fill all the required fields including social media handles' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Handle product images
    const productImages = req.files?.productImages || [];

    // Map product images to products
    const productsWithImages = products.map((product, index) => ({
      ...product,
      image: productImages[index]?.path || null,
    }));

    const sponsor = new Sponsor({
      businessName,
      taxIdentificationNumber,
      description,
      contactName,
      role,
      preferredEvents,
      sponsorshipExpectations,
      products: productsWithImages,
      businessLogo,
      businessBanner,
      email,
      password: hashedPassword,
      socialMedia: {
        facebook,
        instagram,
        twitter
      }
    });

    await sponsor.save();

    const token = jwt.sign({ id: sponsor._id, role: 'sponsor' }, process.env.JWT_SECRET, { expiresIn: '24h' });

    res.status(201).json({
      message: 'Sponsor registered successfully',
      sponsor,
      token,
    });
  } catch (error) {
    console.error('Registration error:', error);
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

    // Validate required fields
    if (!venueName || !address || !gstInformation || !contactPhone || !email || !hasMenu || !menuProducts || !password) {
      return res.status(400).json({ error: 'Fill all the required fields' });
    }

    // Validate venue images
    if (!req.files?.venueImages || req.files.venueImages.length === 0) {
      return res.status(400).json({ error: 'At least one venue image is required' });
    }

    // Validate image file types
    const allowedImageTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    const venueImages = req.files.venueImages;
    const menuImages = req.files?.menuImages || [];

    // Validate venue images
    for (const image of venueImages) {
      if (!allowedImageTypes.includes(image.mimetype)) {
        return res.status(400).json({ error: 'Invalid image type. Only JPEG, PNG, and JPG are allowed' });
      }
    }

    // Validate menu images if they exist
    for (const image of menuImages) {
      if (!allowedImageTypes.includes(image.mimetype)) {
        return res.status(400).json({ error: 'Invalid menu image type. Only JPEG, PNG, and JPG are allowed' });
      }
    }

    // Limit maximum number of images
    const MAX_VENUE_IMAGES = 10;
    const MAX_MENU_IMAGES = 20;

    if (venueImages.length > MAX_VENUE_IMAGES) {
      return res.status(400).json({ error: `Maximum ${MAX_VENUE_IMAGES} venue images allowed` });
    }

    if (menuImages.length > MAX_MENU_IMAGES) {
      return res.status(400).json({ error: `Maximum ${MAX_MENU_IMAGES} menu images allowed` });
    }

    // Map images to their paths
    const venueImagePaths = venueImages.map(file => file.path);
    const menuImagePaths = menuImages.map(file => file.path);

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    let menuData = [];
    if (hasMenu === 'true' && menuProducts) {
      const parsedMenu = JSON.parse(menuProducts);
      parsedMenu.forEach((product, index) => {
        menuData.push({
          name: product.name,
          price: product.price,
          image: menuImagePaths[index] || null,
        });
      });
    }

    const newVenue = new VenueOwner({
      venueName,
      address,
      gstInformation,
      venueImages: venueImagePaths,
      contactPhone,
      email,
      website,
      hasMenu: hasMenu === 'true',
      menuProducts: menuData,
      password: hashedPassword,
    });

    await newVenue.save();

    // Generate JWT
    const token = jwt.sign({ id: newVenue._id, role: 'venueOwner' }, process.env.JWT_SECRET, { expiresIn: '24h' });

    res.status(201).json({ message: 'Venue owner registered', data: newVenue, token });
  } catch (error) {
    console.error('Error in registerVenueOwner:', error);
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
  
      // Check if the password matches using bcrypt
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
  
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

export const changeEmail = async (req, res) => {
  try {
    const { oldEmail, newEmail } = req.body;

    // Validate input
    if (!oldEmail || !newEmail) {
      return res.status(400).json({ message: 'Both old and new email are required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(oldEmail) || !emailRegex.test(newEmail)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    // Verify that the old email matches the current user's email
    if (req.user.email !== oldEmail) {
      return res.status(401).json({ message: 'Old email does not match current email' });
    }

    // Determine the model to query based on role
    let Model;
    switch (req.user.role) {
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

    // Check if new email already exists
    const existingUser = await Model.findOne({ email: newEmail });
    if (existingUser) {
      return res.status(400).json({ message: 'New email already in use' });
    }

    // Update email
    const updatedUser = await Model.findByIdAndUpdate(
      req.user._id,
      { email: newEmail },
      { new: true, runValidators: true }
    ).select('-password');

    // Generate new JWT token
    const token = jwt.sign(
      { id: updatedUser._id, role: req.user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(200).json({
      message: 'Email updated successfully',
      user: updatedUser,
      token
    });
  } catch (error) {
    console.error('Error in changeEmail:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    // Validate input
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ message: 'Both old and new password are required' });
    }

    // Validate new password strength (minimum 8 characters, at least one number and one letter)
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({ 
        message: 'New password must be at least 8 characters long and contain at least one letter and one number' 
      });
    }

    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    // Determine the model to query based on role
    let Model;
    switch (req.user.role) {
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

    // Verify old password
    const isPasswordValid = await bcrypt.compare(oldPassword, req.user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    const updatedUser = await Model.findByIdAndUpdate(
      req.user._id,
      { password: hashedPassword },
      { new: true, runValidators: true }
    ).select('-password');

    // Generate new JWT token
    const token = jwt.sign(
      { id: updatedUser._id, role: req.user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(200).json({
      message: 'Password updated successfully',
      user: updatedUser,
      token
    });
  } catch (error) {
    console.error('Error in changePassword:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const updateCuratorProfile = async (req, res) => {
  try {
    const { firstName, lastName, stageName, bio } = req.body;
    const images = req.files?.images?.map(file => file.path);

    // Check if user is authenticated and is a curator
    if (!req.user || req.user.role !== 'curator') {
      return res.status(401).json({ message: 'Not authorized to update curator profile' });
    }

    const updateData = {};
    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    if (stageName) updateData.stageName = stageName;
    if (bio) updateData.bio = bio;
    if (images && images.length > 0) {
      updateData.images = [...(req.user.images || []), ...images];
    }

    const updatedCurator = await Curator.findByIdAndUpdate(
      req.user._id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('-password');

    res.status(200).json({
      message: 'Curator profile updated successfully',
      curator: updatedCurator
    });
  } catch (error) {
    console.error('Error in updateCuratorProfile:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const updateSponsorProfile = async (req, res) => {
  try {
    const {
      businessName,
      description,
      contactName,
      role,
      preferredEvents,
      sponsorshipExpectations,
      facebook,
      instagram,
      twitter
    } = req.body;

    // Check if user is authenticated and is a sponsor
    if (!req.user || req.user.role !== 'sponsor') {
      return res.status(401).json({ message: 'Not authorized to update sponsor profile' });
    }

    const updateData = {};
    if (businessName) updateData.businessName = businessName;
    if (description) updateData.description = description;
    if (contactName) updateData.contactName = contactName;
    if (role) updateData.role = role;
    if (preferredEvents) updateData.preferredEvents = preferredEvents;
    if (sponsorshipExpectations) updateData.sponsorshipExpectations = sponsorshipExpectations;
    if (facebook || instagram || twitter) {
      updateData.socialMedia = {
        ...req.user.socialMedia,
        ...(facebook && { facebook }),
        ...(instagram && { instagram }),
        ...(twitter && { twitter })
      };
    }

    // Handle business logo and banner uploads
    if (req.files?.businessLogo?.[0]) {
      updateData.businessLogo = req.files.businessLogo[0].path;
    }
    if (req.files?.businessBanner?.[0]) {
      updateData.businessBanner = req.files.businessBanner[0].path;
    }

    const updatedSponsor = await Sponsor.findByIdAndUpdate(
      req.user._id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('-password');

    res.status(200).json({
      message: 'Sponsor profile updated successfully',
      sponsor: updatedSponsor
    });
  } catch (error) {
    console.error('Error in updateSponsorProfile:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const updateVenueOwnerProfile = async (req, res) => {
  try {
    const {
      venueName,
      address,
      gstInformation,
      contactPhone,
      website,
      hasMenu,
      about
    } = req.body;

    // Check if user is authenticated and is a venue owner
    if (!req.user || req.user.role !== 'venueOwner') {
      return res.status(401).json({ message: 'Not authorized to update venue owner profile' });
    }

    const updateData = {};
    if (venueName) updateData.venueName = venueName;
    if (address) updateData.address = address;
    if (gstInformation) updateData.gstInformation = gstInformation;
    if (contactPhone) updateData.contactPhone = contactPhone;
    if (website) updateData.website = website;
    if (hasMenu !== undefined) updateData.hasMenu = hasMenu === 'true';
    if (about) updateData.about = about;

    // Handle venue images
    if (req.files?.venueImages) {
      updateData.venueImage = req.files.venueImages.map(file => file.path);
    }

    // Handle menu products if hasMenu is true
    if (hasMenu === 'true' && req.body.menuProducts) {
      try {
        const menuProducts = JSON.parse(req.body.menuProducts);
        const menuImages = req.files?.menuImages || [];
        
        updateData.menuProducts = menuProducts.map((product, index) => ({
          name: product.name,
          price: product.price,
          image: menuImages[index]?.path || product.image
        }));
      } catch (error) {
        return res.status(400).json({ message: 'Invalid menu products format' });
      }
    }

    const updatedVenueOwner = await VenueOwner.findByIdAndUpdate(
      req.user._id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('-password');

    res.status(200).json({
      message: 'Venue owner profile updated successfully',
      venueOwner: updatedVenueOwner
    });
  } catch (error) {
    console.error('Error in updateVenueOwnerProfile:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const updateGuestProfile = async (req, res) => {
  try {
    const { firstName, lastName, stageName, bio } = req.body;

    // Check if user is authenticated and is a guest
    if (!req.user || req.user.role !== 'guest') {
      return res.status(401).json({ message: 'Not authorized to update guest profile' });
    }

    const updateData = {};
    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    if (stageName) updateData.stageName = stageName;
    if (bio) updateData.bio = bio;

    // Handle profile image and video uploads
    if (req.files?.image?.[0]) {
      updateData.image = req.files.image[0].path;
    }
    if (req.files?.video?.[0]) {
      updateData.video = req.files.video[0].path;
    }

    const updatedGuest = await Guest.findByIdAndUpdate(
      req.user._id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('-password');

    res.status(200).json({
      message: 'Guest profile updated successfully',
      guest: updatedGuest
    });
  } catch (error) {
    console.error('Error in updateGuestProfile:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
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