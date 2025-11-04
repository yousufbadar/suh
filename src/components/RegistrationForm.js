import React, { useState, useEffect, useMemo } from 'react';
import './RegistrationForm.css';
import { createClient } from '@/lib/supabase/client';
import {
  sanitizeText,
  sanitizeUrl,
  validateEmail,
  validatePhone,
  validateLength,
  checkRateLimit,
  validateFileType,
  validateFileSize,
  sanitizeFormData
} from '../utils/security';
import {
  FaFacebook,
  FaTwitter,
  FaInstagram,
  FaLinkedin,
  FaYoutube,
  FaPinterest,
  FaSnapchat,
  FaTiktok,
  FaReddit,
  FaGithub,
  FaDribbble,
  FaBehance,
  FaTelegram,
  FaWhatsapp,
  FaDiscord,
  FaTwitch,
  FaVimeo,
  FaFlickr,
  FaImage,
  FaTimes,
} from 'react-icons/fa';

const socialMediaPlatforms = [
  { name: 'Facebook', icon: FaFacebook, color: '#1877f2', defaultDomain: 'https://facebook.com/', placeholder: 'https://facebook.com/yourpage' },
  { name: 'Twitter', icon: FaTwitter, color: '#1da1f2', defaultDomain: 'https://twitter.com/', placeholder: 'https://twitter.com/yourhandle' },
  { name: 'Instagram', icon: FaInstagram, color: '#e4405f', defaultDomain: 'https://instagram.com/', placeholder: 'https://instagram.com/yourprofile' },
  { name: 'LinkedIn', icon: FaLinkedin, color: '#0077b5', defaultDomain: 'https://linkedin.com/', placeholder: 'https://linkedin.com/company/yourcompany' },
  { name: 'YouTube', icon: FaYoutube, color: '#ff0000', defaultDomain: 'https://youtube.com/', placeholder: 'https://youtube.com/yourchannel' },
  { name: 'Pinterest', icon: FaPinterest, color: '#bd081c', defaultDomain: 'https://pinterest.com/', placeholder: 'https://pinterest.com/yourprofile' },
  { name: 'Snapchat', icon: FaSnapchat, color: '#fffc00', defaultDomain: 'https://snapchat.com/add/', placeholder: 'https://snapchat.com/add/yourusername' },
  { name: 'TikTok', icon: FaTiktok, color: '#000000', defaultDomain: 'https://tiktok.com/@', placeholder: 'https://tiktok.com/@yourhandle' },
  { name: 'Reddit', icon: FaReddit, color: '#ff4500', defaultDomain: 'https://reddit.com/user/', placeholder: 'https://reddit.com/user/yourusername' },
  { name: 'GitHub', icon: FaGithub, color: '#181717', defaultDomain: 'https://github.com/', placeholder: 'https://github.com/yourusername' },
  { name: 'Dribbble', icon: FaDribbble, color: '#ea4c89', defaultDomain: 'https://dribbble.com/', placeholder: 'https://dribbble.com/yourprofile' },
  { name: 'Behance', icon: FaBehance, color: '#1769ff', defaultDomain: 'https://behance.net/', placeholder: 'https://behance.net/yourprofile' },
  { name: 'Telegram', icon: FaTelegram, color: '#0088cc', defaultDomain: 'https://t.me/', placeholder: 'https://t.me/yourchannel' },
  { name: 'WhatsApp', icon: FaWhatsapp, color: '#25d366', defaultDomain: 'https://wa.me/', placeholder: 'https://wa.me/yournumber' },
  { name: 'Discord', icon: FaDiscord, color: '#5865f2', defaultDomain: 'https://discord.gg/', placeholder: 'https://discord.gg/yourserver' },
  { name: 'Twitch', icon: FaTwitch, color: '#9146ff', defaultDomain: 'https://twitch.tv/', placeholder: 'https://twitch.tv/yourchannel' },
  { name: 'Vimeo', icon: FaVimeo, color: '#1ab7ea', defaultDomain: 'https://vimeo.com/', placeholder: 'https://vimeo.com/yourprofile' },
  { name: 'Flickr', icon: FaFlickr, color: '#ff0084', defaultDomain: 'https://flickr.com/photos/', placeholder: 'https://flickr.com/photos/yourprofile' },
];

// Initialize default social media URLs
const getInitialSocialMedia = () => {
  const initialSocial = {};
  socialMediaPlatforms.forEach((platform) => {
    initialSocial[platform.name.toLowerCase()] = platform.defaultDomain;
  });
  return initialSocial;
};

