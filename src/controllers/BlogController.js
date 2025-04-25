
import { validationResult } from 'express-validator';
import BlogPost from '../models/BlogPost.js';
import fs from 'fs';
import path from 'path';

/**
 * Get all blog posts with pagination
 */
export const getAllPosts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Filter options
    const filters = {};
    
    // Apply category filter if provided
    if (req.query.category) {
      filters.category = req.query.category;
    }
    
    // Apply tag filter if provided
    if (req.query.tag) {
      filters.tags = { $in: [req.query.tag] };
    }
    
    const posts = await BlogPost.find(filters)
      .populate('author', 'firstName lastName username profileImage')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });
      
    const total = await BlogPost.countDocuments(filters);
    
    res.status(200).json({
      success: true,
      data: posts,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching blog posts:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching blog posts',
      error: error.message
    });
  }
};

/**
 * Get a single blog post by ID or slug
 */
export const getPost = async (req, res) => {
  try {
    let post;
    const idOrSlug = req.params.idOrSlug;
    
    // Check if the parameter is an ObjectId or a slug
    if (idOrSlug.match(/^[0-9a-fA-F]{24}$/)) {
      // It's an ObjectId, find by ID
      post = await BlogPost.findById(idOrSlug)
        .populate('author', 'firstName lastName username profileImage')
        .populate('relatedEvents', 'title description imageUrl date');
    } else {
      // It's a slug, find by slug
      post = await BlogPost.findOne({ slug: idOrSlug })
        .populate('author', 'firstName lastName username profileImage')
        .populate('relatedEvents', 'title description imageUrl date');
    }
    
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Blog post not found'
      });
    }
    
    // Increment view count
    post.views += 1;
    await post.save();
    
    res.status(200).json({
      success: true,
      data: post
    });
  } catch (error) {
    console.error('Error fetching blog post:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching blog post',
      error: error.message
    });
  }
};

/**
 * Create a new blog post
 * Admin only
 */
export const createPost = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }
  
  // Debugging: Log the user object
  console.log('User from req.user:', req.user);
  try {
    // Handle featured image upload
    let featuredImage = null;
    if (req.file) {
      featuredImage = `/uploads/blog/${req.file.filename}`;
    }
    
    const {
      title,
      content,
      excerpt,
      category,
      tags,
      relatedEvents,
      status
    } = req.body;
    
    // Create a slug from the title
    const slug = title
      .toLowerCase()
      .replace(/[^\w\s]/gi, '')
      .replace(/\s+/g, '-');
    
    // Parse tags if they come as a string
    let parsedTags = tags;
    if (typeof tags === 'string') {
      parsedTags = tags.split(',').map(tag => tag.trim());
    }
    
    // Parse related events if they come as a string
    let parsedEvents = relatedEvents;
    if (typeof relatedEvents === 'string' && relatedEvents.length > 0) {
      parsedEvents = relatedEvents.split(',').map(event => event.trim());
    }
    
    const newPost = new BlogPost({
      title,
      slug,
      content,
      excerpt: excerpt || title.substring(0, 150) + '...',
      featuredImage,
      author: req.user.id, // Assuming req.user is set by auth middleware
      category,
      tags: parsedTags,
      relatedEvents: parsedEvents,
      status: status || 'published',
      views: 0
    });
    
    const savedPost = await newPost.save();
    
    res.status(201).json({
      success: true,
      data: savedPost,
      message: 'Blog post created successfully'
    });
  } catch (error) {
    console.error('Error creating blog post:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating blog post',
      error: error.message
    });
  }
};

/**
 * Update an existing blog post
 * Admin only or original author
 */
export const updatePost = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }
  
  try {
    let post = await BlogPost.findById(req.params.id);
    
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Blog post not found'
      });
    }
    
    // Check if user is authorized (admin or original author)
    if (post.author.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this post'
      });
    }
    
    const {
      title,
      content,
      excerpt,
      category,
      tags,
      relatedEvents,
      status
    } = req.body;
    
    // Handle featured image upload if there's a new one
    let featuredImage = post.featuredImage;
    if (req.file) {
      // Delete old image if exists
      if (post.featuredImage) {
        const oldImagePath = path.join(__dirname, '../../', post.featuredImage);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
      featuredImage = `/uploads/blog/${req.file.filename}`;
    }
    
    // Update slug only if title is changed
    let slug = post.slug;
    if (title && title !== post.title) {
      slug = title
        .toLowerCase()
        .replace(/[^\w\s]/gi, '')
        .replace(/\s+/g, '-');
    }
    
    // Parse tags if they come as a string
    let parsedTags = tags;
    if (typeof tags === 'string') {
      parsedTags = tags.split(',').map(tag => tag.trim());
    }
    
    // Parse related events if they come as a string
    let parsedEvents = relatedEvents;
    if (typeof relatedEvents === 'string' && relatedEvents.length > 0) {
      parsedEvents = relatedEvents.split(',').map(event => event.trim());
    }
    
    post = await BlogPost.findByIdAndUpdate(
      req.params.id,
      {
        title: title || post.title,
        slug,
        content: content || post.content,
        excerpt: excerpt || (title ? title.substring(0, 150) + '...' : post.excerpt),
        featuredImage,
        category: category || post.category,
        tags: parsedTags || post.tags,
        relatedEvents: parsedEvents || post.relatedEvents,
        status: status || post.status,
        updatedAt: Date.now()
      },
      { new: true }
    );
    
    res.status(200).json({
      success: true,
      data: post,
      message: 'Blog post updated successfully'
    });
  } catch (error) {
    console.error('Error updating blog post:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating blog post',
      error: error.message
    });
  }
};

