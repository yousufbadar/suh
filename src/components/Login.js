import React, { useState } from 'react';
import './Login.css';
import { loginUser, registerUser } from '../utils/auth';
import { FaGoogle, FaFacebook, FaTwitter, FaLock, FaUser, FaEnvelope } from 'react-icons/fa';

function Login({ onLoginSuccess, onClose }) {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [generalError, setGeneralError] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear errors when user types
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
    if (generalError) {
      setGeneralError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setGeneralError('');
    setIsLoading(true);

    try {
      if (isLogin) {
        // Login
        if (!formData.username || !formData.password) {
          setErrors({
            username: !formData.username ? 'Username or email is required' : '',
            password: !formData.password ? 'Password is required' : ''
          });
          setIsLoading(false);
          return;
        }

        const user = await loginUser(formData.username, formData.password);
        onLoginSuccess(user);
        if (onClose) onClose();
      } else {
        // Register
        const newErrors = {};

        if (!formData.username || formData.username.trim().length < 3) {
          newErrors.username = 'Username must be at least 3 characters';
        }

        if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
          newErrors.email = 'Please enter a valid email address';
        }

        if (!formData.password || formData.password.length < 6) {
          newErrors.password = 'Password must be at least 6 characters';
        }

        if (formData.password !== formData.confirmPassword) {
          newErrors.confirmPassword = 'Passwords do not match';
        }

        if (Object.keys(newErrors).length > 0) {
          setErrors(newErrors);
          setIsLoading(false);
          return;
        }

        const user = await registerUser(formData.username, formData.email, formData.password);
        onLoginSuccess(user);
        if (onClose) onClose();
      }
    } catch (error) {
      setGeneralError(error.message || 'An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSSO = async (provider) => {
    // Note: In a real application, you would use proper OAuth libraries
    // This is a simplified version that would need backend integration
    setGeneralError(`${provider} SSO integration requires backend setup. This is a placeholder.`);
    
    // Example of what the integration would look like:
    // For Google: window.location.href = `/api/auth/google`
    // For Facebook: window.location.href = `/api/auth/facebook`
    // For Twitter: window.location.href = `/api/auth/twitter`
  };

  return (
    <div className="login-overlay">
      <div className="login-modal">
        <button className="close-button" onClick={onClose}>×</button>
        
        <div className="login-header">
          <h2>{isLogin ? 'Welcome Back! 🔥' : 'Create Account ✨'}</h2>
          <p>{isLogin ? 'Sign in to manage your profiles' : 'Join us and start sharing your heart online'}</p>
        </div>

        {generalError && (
          <div className="general-error">{generalError}</div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          {!isLogin && (
            <div className="form-group">
              <label htmlFor="username">
                <FaUser className="input-icon" />
                Username
              </label>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                className={errors.username ? 'error' : ''}
                placeholder="Choose a username"
                maxLength={50}
              />
              {errors.username && <span className="error-message">{errors.username}</span>}
            </div>
          )}

          {!isLogin && (
            <div className="form-group">
              <label htmlFor="email">
                <FaEnvelope className="input-icon" />
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className={errors.email ? 'error' : ''}
                placeholder="your@email.com"
                maxLength={254}
              />
              {errors.email && <span className="error-message">{errors.email}</span>}
            </div>
          )}

          {isLogin && (
            <div className="form-group">
              <label htmlFor="usernameOrEmail">
                <FaUser className="input-icon" />
                Username or Email
              </label>
              <input
                type="text"
                id="usernameOrEmail"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                className={errors.username ? 'error' : ''}
                placeholder="Enter username or email"
                maxLength={254}
              />
              {errors.username && <span className="error-message">{errors.username}</span>}
            </div>
          )}


          <div className="form-group">
            <label htmlFor="password">
              <FaLock className="input-icon" />
              Password
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              className={errors.password ? 'error' : ''}
              placeholder={isLogin ? 'Enter password' : 'At least 6 characters'}
              maxLength={100}
            />
            {errors.password && <span className="error-message">{errors.password}</span>}
          </div>

          {!isLogin && (
            <div className="form-group">
              <label htmlFor="confirmPassword">
                <FaLock className="input-icon" />
                Confirm Password
              </label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                className={errors.confirmPassword ? 'error' : ''}
                placeholder="Confirm your password"
                maxLength={100}
              />
              {errors.confirmPassword && <span className="error-message">{errors.confirmPassword}</span>}
            </div>
          )}

          <button
            type="submit"
            className="login-button"
            disabled={isLoading}
          >
            {isLoading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}
          </button>
        </form>

        <div className="divider">
          <span>or continue with</span>
        </div>

        <div className="sso-buttons">
          <button
            type="button"
            className="sso-button google"
            onClick={() => handleSSO('google')}
          >
            <FaGoogle />
            <span>Google</span>
          </button>
          <button
            type="button"
            className="sso-button facebook"
            onClick={() => handleSSO('facebook')}
          >
            <FaFacebook />
            <span>Facebook</span>
          </button>
          <button
            type="button"
            className="sso-button twitter"
            onClick={() => handleSSO('twitter')}
          >
            <FaTwitter />
            <span>Twitter</span>
          </button>
        </div>

        <div className="login-footer">
          <button
            type="button"
            className="toggle-mode"
            onClick={() => {
              setIsLogin(!isLogin);
              setErrors({});
              setGeneralError('');
              setFormData({
                username: '',
                email: '',
                password: '',
                confirmPassword: ''
              });
            }}
          >
            {isLogin
              ? "Don't have an account? Sign Up"
              : 'Already have an account? Sign In'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Login;

