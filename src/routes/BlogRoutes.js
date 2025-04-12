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

const router = express.Router();

// Route to get all blog posts
router.get('/', getAllPosts);

// Route to get a single blog post by ID or slug
router.get('/:idOrSlug', getPost);

// Route to create a new blog post (admin only)
router.post('/', createPost);

// Route to update an existing blog post (admin or author only)
router.put('/:id', updatePost);

// Route to delete a blog post (admin or author only)
router.delete('/:id', deletePost);

// Route to like/unlike a blog post
router.post('/:id/like', likePost);

// Route to add a comment to a blog post
router.post('/:id/comments', addComment);

// Route to delete a comment from a blog post
router.delete('/:id/comments/:commentId', deleteComment);

// Route to get blog categories
router.get('/categories', getCategories);

// Route to get blog tags
router.get('/tags', getTags);

// Route to get related posts
router.get('/:id/related', getRelatedPosts);

// Route to search blog posts
router.get('/search', searchPosts);

export default router;