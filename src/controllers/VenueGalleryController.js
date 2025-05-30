import Venue from '../models/Venue.js';
import fs from 'fs/promises';
import path from 'path';

// Add photos to venue gallery
export const addPhotos = async (req, res) => {
  try {
    const { id } = req.params;
    const { captions } = req.body;

    // Check if venue exists and user is authorized
    const venue = await Venue.findById(id);
    if (!venue) {
      return res.status(404).json({ message: 'Venue not found' });
    }

    // Check if user is the venue owner or admin
    if (venue.owner.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to modify this venue' });
    }

    // Process uploaded photos
    const photos = req.files?.photos || [];
    const newPhotos = photos.map((photo, index) => ({
      url: photo.path,
      caption: captions?.[index] || '',
      order: venue.gallery.totalPhotos + index
    }));

    // Add new photos to gallery
    venue.gallery.photos.push(...newPhotos);
    await venue.save();

    res.json({
      message: 'Photos added successfully',
      gallery: venue.gallery
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Remove photos from venue gallery
export const removePhotos = async (req, res) => {
  try {
    const { id } = req.params;
    const { photoIds } = req.body;

    // Check if venue exists and user is authorized
    const venue = await Venue.findById(id);
    if (!venue) {
      return res.status(404).json({ message: 'Venue not found' });
    }

    // Check if user is the venue owner or admin
    if (venue.owner.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to modify this venue' });
    }

    // Get photos to remove
    const photosToRemove = venue.gallery.photos.filter(photo => 
      photoIds.includes(photo._id.toString())
    );

    // Delete photo files
    for (const photo of photosToRemove) {
      try {
        await fs.unlink(path.join(process.cwd(), photo.url));
      } catch (err) {
        console.error(`Error deleting file ${photo.url}:`, err);
      }
    }

    // Remove photos from gallery
    venue.gallery.photos = venue.gallery.photos.filter(photo => 
      !photoIds.includes(photo._id.toString())
    );

    // Reorder remaining photos
    venue.gallery.photos = venue.gallery.photos.map((photo, index) => ({
      ...photo.toObject(),
      order: index
    }));

    await venue.save();

    res.json({
      message: 'Photos removed successfully',
      gallery: venue.gallery
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update photo details (caption, order, featured status)
export const updatePhotoDetails = async (req, res) => {
  try {
    const { id, photoId } = req.params;
    const { caption, order, isFeatured } = req.body;

    // Check if venue exists and user is authorized
    const venue = await Venue.findById(id);
    if (!venue) {
      return res.status(404).json({ message: 'Venue not found' });
    }

    // Check if user is the venue owner or admin
    if (venue.owner.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to modify this venue' });
    }

    // Find the photo to update
    const photoIndex = venue.gallery.photos.findIndex(p => p._id.toString() === photoId);
    if (photoIndex === -1) {
      return res.status(404).json({ message: 'Photo not found' });
    }

    // If setting this photo as featured, unset others
    if (isFeatured) {
      venue.gallery.photos.forEach(photo => {
        photo.isFeatured = false;
      });
    }

    // Update photo details
    if (caption !== undefined) venue.gallery.photos[photoIndex].caption = caption;
    if (order !== undefined) venue.gallery.photos[photoIndex].order = order;
    if (isFeatured !== undefined) venue.gallery.photos[photoIndex].isFeatured = isFeatured;

    // Sort photos by order
    venue.gallery.photos.sort((a, b) => a.order - b.order);

    await venue.save();

    res.json({
      message: 'Photo details updated successfully',
      gallery: venue.gallery
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get venue gallery
export const getGallery = async (req, res) => {
  try {
    const { id } = req.params;

    const venue = await Venue.findById(id).select('gallery');
    if (!venue) {
      return res.status(404).json({ message: 'Venue not found' });
    }

    res.json({
      gallery: venue.gallery,
      featuredPhoto: venue.gallery.photos.find(photo => photo.isFeatured) || venue.gallery.photos[0]
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Reorder gallery photos
export const reorderPhotos = async (req, res) => {
  try {
    const { id } = req.params;
    const { photoOrders } = req.body; // Array of { photoId, newOrder }

    // Check if venue exists and user is authorized
    const venue = await Venue.findById(id);
    if (!venue) {
      return res.status(404).json({ message: 'Venue not found' });
    }

    // Check if user is the venue owner or admin
    if (venue.owner.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to modify this venue' });
    }

    // Update orders
    photoOrders.forEach(({ photoId, newOrder }) => {
      const photo = venue.gallery.photos.find(p => p._id.toString() === photoId);
      if (photo) {
        photo.order = newOrder;
      }
    });

    // Sort photos by new order
    venue.gallery.photos.sort((a, b) => a.order - b.order);

    await venue.save();

    res.json({
      message: 'Gallery reordered successfully',
      gallery: venue.gallery
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
}; 