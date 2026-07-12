import React, { useState } from 'react';
import './Login.css';
import { loginUser, registerUser } from '../utils/auth';
import ForgotPassword from './ForgotPassword';
import { FaGoogle, FaLock, FaUser, FaEnvelope, FaTicketAlt } from 'react-icons/fa';
import { isValidCouponFormat } from '../utils/coupon';

function Login({ onLoginSuccess, onCancel }) {
  const [isLogin, setIsLogin] = useState(true);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    couponCode: '',
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
            username: !formData.username ? 'Email is required' : '',
            password: !formData.password ? 'Password is required' : ''
          });
          setIsLoading(false);
          return;
        }

        // Use email for login (formData.username can be email)
        const email = formData.username.includes('@') ? formData.username : `${formData.username}@admin.com`;
        console.log('🔐 Attempting login with email:', email);
        
        // Add timeout to prevent hanging
        const loginPromise = loginUser(email, formData.password);
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Login request timed out. Please try again.')), 30000)
        );
        
        const user = await Promise.race([loginPromise, timeoutPromise]);
        console.log('✅ Login successful, calling onLoginSuccess');
        
        // Fire-and-forget — don't block the button on navigation side effects
        if (onLoginSuccess) {
          Promise.resolve(onLoginSuccess(user)).catch((callbackError) => {
            console.error('❌ Error in onLoginSuccess callback:', callbackError);
          });
        }
      } else {
        // Register
        const newErrors = {};

        if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
          newErrors.email = 'Please enter a valid email address';
        }

        if (!formData.password || formData.password.length < 6) {
          newErrors.password = 'Password must be at least 6 characters';
        }

        if (formData.password !== formData.confirmPassword) {
          newErrors.confirmPassword = 'Passwords do not match';
        }

        if (formData.couponCode?.trim() && !isValidCouponFormat(formData.couponCode)) {
          newErrors.couponCode = 'Coupon code must be a valid UUID';
        }

        if (Object.keys(newErrors).length > 0) {
          setErrors(newErrors);
          setIsLoading(false);
          return;
        }

        console.log('📝 Attempting registration with email:', formData.email);
        const user = await registerUser(
          formData.email,
          formData.password,
          formData.username,
          formData.couponCode
        );
        console.log('✅ Registration successful, calling onLoginSuccess');
        if (user?.email) {
          try {
            const { sendTrialStarted, sendSubscriptionActivated } = await import('../utils/notificationEmail');
            if (formData.couponCode?.trim()) {
              sendSubscriptionActivated(user.email, { billingCycle: 'lifetime', nextBillingDate: null });
            } else {
              sendTrialStarted(user.email);
            }
          } catch (e) {
            console.warn('Signup email send failed:', e);
          }
        }
        // Call onLoginSuccess and wait for it, but don't let errors here prevent loading state reset
        try {
          if (onLoginSuccess) {
            await Promise.resolve(onLoginSuccess(user));
          }
        } catch (callbackError) {
          console.error('❌ Error in onLoginSuccess callback:', callbackError);
          // Don't throw - navigation errors shouldn't prevent registration completion
        }
      }
    } catch (error) {
      console.error('❌ Login/Registration error:', error);
      const errorMessage = error.message || 'An error occurred. Please try again.';
      setGeneralError(errorMessage);
      
      // Log additional error details for debugging
      if (error.message) {
        console.error('Error message:', error.message);
      }
      if (error.stack) {
        console.error('Error stack:', error.stack);
      }
    } finally {
      // Always reset loading state, even if there were errors
      console.log('🔄 Resetting loading state');
      setIsLoading(false);
    }
  };

  const handleSSO = async (provider) => {
    try {
      setIsLoading(true);
      setGeneralError('');
      setErrors({});
      
      console.log(`🔐 Attempting ${provider} SSO login...`);
      
      // Import ssoLogin function
      const { ssoLogin } = await import('../utils/auth');
      
      // Initiate OAuth flow
      await ssoLogin(provider.toLowerCase());
      
      // Note: The user will be redirected to the OAuth provider
      // After authentication, they'll be redirected back to the app
      // The auth state change listener in App.js will handle the session
      
    } catch (error) {
      console.error(`❌ ${provider} SSO error:`, error);
      const errorMessage = error.message || `${provider} login failed. Please try again.`;
      setGeneralError(errorMessage);
      setIsLoading(false);
    }
  };

  if (showForgotPassword) {
    return (
      <ForgotPassword
        onBack={() => setShowForgotPassword(false)}
        onClose={onCancel}
      />
    );
  }

  return (
    <div className="login-overlay">
      <div className="login-modal">
        {onCancel && (
          <button type="button" className="close-button" onClick={onCancel}>×</button>
        )}
        
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
                Email
              </label>
              <input
                type="email"
                id="usernameOrEmail"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                className={errors.username ? 'error' : ''}
                placeholder="Enter your email"
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

          {isLogin && (
            <div className="forgot-password-row">
              <button
                type="button"
                className="forgot-password-link"
                onClick={() => {
                  setShowForgotPassword(true);
                  setErrors({});
                  setGeneralError('');
                }}
              >
                Forgot password?
              </button>
            </div>
          )}

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

          {!isLogin && (
            <div className="form-group">
              <label htmlFor="couponCode">
                <FaTicketAlt className="input-icon" />
                Coupon Code <span className="optional-label">(optional)</span>
              </label>
              <input
                type="text"
                id="couponCode"
                name="couponCode"
                value={formData.couponCode}
                onChange={handleInputChange}
                className={errors.couponCode ? 'error' : ''}
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                maxLength={36}
                spellCheck={false}
                autoComplete="off"
              />
              {errors.couponCode && <span className="error-message">{errors.couponCode}</span>}
              <span className="field-hint">Enter a lifetime coupon for free Pro access</span>
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
            disabled={isLoading}
          >
            <FaGoogle />
            <span>Google</span>
          </button>
        </div>

        <div className="login-footer">
          <button
            type="button"
            className="toggle-mode"
            onClick={() => {
              setIsLogin(!isLogin);
              setShowForgotPassword(false);
              setErrors({});
              setGeneralError('');
              setFormData({
                username: '',
                email: '',
                password: '',
                confirmPassword: '',
                couponCode: '',
              });
            }}
          >
            {isLogin
              ? "Don't have an account? Sign Up"
              : 'Already have an account? Sign In'}
          </button>

          {onCancel && (
            <button
              type="button"
              className="cancel-button"
              onClick={onCancel}
              disabled={isLoading}
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default Login;

