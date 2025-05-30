import express from 'express';
import {
  getAllPosts,
  getPost,
  createPost,
  updatePost,
  deletePost,
  likePost,
  addComment,
  deleteComment,
  getCategories,
  getTags,
  getRelatedPosts,
  searchPosts
} from '../controllers/BlogController.js';
import { protect } from '../middleware/auth.js';
import { blogUpload, handleUploadError } from '../middleware/upload.js';

const router = express.Router();

// Route to get all blog posts
router.get('/', getAllPosts);

// Specific routes should come before parameterized routes
router.get('/categories', getCategories);
router.get('/tags', getTags);
router.get('/search', searchPosts);

// Parameterized routes
router.get('/:idOrSlug', getPost);
router.get('/:id/related', getRelatedPosts);

// Protected routes with file upload handling
router.post('/', protect, blogUpload, handleUploadError, createPost);
router.put('/:id', protect, blogUpload, handleUploadError, updatePost);
router.delete('/:id', protect, deletePost);
router.post('/:id/like', protect, likePost);
router.post('/:id/comments', protect, addComment);
router.delete('/:id/comments/:commentId', protect, deleteComment);

export default router;