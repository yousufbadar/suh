import React, { useState } from 'react';
import './Login.css';
import { requestPasswordReset } from '../utils/auth';
import { validateEmail, checkRateLimit } from '../utils/security';
import { FaEnvelope, FaArrowLeft } from 'react-icons/fa';

function ForgotPassword({ onBack, onClose }) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    const rateLimitCheck = checkRateLimit('password_reset', 3, 15);
    if (!rateLimitCheck.allowed) {
      setError(`Too many reset requests. Please try again in ${rateLimitCheck.timeRemaining} minute(s).`);
      return;
    }

    setIsLoading(true);

    try {
      await requestPasswordReset(email);
      setIsSuccess(true);
    } catch (err) {
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-overlay">
      <div className="login-modal">
        {onClose && (
          <button className="close-button" onClick={onClose}>×</button>
        )}

        <div className="login-header">
          <h2>Reset Password 🔑</h2>
          <p>
            {isSuccess
              ? 'Check your inbox for a reset link'
              : 'Enter your email and we\'ll send you a reset link'}
          </p>
        </div>

        {isSuccess ? (
          <div className="success-message">
            If an account exists for <strong>{email}</strong>, you will receive a password reset link shortly.
            Check your spam folder if you don&apos;t see it.
          </div>
        ) : (
          <>
            {error && (
              <div className="general-error">{error}</div>
            )}

            <form onSubmit={handleSubmit} className="login-form">
              <div className="form-group">
                <label htmlFor="resetEmail">
                  <FaEnvelope className="input-icon" />
                  Email
                </label>
                <input
                  type="email"
                  id="resetEmail"
                  name="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError('');
                  }}
                  placeholder="your@email.com"
                  maxLength={254}
                  autoFocus
                />
              </div>

              <button
                type="submit"
                className="login-button"
                disabled={isLoading}
              >
                {isLoading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>
          </>
        )}

        <div className="login-footer">
          <button
            type="button"
            className="toggle-mode back-link"
            onClick={onBack}
          >
            <FaArrowLeft style={{ marginRight: '6px' }} />
            Back to Sign In
          </button>
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;
