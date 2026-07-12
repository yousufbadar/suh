import React, { useState } from 'react';
import { FaEnvelope, FaPaperPlane, FaArrowLeft } from 'react-icons/fa';
import { submitContactForm } from '../utils/contactEmail';
import './ContactUs.css';

function ContactUs({ currentUser, onBack }) {
  const [form, setForm] = useState({
    name: currentUser?.name || currentUser?.username || '',
    email: currentUser?.email || '',
    subject: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      await submitContactForm(form);
      setSuccess(true);
      setForm((prev) => ({ ...prev, subject: '', message: '' }));
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="contact-page">
      <div className="contact-card">
        {onBack && (
          <button type="button" className="contact-back" onClick={onBack}>
            <FaArrowLeft /> Back
          </button>
        )}

        <div className="contact-header">
          <div className="contact-icon">
            <FaEnvelope />
          </div>
          <h1>Contact Us</h1>
          <p>Questions, feedback, or need help? Send us a message and we&apos;ll get back to you.</p>
        </div>

        {success ? (
          <div className="contact-success">
            <h2>Message sent!</h2>
            <p>Thanks for reaching out. We&apos;ll reply to {form.email || 'your email'} as soon as we can.</p>
            <button type="button" className="contact-submit" onClick={() => setSuccess(false)}>
              Send another message
            </button>
          </div>
        ) : (
          <form className="contact-form" onSubmit={handleSubmit}>
            <div className="contact-field">
              <label htmlFor="contact-name">Name</label>
              <input
                id="contact-name"
                name="name"
                type="text"
                value={form.name}
                onChange={handleChange}
                required
                maxLength={120}
                placeholder="Your name"
              />
            </div>

            <div className="contact-field">
              <label htmlFor="contact-email">Email</label>
              <input
                id="contact-email"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                required
                maxLength={254}
                placeholder="you@example.com"
              />
            </div>

            <div className="contact-field">
              <label htmlFor="contact-subject">Subject</label>
              <input
                id="contact-subject"
                name="subject"
                type="text"
                value={form.subject}
                onChange={handleChange}
                required
                maxLength={200}
                placeholder="How can we help?"
              />
            </div>

            <div className="contact-field">
              <label htmlFor="contact-message">Message</label>
              <textarea
                id="contact-message"
                name="message"
                value={form.message}
                onChange={handleChange}
                required
                minLength={10}
                maxLength={5000}
                rows={6}
                placeholder="Tell us what's on your mind..."
              />
            </div>

            {error && <p className="contact-error">{error}</p>}

            <button type="submit" className="contact-submit" disabled={isSubmitting}>
              <FaPaperPlane /> {isSubmitting ? 'Sending...' : 'Send Message'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default ContactUs;
