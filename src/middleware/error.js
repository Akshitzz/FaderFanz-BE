
/**
 * Global error handler for all Express routes
 * Formats errors consistently and handles different types of errors
 */
const errorHandler = (err, req, res, next) => {
    // Log error for debugging
    console.error('Error:', err);
    
    // Default error structure
    let error = {
      success: false,
      message: err.message || 'Server Error',
      errors: err.errors || null,
      stack: process.env.NODE_ENV === 'development' ? err.stack : null
    };
  
    // MongoDB Bad ObjectId error
    if (err.name === 'CastError') {
      error.message = `Resource not found with id of ${err.value}`;
      error.statusCode = 404;
    }
  
    // MongoDB Duplicate key error
    if (err.code === 11000) {
      error.message = `Duplicate field value entered: ${Object.keys(err.keyValue).join(
        ', '
      )}`;
      error.statusCode = 400;
    }
  
    // Mongoose validation error
    if (err.name === 'ValidationError') {
      error.message = Object.values(err.errors)
        .map(val => val.message)
        .join(', ');
      error.statusCode = 400;
    }
  
    // JWT errors
    if (err.name === 'JsonWebTokenError') {
      error.message = 'Invalid token';
      error.statusCode = 401;
    }
  
    if (err.name === 'TokenExpiredError') {
      error.message = 'Token expired';
      error.statusCode = 401;
    }
  
    // Send response with appropriate status code
    res.status(err.statusCode || error.statusCode || 500).json(error);
  };
  
  export default errorHandler;