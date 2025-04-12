// src/utils/validators.js

/**
 * Comprehensive validation utility functions for form and data validation
 */

// Email validation using regex pattern
const isValidEmail = (email) => {
    const emailRegex = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return emailRegex.test(String(email).toLowerCase());
  };
  
  // Password strength validation
  // Requires at least 8 characters, one uppercase letter, one lowercase letter, one number, and one special character
  const isStrongPassword = (password) => {
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&_\-#])[A-Za-z\d@$!%*?&_\-#]{8,}$/;
    return passwordRegex.test(password);
  };
  
  // URL validation
  const isValidUrl = (url) => {
    try {
      new URL(url);
      return true;
    } catch (error) {
      return false;
    }
  };
  
  // Phone number validation (supports various formats)
  const isValidPhoneNumber = (phoneNumber) => {
    // This regex supports formats like: (123) 456-7890, 123-456-7890, 123.456.7890, 1234567890
    const phoneRegex = /^(\+\d{1,3}[-\s]?)?\(?(\d{3})\)?[-.\s]?(\d{3})[-.\s]?(\d{4})$/;
    return phoneRegex.test(phoneNumber);
  };
  
  // Date validation (checks if date is valid and optionally in the future/past)
  const isValidDate = (dateString, options = { future: false, past: false }) => {
    // Check if it's a valid date
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return false;
    }
    
    const now = new Date();
    
    // Check if date is in the future when required
    if (options.future && date <= now) {
      return false;
    }
    
    // Check if date is in the past when required
    if (options.past && date >= now) {
      return false;
    }
    
    return true;
  };
  
  // Username validation (alphanumeric, underscores, hyphens, 3-30 characters)
  const isValidUsername = (username) => {
    const usernameRegex = /^[a-zA-Z0-9_-]{3,30}$/;
    return usernameRegex.test(username);
  };
  
  // Credit card validation using Luhn algorithm
  const isValidCreditCard = (cardNumber) => {
    // Remove spaces and dashes
    cardNumber = cardNumber.replace(/[\s-]/g, '');
    
    // Check if contains only digits
    if (!/^\d+$/.test(cardNumber)) {
      return false;
    }
    
    // Luhn algorithm implementation
    let sum = 0;
    let shouldDouble = false;
    
    // Loop through values starting from the rightmost digit
    for (let i = cardNumber.length - 1; i >= 0; i--) {
      let digit = parseInt(cardNumber.charAt(i));
      
      if (shouldDouble) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }
      
      sum += digit;
      shouldDouble = !shouldDouble;
    }
    
    return (sum % 10) === 0;
  };
  
  // ZIP/Postal code validation (US format)
  const isValidUSZipCode = (zipCode) => {
    const zipRegex = /^\d{5}(-\d{4})?$/;
    return zipRegex.test(zipCode);
  };
  
  // Social Security Number validation (US format)
  const isValidSSN = (ssn) => {
    // Format: XXX-XX-XXXX or XXXXXXXXX
    const ssnRegex = /^(?:\d{3}-\d{2}-\d{4}|\d{9})$/;
    return ssnRegex.test(ssn);
  };
  
  // IPv4 address validation
  const isValidIPv4 = (ip) => {
    const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    if (!ipv4Regex.test(ip)) {
      return false;
    }
    
    // Check each octet is in range 0-255
    const octets = ip.split('.');
    for (let i = 0; i < octets.length; i++) {
      const octet = parseInt(octets[i]);
      if (octet < 0 || octet > 255) {
        return false;
      }
    }
    
    return true;
  };
  
  // File type validation
  const isAllowedFileType = (filename, allowedTypes) => {
    // Get file extension
    const extension = filename.split('.').pop().toLowerCase();
    return allowedTypes.includes(extension);
  };
  
  // File size validation (in bytes)
  const isAllowedFileSize = (fileSize, maxSizeBytes) => {
    return fileSize <= maxSizeBytes;
  };
  
  // Color hex validation
  const isValidHexColor = (color) => {
    const hexColorRegex = /^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6})$/;
    return hexColorRegex.test(color);
  };
  
  // Age validation (checks if age is at least minAge)
  const isMinimumAge = (birthdate, minAge) => {
    const birthDate = new Date(birthdate);
    if (isNaN(birthDate.getTime())) {
      return false;
    }
    
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age >= minAge;
  };
  
  // Object ID validation (for MongoDB)
  const isValidObjectId = (id) => {
    const objectIdRegex = /^[0-9a-fA-F]{24}$/;
    return objectIdRegex.test(id);
  };
  
  // String length validation
  const isValidLength = (str, options = { min: 0, max: Infinity }) => {
    const length = str.length;
    return length >= options.min && length <= options.max;
  };
  
  // Number range validation
  const isInRange = (num, min, max) => {
    return num >= min && num <= max;
  };
  
  // Alpha validation (letters only)
  const isAlpha = (str) => {
    const alphaRegex = /^[a-zA-Z]+$/;
    return alphaRegex.test(str);
  };
  
  // Alphanumeric validation (letters and numbers only)
  const isAlphanumeric = (str) => {
    const alphanumericRegex = /^[a-zA-Z0-9]+$/;
    return alphanumericRegex.test(str);
  };
  
  // Form input validation for required fields
  const validateRequired = (formData, requiredFields) => {
    const errors = {};
    
    requiredFields.forEach(field => {
      if (!formData[field] || (typeof formData[field] === 'string' && formData[field].trim() === '')) {
        errors[field] = `${field} is required`;
      }
    });
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  };
  
  // Validate matches (for password confirmation, etc.)
  const validateMatches = (value1, value2, fieldName = 'confirmation') => {
    return value1 === value2 ? { isValid: true } : { isValid: false, error: `${fieldName} does not match` };
  };
  
  // Validate form data with custom rules
  const validateForm = (formData, validationRules) => {
    const errors = {};
    
    Object.keys(validationRules).forEach(field => {
      const value = formData[field];
      const rules = validationRules[field];
      
      // Check required
      if (rules.required && (!value || (typeof value === 'string' && value.trim() === ''))) {
        errors[field] = rules.message || `${field} is required`;
        return;
      }
      
      // Skip other validations if field is empty and not required
      if (!value && !rules.required) {
        return;
      }
      
      // Check minLength
      if (rules.minLength && String(value).length < rules.minLength) {
        errors[field] = rules.message || `${field} must be at least ${rules.minLength} characters`;
        return;
      }
      
      // Check maxLength
      if (rules.maxLength && String(value).length > rules.maxLength) {
        errors[field] = rules.message || `${field} must be no more than ${rules.maxLength} characters`;
        return;
      }
      
      // Check pattern
      if (rules.pattern && !rules.pattern.test(String(value))) {
        errors[field] = rules.message || `${field} is invalid`;
        return;
      }
      
      // Check min value for numbers
      if (rules.min !== undefined && Number(value) < rules.min) {
        errors[field] = rules.message || `${field} must be at least ${rules.min}`;
        return;
      }
      
      // Check max value for numbers
      if (rules.max !== undefined && Number(value) > rules.max) {
        errors[field] = rules.message || `${field} must be no more than ${rules.max}`;
        return;
      }
      
      // Check custom validator function
      if (rules.validator && typeof rules.validator === 'function') {
        const isValid = rules.validator(value, formData);
        if (!isValid) {
          errors[field] = rules.message || `${field} is invalid`;
          return;
        }
      }
    });
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  };
  
  // Comprehensive user registration validation
  const validateUserRegistration = (userData) => {
    const errors = {};
    
    // Validate first name
    if (!userData.firstName || userData.firstName.trim() === '') {
      errors.firstName = 'First name is required';
    } else if (userData.firstName.length < 2 || userData.firstName.length > 50) {
      errors.firstName = 'First name must be between 2 and 50 characters';
    }
    
    // Validate last name
    if (!userData.lastName || userData.lastName.trim() === '') {
      errors.lastName = 'Last name is required';
    } else if (userData.lastName.length < 2 || userData.lastName.length > 50) {
      errors.lastName = 'Last name must be between 2 and 50 characters';
    }
    
    // Validate email
    if (!userData.email || userData.email.trim() === '') {
      errors.email = 'Email is required';
    } else if (!isValidEmail(userData.email)) {
      errors.email = 'Please enter a valid email address';
    }
    
    // Validate password
    if (!userData.password || userData.password.trim() === '') {
      errors.password = 'Password is required';
    } else if (!isStrongPassword(userData.password)) {
      errors.password = 'Password must be at least 8 characters and include uppercase, lowercase, number, and special character';
    }
    
    // Validate password confirmation
    if (userData.password !== userData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
    
    // Optional: Validate username if provided
    if (userData.username) {
      if (!isValidUsername(userData.username)) {
        errors.username = 'Username must be 3-30 characters and may include letters, numbers, underscore, and hyphen';
      }
    }
    
    // Optional: Validate phone number if provided
    if (userData.phoneNumber && !isValidPhoneNumber(userData.phoneNumber)) {
      errors.phoneNumber = 'Please enter a valid phone number';
    }
    
    // Optional: Validate age if birthdate is provided
    if (userData.birthdate && !isMinimumAge(userData.birthdate, 13)) {
      errors.birthdate = 'You must be at least 13 years old to register';
    }
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  };
  
  // Address validation
  const validateAddress = (addressData) => {
    const errors = {};
    
    // Validate street address
    if (!addressData.street || addressData.street.trim() === '') {
      errors.street = 'Street address is required';
    }
    
    // Validate city
    if (!addressData.city || addressData.city.trim() === '') {
      errors.city = 'City is required';
    }
    
    // Validate state/province
    if (!addressData.state || addressData.state.trim() === '') {
      errors.state = 'State/Province is required';
    }
    
    // Validate postal/zip code
    if (!addressData.postalCode || addressData.postalCode.trim() === '') {
      errors.postalCode = 'Postal/ZIP code is required';
    } else if (addressData.country === 'US' && !isValidUSZipCode(addressData.postalCode)) {
      errors.postalCode = 'Please enter a valid US ZIP code';
    }
    
    // Validate country
    if (!addressData.country || addressData.country.trim() === '') {
      errors.country = 'Country is required';
    }
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  };
  
  // Payment method validation
  const validatePaymentMethod = (paymentData) => {
    const errors = {};
    
    // Validate card number
    if (!paymentData.cardNumber || paymentData.cardNumber.trim() === '') {
      errors.cardNumber = 'Card number is required';
    } else if (!isValidCreditCard(paymentData.cardNumber)) {
      errors.cardNumber = 'Please enter a valid card number';
    }
    
    // Validate card holder name
    if (!paymentData.cardHolderName || paymentData.cardHolderName.trim() === '') {
      errors.cardHolderName = 'Card holder name is required';
    }
    
    // Validate expiration date
    if (!paymentData.expirationDate || paymentData.expirationDate.trim() === '') {
      errors.expirationDate = 'Expiration date is required';
    } else {
      // Check if expiration date is in the future
      const [month, year] = paymentData.expirationDate.split('/');
      const expiryDate = new Date(2000 + parseInt(year), parseInt(month) - 1, 1);
      const today = new Date();
      if (expiryDate < today) {
        errors.expirationDate = 'Card has expired';
      }
    }
    
    // Validate CVV
    if (!paymentData.cvv || paymentData.cvv.trim() === '') {
      errors.cvv = 'CVV is required';
    } else if (!/^\d{3,4}$/.test(paymentData.cvv)) {
      errors.cvv = 'CVV must be 3 or 4 digits';
    }
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  };
  
  // Product validation
  const validateProduct = (productData) => {
    const errors = {};
    
    // Validate product name
    if (!productData.name || productData.name.trim() === '') {
      errors.name = 'Product name is required';
    } else if (productData.name.length < 3 || productData.name.length > 100) {
      errors.name = 'Product name must be between 3 and 100 characters';
    }
    
    // Validate product description
    if (!productData.description || productData.description.trim() === '') {
      errors.description = 'Product description is required';
    } else if (productData.description.length < 10 || productData.description.length > 1000) {
      errors.description = 'Product description must be between 10 and 1000 characters';
    }
    
    // Validate product price
    if (productData.price === undefined || productData.price === null) {
      errors.price = 'Product price is required';
    } else if (isNaN(productData.price) || parseFloat(productData.price) < 0) {
      errors.price = 'Product price must be a positive number';
    }
    
    // Validate product quantity/inventory
    if (productData.quantity !== undefined) {
      if (isNaN(productData.quantity) || parseInt(productData.quantity) < 0) {
        errors.quantity = 'Product quantity must be a non-negative number';
      }
    }
    
    // Validate product category
    if (!productData.category || productData.category.trim() === '') {
      errors.category = 'Product category is required';
    }
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  };
  
  // Contact form validation
  const validateContactForm = (contactData) => {
    const errors = {};
    
    // Validate name
    if (!contactData.name || contactData.name.trim() === '') {
      errors.name = 'Name is required';
    } else if (contactData.name.length < 2 || contactData.name.length > 100) {
      errors.name = 'Name must be between 2 and 100 characters';
    }
    
    // Validate email
    if (!contactData.email || contactData.email.trim() === '') {
      errors.email = 'Email is required';
    } else if (!isValidEmail(contactData.email)) {
      errors.email = 'Please enter a valid email address';
    }
    
    // Validate subject
    if (!contactData.subject || contactData.subject.trim() === '') {
      errors.subject = 'Subject is required';
    } else if (contactData.subject.length < 5 || contactData.subject.length > 100) {
      errors.subject = 'Subject must be between 5 and 100 characters';
    }
    
    // Validate message
    if (!contactData.message || contactData.message.trim() === '') {
      errors.message = 'Message is required';
    } else if (contactData.message.length < 10 || contactData.message.length > 1000) {
      errors.message = 'Message must be between 10 and 1000 characters';
    }
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  };
  
  // Export all validation functions
  module.exports = {
    // Basic validators
    isValidEmail,
    isStrongPassword,
    isValidUrl,
    isValidPhoneNumber,
    isValidDate,
    isValidUsername,
    isValidCreditCard,
    isValidUSZipCode,
    isValidSSN,
    isValidIPv4,
    isAllowedFileType,
    isAllowedFileSize,
    isValidHexColor,
    isMinimumAge,
    isValidObjectId,
    isValidLength,
    isInRange,
    isAlpha,
    isAlphanumeric,
    
    // Form validators
    validateRequired,
    validateMatches,
    validateForm,
    
    // Complex validators
    validateUserRegistration,
    validateAddress,
    validatePaymentMethod,
    validateProduct,
    validateContactForm
  };