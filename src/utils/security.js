// Security utilities for input validation and sanitization

/**
 * Sanitize input to prevent XSS attacks
 */
export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  
  // Remove potentially dangerous HTML tags and scripts
  const div = document.createElement('div');
  div.textContent = input;
  let sanitized = div.innerHTML;
  
  // Additional cleaning
  sanitized = sanitized
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .replace(/<script/gi, '')
    .replace(/<\/script>/gi, '')
    .replace(/<iframe/gi, '')
    .replace(/<object/gi, '')
    .replace(/<embed/gi, '');
  
  return sanitized.trim();
};

/**
 * Sanitize text input (removes HTML but keeps text)
 */
export const sanitizeText = (text) => {
  if (typeof text !== 'string') return text;
  
  const div = document.createElement('div');
  div.textContent = text;
  return div.textContent || div.innerText || '';
};

/**
 * Validate and sanitize URL
 */
export const sanitizeUrl = (url) => {
  if (!url || typeof url !== 'string') return url;
  
  try {
    const urlObj = new URL(url);
    
    // Block dangerous protocols
    // eslint-disable-next-line no-script-url
    const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:', 'about:'];
    const protocol = urlObj.protocol.toLowerCase().replace(':', '');
    
    if (dangerousProtocols.includes(protocol)) {
      throw new Error('Invalid protocol');
    }
    
    // Only allow http and https
    if (protocol !== 'http' && protocol !== 'https') {
      throw new Error('Only HTTP and HTTPS protocols are allowed');
    }
    
    return urlObj.toString();
  } catch (error) {
    return null; // Invalid URL
  }
};

/**
 * Validate email with additional security checks
 */
export const validateEmail = (email) => {
  if (!email || typeof email !== 'string') return false;
  
  // Basic email regex
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  
  // Check length
  if (email.length > 254) return false; // RFC 5321 limit
  
  // Check for dangerous characters
  if (/[<>"'`]/.test(email)) return false;
  
  // Check for multiple @ symbols
  const atCount = (email.match(/@/g) || []).length;
  if (atCount !== 1) return false;
  
  // Check domain
  const parts = email.split('@');
  if (parts.length !== 2) return false;
  
  const domain = parts[1];
  
  // Block suspicious domains
  const blockedDomains = ['localhost', '127.0.0.1', '0.0.0.0'];
  if (blockedDomains.some(blocked => domain.includes(blocked))) return false;
  
  return emailRegex.test(email);
};

/**
 * Validate phone number format
 */
export const validatePhone = (phone) => {
  if (!phone || (typeof phone === 'string' && phone.trim() === '')) return true; // Optional field
  
  if (typeof phone !== 'string') return false;

  // Remove common formatting characters
  const cleaned = phone.replace(/[\s\-()+.]/g, '');

  // Check if contains only digits and allowed characters
  if (!/^[\d\s\-()+.]+$/.test(phone)) return false;
  
  // Length validation (5-20 digits)
  const digitsOnly = cleaned.replace(/\D/g, '');
  if (digitsOnly.length < 5 || digitsOnly.length > 20) return false;
  
  return true;
};

/**
 * Validate text length
 */
export const validateLength = (text, minLength = 0, maxLength = Infinity) => {
  if (!text && minLength > 0) return false;
  if (text && typeof text === 'string') {
    const length = text.trim().length;
    return length >= minLength && length <= maxLength;
  }
  return false;
};

/**
 * Rate limiting using localStorage
 */
export const checkRateLimit = (action, maxAttempts = 5, windowMinutes = 15) => {
  const key = `rate_limit_${action}`;
  const now = Date.now();
  const windowMs = windowMinutes * 60 * 1000;
  
  try {
    const stored = localStorage.getItem(key);
    let attempts = [];
    
    if (stored) {
      attempts = JSON.parse(stored);
      // Remove old attempts outside the window
      attempts = attempts.filter(timestamp => now - timestamp < windowMs);
    }
    
    if (attempts.length >= maxAttempts) {
      const oldestAttempt = attempts[0];
      const timeRemaining = Math.ceil((windowMs - (now - oldestAttempt)) / 1000 / 60);
      return {
        allowed: false,
        timeRemaining: timeRemaining
      };
    }
    
    // Add current attempt
    attempts.push(now);
    localStorage.setItem(key, JSON.stringify(attempts));
    
    return { allowed: true };
  } catch (error) {
    // If localStorage fails, allow the action (graceful degradation)
    console.warn('Rate limiting check failed:', error);
    return { allowed: true };
  }
};

/**
 * Validate file type for logo upload
 */
export const validateFileType = (file, allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']) => {
  if (!file || !file.type) return false;
  return allowedTypes.includes(file.type.toLowerCase());
};

/**
 * Validate file size
 */
export const validateFileSize = (file, maxSizeMB = 2) => {
  if (!file) return false;
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return file.size <= maxSizeBytes;
};

/**
 * Sanitize entity name (prevent injection)
 */
export const sanitizeEntityName = (name) => {
  if (!name || typeof name !== 'string') return '';
  
  // Remove HTML tags
  let sanitized = sanitizeText(name);
  
  // Remove potentially dangerous characters but keep spaces and common punctuation
  sanitized = sanitized.replace(/[<>"'`{}[\]\\]/g, '');
  
  // Limit length
  sanitized = sanitized.substring(0, 100).trim();
  
  return sanitized;
};

/**
 * Sanitize description
 */
export const sanitizeDescription = (description) => {
  if (!description || typeof description !== 'string') return '';
  
  // Remove HTML but preserve line breaks
  let sanitized = sanitizeText(description);
  
  // Limit length
  sanitized = sanitized.substring(0, 2000).trim();
  
  return sanitized;
};

/**
 * Validate and sanitize all form data
 */
export const sanitizeFormData = (formData) => {
  const sanitized = {
    entityName: sanitizeEntityName(formData.entityName),
    description: sanitizeDescription(formData.description),
    email: formData.email ? sanitizeText(formData.email).toLowerCase().trim() : '',
    website: formData.website ? sanitizeUrl(formData.website) : '',
    phone: formData.phone ? sanitizeText(formData.phone).trim() : '',
    address: formData.address ? sanitizeText(formData.address).trim() : '',
    city: formData.city ? sanitizeText(formData.city).trim() : '',
    country: formData.country ? sanitizeText(formData.country).trim() : '',
    contactPersonName: formData.contactPersonName ? sanitizeText(formData.contactPersonName).trim() : '',
    contactPersonEmail: formData.contactPersonEmail ? sanitizeText(formData.contactPersonEmail).toLowerCase().trim() : '',
    contactPersonPhone: formData.contactPersonPhone ? sanitizeText(formData.contactPersonPhone).trim() : '',
    socialMedia: {},
    logo: formData.logo || null,
    customLinks: formData.customLinks || []
  };
  
  // Sanitize social media URLs
  if (formData.socialMedia) {
    Object.keys(formData.socialMedia).forEach((platform) => {
      const url = formData.socialMedia[platform];
      if (url) {
        const sanitizedUrl = sanitizeUrl(url);
        if (sanitizedUrl) {
          sanitized.socialMedia[platform] = sanitizedUrl;
        }
      }
    });
  }
  
  // Sanitize custom links
  if (formData.customLinks && Array.isArray(formData.customLinks)) {
    sanitized.customLinks = formData.customLinks.map((link) => ({
      name: link.name ? sanitizeText(link.name).trim() : '',
      icon: link.icon || null, // Keep icon as-is (data URL or null)
      link: link.link ? sanitizeUrl(link.link) : ''
    }));
  }
  
  return sanitized;
};

