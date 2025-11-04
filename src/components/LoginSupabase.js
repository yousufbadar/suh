import React, { useState } from 'react';
import './Login.css';
import { FaGoogle, FaFacebook, FaTwitter, FaLock, FaUser, FaEnvelope } from 'react-icons/fa';

function LoginSupabase({ onLoginSuccess, onClose }) {
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
  const [successMessage, setSuccessMessage] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
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
    setSuccessMessage('');
    setIsLoading(true);

    try {
      // Dynamically import Supabase client
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();

      if (isLogin) {
        // Login - Supabase requires email, not username
        if (!formData.username || !formData.password) {
          setErrors({
            username: !formData.username ? 'Email is required' : '',
            password: !formData.password ? 'Password is required' : ''
          });
          setIsLoading(false);
          return;
        }

        // Validate email format
        const email = formData.username.includes('@') ? formData.username : formData.email || formData.username;
        if (!email.includes('@')) {
          setErrors({
            username: 'Please enter a valid email address'
          });
          setIsLoading(false);
          return;
        }

        const { data, error } = await supabase.auth.signInWithPassword({
          email: email,
          password: formData.password,
        });

        if (error) throw error;

        if (data.user) {
          onLoginSuccess(data.user);
          if (onClose) onClose();
        }
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

        const { data, error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              username: formData.username,
            }
          }
        });

        if (error) throw error;

        if (data.user) {
          onLoginSuccess(data.user);
          if (onClose) onClose();
        }
      }
    } catch (error) {
      setGeneralError(error.message || 'An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setGeneralError('');
    setSuccessMessage('');
    
    if (!resetEmail || !resetEmail.includes('@')) {
      setGeneralError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (error) throw error;

      setSuccessMessage('Password reset email sent! Please check your inbox.');
      setResetEmail('');
      setTimeout(() => {
        setShowForgotPassword(false);
      }, 3000);
    } catch (error) {
      setGeneralError(error.message || 'Failed to send reset email. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSSO = async (provider) => {
    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: provider.toLowerCase(),
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      });

      if (error) throw error;
    } catch (error) {
      setGeneralError(`${provider} sign-in failed: ${error.message}`);
    }
  };

  return (
    <div className="login-overlay">
      <div className="login-modal">
        <button className="close-button" onClick={onClose}>×</button>
        
        <div className="login-header">
          <h2>{isLogin ? 'Welcome Back! 🔥' : 'Create Account ✨'}</h2>
          <p>{isLogin ? 'Sign in to manage your profiles' : 'Join us and start sharing your heart online'}</p>
        </div>

        {successMessage && (
          <div className="success-message">{successMessage}</div>
        )}
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
                type="text"
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

          {isLogin && !showForgotPassword && (
            <div className="forgot-password-link">
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="forgot-password-button"
              >
                Forgot your password?
              </button>
            </div>
          )}

          {isLogin && showForgotPassword && (
            <div className="forgot-password-section">
              <p className="forgot-password-text">
                Enter your email address and we'll send you a link to reset your password.
              </p>
              <div className="form-group">
                <label htmlFor="resetEmail">
                  <FaEnvelope className="input-icon" />
                  Email
                </label>
                <input
                  type="email"
                  id="resetEmail"
                  name="resetEmail"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  className={generalError && !resetEmail.includes('@') ? 'error' : ''}
                  placeholder="Enter your email"
                  maxLength={254}
                />
              </div>
              <div className="forgot-password-actions">
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="login-button"
                  disabled={isLoading || !resetEmail}
                >
                  {isLoading ? 'Sending...' : 'Send Reset Link'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotPassword(false);
                    setResetEmail('');
                    setGeneralError('');
                    setSuccessMessage('');
                  }}
                  className="cancel-reset-button"
                >
                  Cancel
                </button>
              </div>
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

          {!showForgotPassword && (
            <button
              type="submit"
              className="login-button"
              disabled={isLoading}
            >
              {isLoading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}
            </button>
          )}
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

export default LoginSupabase;