function RegistrationForm({ entity, onSave, onCancel }) {
  // Memoize initial form data based on entity
  const initialFormData = useMemo(() => {
    if (entity) {
      // Load entity data for editing - restore default domains for social media
      const socialMedia = { ...getInitialSocialMedia(), ...(entity.social_media || {}) };
      return {
        entityName: entity.entity_name || '',
        description: entity.description || '',
        email: entity.email || '',
        website: entity.website || '',
        phone: entity.phone || '',
        address: entity.address || '',
        city: entity.city || '',
        country: entity.country || '',
        socialMedia: socialMedia,
        logo: entity.logo_url || null,
      };
    }
    return {
      entityName: '',
      description: '',
      email: '',
      website: '',
      phone: '',
      address: '',
      city: '',
      country: '',
      socialMedia: getInitialSocialMedia(),
      logo: null,
    };
  }, [entity]);

  const [formData, setFormData] = useState(initialFormData);
  const [initialData, setInitialData] = useState(() => JSON.stringify(initialFormData));
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [logoPreview, setLogoPreview] = useState(entity?.logo_url || null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createClient();

  // Update form when entity prop changes
  useEffect(() => {
    setFormData(initialFormData);
    setInitialData(JSON.stringify(initialFormData));
    setLogoPreview(entity?.logo_url || null);
  }, [initialFormData, entity]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // Apply length limits based on field
    let sanitizedValue = value;
    const maxLengths = {
      entityName: 100,
      email: 254,
      website: 500,
      phone: 20,
      address: 200,
      city: 100,
      country: 100,
      description: 2000
    };
    
    if (maxLengths[name] && value.length > maxLengths[name]) {
      sanitizedValue = value.substring(0, maxLengths[name]);
    }
    
    // Sanitize input based on field type
    if (name === 'entityName' || name === 'address' || name === 'city' || name === 'country') {
      sanitizedValue = sanitizeText(sanitizedValue);
    } else if (name === 'email') {
      sanitizedValue = sanitizeText(sanitizedValue).toLowerCase().trim();
    } else if (name === 'phone') {
      sanitizedValue = sanitizeText(sanitizedValue);
    } else if (name === 'description') {
      sanitizedValue = sanitizeText(sanitizedValue);
    } else if (name === 'website') {
      // Don't sanitize URL during typing, only validate on blur/submit
      sanitizedValue = value;
    }
    
    setFormData((prev) => ({
      ...prev,
      [name]: sanitizedValue,
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const handleSocialMediaChange = (platform, value) => {
    // Limit URL length
    const maxUrlLength = 500;
    const sanitizedValue = value.length > maxUrlLength ? value.substring(0, maxUrlLength) : value;
    
    setFormData((prev) => ({
      ...prev,
      socialMedia: {
        ...prev.socialMedia,
        [platform]: sanitizedValue,
      },
    }));
    
    // Clear error when user starts typing
    const errorKey = `social_${platform}`;
    if (errors[errorKey]) {
      setErrors((prev) => ({
        ...prev,
        [errorKey]: '',
      }));
    }
  };

  const handleLogoChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type using security utility
      if (!validateFileType(file)) {
        setErrors((prev) => ({
          ...prev,
          logo: 'Please select a valid image file (JPEG, PNG, GIF, or WebP)',
        }));
        return;
      }

      // Validate file size using security utility
      if (!validateFileSize(file, 2)) {
        setErrors((prev) => ({
          ...prev,
          logo: 'Image size must be less than 2MB',
        }));
        return;
      }

      // Additional security: Check file extension matches MIME type
      const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
      const fileName = file.name.toLowerCase();
      const hasValidExtension = validExtensions.some(ext => fileName.endsWith(ext));
      
      if (!hasValidExtension) {
        setErrors((prev) => ({
          ...prev,
          logo: 'File extension does not match file type',
        }));
        return;
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setErrors((prev) => ({
          ...prev,
          logo: 'You must be logged in to upload logos',
        }));
        return;
      }

      // Upload to Supabase Storage
      setIsLoading(true);
      try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('logos')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          throw uploadError;
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('logos')
          .getPublicUrl(fileName);

        // Also create preview for immediate display
        const reader = new FileReader();
        reader.onloadend = () => {
          setLogoPreview(reader.result);
        };
        reader.readAsDataURL(file);

        setFormData((prev) => ({
          ...prev,
          logo: publicUrl, // Store URL instead of data URL
        }));
        setErrors((prev) => ({
          ...prev,
          logo: '',
        }));
      } catch (error) {
        console.error('Error uploading logo:', error);
        setErrors((prev) => ({
          ...prev,
          logo: error.message || 'Error uploading file',
        }));
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleRemoveLogo = async () => {
    // Delete from Supabase Storage if it exists
    if (formData.logo && formData.logo.includes('supabase')) {
      try {
        const urlParts = formData.logo.split('/logos/');
        if (urlParts[1]) {
          const { error } = await supabase.storage
            .from('logos')
            .remove([urlParts[1]]);
          // Don't throw error if file doesn't exist
        }
      } catch (error) {
        console.warn('Error deleting logo from storage:', error);
      }
    }

    setFormData((prev) => ({
      ...prev,
      logo: null,
    }));
    setLogoPreview(null);
    setErrors((prev) => ({
      ...prev,
      logo: '',
    }));
  };

  // Check if form has been modified
  const hasFormChanged = () => {
    // Create a copy without logo for comparison (logo is data URL which can be large)
    const currentDataCopy = { ...formData };
    const initialDataCopy = JSON.parse(initialData);
    // Compare logo separately
    const logoChanged = currentDataCopy.logo !== initialDataCopy.logo;
    delete currentDataCopy.logo;
    delete initialDataCopy.logo;
    const otherFieldsChanged = JSON.stringify(currentDataCopy) !== JSON.stringify(initialDataCopy);
    return otherFieldsChanged || logoChanged;
  };

  const validateForm = () => {
    const newErrors = {};

    // Validate entity name with length check
    if (!formData.entityName.trim()) {
      newErrors.entityName = 'Company/Brand name is required';
    } else if (!validateLength(formData.entityName, 1, 100)) {
      newErrors.entityName = 'Company/Brand name must be between 1 and 100 characters';
    }

    // Validate email using security utility
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Validate website URL with security checks
    if (formData.website && formData.website.trim()) {
      const sanitizedUrl = sanitizeUrl(formData.website);
      if (!sanitizedUrl) {
        newErrors.website = 'Please enter a valid URL (HTTP or HTTPS only)';
      } else if (!validateLength(formData.website, 0, 500)) {
        newErrors.website = 'URL must be less than 500 characters';
      }
    }

    // Validate phone
    if (formData.phone && formData.phone.trim() && !validatePhone(formData.phone)) {
      newErrors.phone = 'Please enter a valid phone number';
    }

    // Validate text fields length
    if (formData.description && !validateLength(formData.description, 0, 2000)) {
      newErrors.description = 'Description must be less than 2000 characters';
    }
    
    if (formData.address && !validateLength(formData.address, 0, 200)) {
      newErrors.address = 'Address must be less than 200 characters';
    }
    
    if (formData.city && !validateLength(formData.city, 0, 100)) {
      newErrors.city = 'City must be less than 100 characters';
    }
    
    if (formData.country && !validateLength(formData.country, 0, 100)) {
      newErrors.country = 'Country must be less than 100 characters';
    }

    // Validate social media URLs - only check if they differ from default domain
    Object.keys(formData.socialMedia).forEach((platform) => {
      const url = formData.socialMedia[platform];
      const platformData = socialMediaPlatforms.find(p => p.name.toLowerCase() === platform);
      // Only validate if URL is different from default domain (user has modified it)
      if (url && url !== platformData?.defaultDomain) {
        const sanitizedUrl = sanitizeUrl(url);
        if (!sanitizedUrl) {
          newErrors[`social_${platform}`] = `Please enter a valid URL for ${platform} (HTTP or HTTPS only)`;
        } else if (!validateLength(url, 0, 500)) {
          newErrors[`social_${platform}`] = `URL must be less than 500 characters`;
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Prevent double submission
    if (isSubmitting) {
      return;
    }
    
    // Rate limiting check
    const rateLimitCheck = checkRateLimit('form_submission', 5, 15);
    if (!rateLimitCheck.allowed) {
      setErrors({
        general: `Too many submissions. Please wait ${rateLimitCheck.timeRemaining} minute(s) before trying again.`
      });
      return;
    }
    
    // Check if form has been modified
    if (!hasFormChanged()) {
      setErrors({ general: 'Please update at least one field before submitting.' });
      return;
    }

    if (validateForm()) {
      setIsSubmitting(true);
      
      // Sanitize all form data before saving
      const sanitizedFormData = sanitizeFormData(formData);
      
      // Filter out default domains from social media before saving
      const socialMediaToSave = {};
      Object.keys(sanitizedFormData.socialMedia).forEach((platform) => {
        const url = sanitizedFormData.socialMedia[platform];
        const platformData = socialMediaPlatforms.find(p => p.name.toLowerCase() === platform);
        // Only save if URL is different from default domain and is valid
        if (url && url !== platformData?.defaultDomain) {
          const sanitizedUrl = sanitizeUrl(url);
          if (sanitizedUrl) {
            socialMediaToSave[platform] = sanitizedUrl;
          }
        }
      });

      const dataToSave = {
        ...sanitizedFormData,
        id: entity?.id, // Preserve ID if editing
        socialMedia: socialMediaToSave,
      };

      try {
        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (!user || userError) {
          setErrors({ general: 'You must be logged in to save profiles. Please sign in.' });
          setIsSubmitting(false);
          return;
        }
        
        // Prepare data for Supabase (convert camelCase to snake_case)
        const profileData = {
          entity_name: sanitizedFormData.entityName,
          description: sanitizedFormData.description,
          email: sanitizedFormData.email,
          website: sanitizedFormData.website,
          phone: sanitizedFormData.phone,
          address: sanitizedFormData.address,
          city: sanitizedFormData.city,
          country: sanitizedFormData.country,
          logo_url: sanitizedFormData.logo || null,
          social_media: socialMediaToSave,
          active: true,
          updated_at: new Date().toISOString(),
        };

        let savedEntity;

        if (entity?.id) {
          // Update existing profile
          const { data, error } = await supabase
            .from('profiles')
            .update(profileData)
            .eq('id', entity.id)
            .eq('user_id', user.id)
            .select()
            .single();

          if (error) {
            console.error('Supabase update error:', error);
            throw error;
          }
          
          if (!data) {
            throw new Error('Profile was not updated. Please try again.');
          }
          
          savedEntity = data;
        } else {
          // Create new profile - ensure required fields are present
          if (!profileData.entity_name || profileData.entity_name.trim() === '') {
            throw new Error('Company/Brand name is required');
          }
          if (!profileData.email || profileData.email.trim() === '') {
            throw new Error('Email is required');
          }

          // Insert new profile - UUID will be auto-generated by database
          const { data, error } = await supabase
            .from('profiles')
            .insert({
              ...profileData,
              user_id: user.id,
              created_at: new Date().toISOString(),
            })
            .select()
            .single();

          if (error) {
            console.error('Supabase insert error:', error);
            throw new Error(error.message || 'Failed to save profile. Please try again.');
          }
          
          if (!data) {
            throw new Error('Profile was not created. Please try again.');
          }
          
          savedEntity = data;
        }

        console.log('Form submitted successfully:', savedEntity);
        setSubmitted(true);
        
        setTimeout(() => {
          setSubmitted(false);
          setIsSubmitting(false);
          // Call onSave callback to notify parent
          if (onSave) {
            onSave();
          }
          // Reset form to initial state with default domains
          if (!entity) {
            setFormData(initialFormData);
          }
        }, 1500);
      } catch (error) {
        console.error('Error saving form:', error);
        console.error('Error details:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });
        
        // Extract more detailed error message
        let errorMessage = 'An error occurred while saving. Please try again.';
        if (error.message) {
          errorMessage = error.message;
        } else if (error.details) {
          errorMessage = error.details;
        } else if (error.hint) {
          errorMessage = error.hint;
        }
        
        // Handle specific Supabase errors
        if (error.code === 'PGRST116') {
          errorMessage = 'No rows found. Please check your profile exists.';
        } else if (error.code === '23505') {
          errorMessage = 'A profile with this information already exists.';
        } else if (error.code === '42501') {
          errorMessage = 'Permission denied. Please ensure you are logged in and have the correct permissions.';
        } else if (error.code === 'PGRST301') {
          errorMessage = 'Row Level Security policy violation. Please check your database permissions.';
        }
        
        setErrors({ general: errorMessage });
        setIsSubmitting(false);
      }
    } else {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="success-message">
        <div className="success-icon">✓</div>
        <h2>Profile Created Successfully!</h2>
        <p>Your profile has been created successfully.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="registration-form">
      <div className="form-section">
        <h2 className="section-title">Basic Information</h2>
        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="entityName">
              Company/Brand Name <span className="required">*</span>
            </label>
            <input
              type="text"
              id="entityName"
              name="entityName"
              value={formData.entityName}
              onChange={handleInputChange}
              className={errors.entityName ? 'error' : ''}
              placeholder="Enter your company or brand name"
              maxLength={100}
            />
            {errors.entityName && <span className="error-message">{errors.entityName}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="logo">
              Company/Brand Logo
            </label>
            <div className="logo-upload-container">
              {logoPreview ? (
                <div className="logo-preview-wrapper">
                  <img src={logoPreview} alt="Logo preview" className="logo-preview" />
                  <button
                    type="button"
                    onClick={handleRemoveLogo}
                    className="remove-logo-button"
                    title="Remove logo"
                  >
                    <FaTimes />
                  </button>
                </div>
              ) : (
                <label htmlFor="logo" className="logo-upload-label">
                  <FaImage className="upload-icon" />
                  <span>Choose Logo</span>
                  <input
                    type="file"
                    id="logo"
                    name="logo"
                    accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                    onChange={handleLogoChange}
                    className="logo-input"
                  />
                </label>
              )}
              {errors.logo && <span className="error-message">{errors.logo}</span>}
              <p className="logo-hint">Upload a logo image (max 2MB, PNG, JPG, or GIF)</p>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="email">
              Email <span className="required">*</span>
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className={errors.email ? 'error' : ''}
              placeholder="contact@example.com"
              maxLength={254}
            />
            {errors.email && <span className="error-message">{errors.email}</span>}
          </div>

          <div className="form-group full-width">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows="4"
              placeholder="Tell your story... Share what's in your heart"
              maxLength={2000}
            />
          </div>

          <div className="form-group">
            <label htmlFor="website">Website</label>
            <input
              type="url"
              id="website"
              name="website"
              value={formData.website}
              onChange={handleInputChange}
              className={errors.website ? 'error' : ''}
              placeholder="https://www.example.com"
              maxLength={500}
            />
            {errors.website && <span className="error-message">{errors.website}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="phone">Phone</label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              placeholder="+1 (555) 123-4567"
              maxLength={20}
            />
          </div>
        </div>
      </div>

      <div className="form-section">
        <h2 className="section-title">Location</h2>
        <div className="form-grid">
          <div className="form-group full-width">
            <label htmlFor="address">Address</label>
            <input
              type="text"
              id="address"
              name="address"
              value={formData.address}
              onChange={handleInputChange}
              placeholder="Street address"
              maxLength={200}
            />
          </div>

          <div className="form-group">
            <label htmlFor="city">City</label>
            <input
              type="text"
              id="city"
              name="city"
              value={formData.city}
              onChange={handleInputChange}
              placeholder="City"
              maxLength={100}
            />
          </div>

          <div className="form-group">
            <label htmlFor="country">Country</label>
            <input
              type="text"
              id="country"
              name="country"
              value={formData.country}
              onChange={handleInputChange}
              placeholder="Country"
              maxLength={100}
            />
          </div>
        </div>
      </div>

      <div className="form-section">
            <h2 className="section-title">Social Media Links</h2>
            <p className="section-description">
              Connect with your audience across all platforms. Default domains are pre-filled. Update the URLs with your profile information.
            </p>
        <div className="social-media-grid">
          {socialMediaPlatforms.map((platform) => {
            const Icon = platform.icon;
            const platformKey = platform.name.toLowerCase();
            const url = formData.socialMedia[platformKey] || '';
            const errorKey = `social_${platformKey}`;

            return (
              <div key={platformKey} className="social-media-item">
                <div className="social-icon-wrapper" style={{ backgroundColor: `${platform.color}15` }}>
                  <Icon className="social-icon" style={{ color: platform.color }} />
                </div>
                <div className="social-input-wrapper">
                  <label htmlFor={platformKey}>{platform.name}</label>
                  <input
                    type="url"
                    id={platformKey}
                    value={url}
                    onChange={(e) => handleSocialMediaChange(platformKey, e.target.value)}
                    className={errors[errorKey] ? 'error' : ''}
                    placeholder={platform.placeholder}
                    maxLength={500}
                  />
                  {errors[errorKey] && (
                    <span className="error-message-small">{errors[errorKey]}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="form-actions">
        {errors.general && (
          <div className="general-error-message">{errors.general}</div>
        )}
        <div className="action-buttons">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="cancel-button"
            >
              Cancel
            </button>
          )}
          <button 
            type="submit" 
            className={`submit-button ${!hasFormChanged() || isSubmitting ? 'disabled' : ''}`}
            disabled={!hasFormChanged() || isSubmitting}
          >
            {isSubmitting 
              ? 'Submitting...' 
              : hasFormChanged() 
                ? (entity ? 'Update Entity' : 'Register Entity') 
                : 'No Changes Made'}
          </button>
        </div>
      </div>
    </form>
  );
}

export default RegistrationForm;