/**
 * Delete a blog post
 * Admin only or original author
 */
export const deletePost = async (req, res) => {
  try {
    const post = await BlogPost.findById(req.params.id);
    
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Blog post not found'
      });
    }
    
    // Check if user is authorized (admin or original author)
    if (post.author.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this post'
      });
    }
    
    // Delete featured image if exists
    if (post.featuredImage) {
      const imagePath = path.join(__dirname, '../../', post.featuredImage);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }
    
    await BlogPost.findByIdAndDelete(req.params.id);
    
    res.status(200).json({
      success: true,
      message: 'Blog post deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting blog post:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting blog post',
      error: error.message
    });
  }
};

/**
 * Like a blog post
 */
export const likePost = async (req, res) => {
  try {
    const post = await BlogPost.findById(req.params.id);
    
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Blog post not found'
      });
    }
    
    // Check if the post has already been liked by this user
    const likedIndex = post.likes.findIndex(like => 
      like.user.toString() === req.user.id
    );
    
    if (likedIndex !== -1) {
      // User has already liked this post, so remove the like
      post.likes.splice(likedIndex, 1);
    } else {
      // Add the like
      post.likes.push({ user: req.user.id });
    }
    
    await post.save();
    
    res.status(200).json({
      success: true,
      likes: post.likes.length,
      message: likedIndex !== -1 ? 'Post unliked' : 'Post liked'
    });
  } catch (error) {
    console.error('Error liking blog post:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while liking blog post',
      error: error.message
    });
  }
};

/**
 * Add a comment to a blog post
 */
export const addComment = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }
  
  try {
    const post = await BlogPost.findById(req.params.id);
    
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Blog post not found'
      });
    }
    
    const { content } = req.body;
    
    const newComment = {
      user: req.user.id,
      content,
      name: `${req.user.firstName} ${req.user.lastName}`
    };
    
    post.comments.unshift(newComment);
    
    await post.save();
    
    res.status(201).json({
      success: true,
      data: post.comments,
      message: 'Comment added successfully'
    });
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while adding comment',
      error: error.message
    });
  }
};

/**
 * Delete a comment from a blog post
 */
export const deleteComment = async (req, res) => {
  try {
    const post = await BlogPost.findById(req.params.id);
    
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Blog post not found'
      });
    }
    
    // Find the comment
    const comment = post.comments.find(
      comment => comment._id.toString() === req.params.commentId
    );
    
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }
    
    // Check if user is authorized (admin, comment author, or post author)
    if (
      comment.user.toString() !== req.user.id &&
      post.author.toString() !== req.user.id &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this comment'
      });
    }
    
    // Find comment index
    const commentIndex = post.comments.findIndex(
      comment => comment._id.toString() === req.params.commentId
    );
    
    // Remove the comment
    post.comments.splice(commentIndex, 1);
    
    await post.save();
    
    res.status(200).json({
      success: true,
      data: post.comments,
      message: 'Comment deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting comment',
      error: error.message
    });
  }
};

/**
 * Get blog categories
 */
export const getCategories = async (req, res) => {
  try {
    // Aggregate unique categories and count posts per category
    const categories = await BlogPost.aggregate([
      { $match: { status: 'published' } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    res.status(200).json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching categories',
      error: error.message
    });
  }
};

/**
 * Get blog tags
 */
export const getTags = async (req, res) => {
  try {
    // Aggregate unique tags and count posts per tag
    const tags = await BlogPost.aggregate([
      { $match: { status: 'published' } },
      { $unwind: '$tags' },
      { $group: { _id: '$tags', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    res.status(200).json({
      success: true,
      data: tags
    });
  } catch (error) {
    console.error('Error fetching tags:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching tags',
      error: error.message
    });
  }
};

/**
 * Get related posts based on category and tags
 */
export const getRelatedPosts = async (req, res) => {
  try {
    const post = await BlogPost.findById(req.params.id);
    
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Blog post not found'
      });
    }
    
    // Find posts with same category or tags, excluding current post
    const relatedPosts = await BlogPost.find({
      _id: { $ne: post._id },
      status: 'published',
      $or: [
        { category: post.category },
        { tags: { $in: post.tags } }
      ]
    })
      .populate('author', 'firstName lastName username profileImage')
      .limit(3)
      .sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      data: relatedPosts
    });
  } catch (error) {
    console.error('Error fetching related posts:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching related posts',
      error: error.message
    });
  }
};

/**
 * Search blog posts
 */
export const searchPosts = async (req, res) => {
  try {
    const searchTerm = req.query.q;
    
    if (!searchTerm) {
      return res.status(400).json({
        success: false,
        message: 'Search term is required'
      });
    }
    
    const posts = await BlogPost.find({
      status: 'published',
      $or: [
        { title: { $regex: searchTerm, $options: 'i' } },
        { content: { $regex: searchTerm, $options: 'i' } },
        { excerpt: { $regex: searchTerm, $options: 'i' } },
        { tags: { $in: [new RegExp(searchTerm, 'i')] } }
      ]
    })
      .populate('author', 'firstName lastName username profileImage')
      .limit(10)
      .sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      data: posts
    });
  } catch (error) {
    console.error('Error searching blog posts:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while searching blog posts',
      error: error.message
    });
  }
};