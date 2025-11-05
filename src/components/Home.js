import React, { useState, useEffect } from 'react';
import './Home.css';
import { FaHeart, FaQrcode, FaShareAlt, FaUsers, FaArrowRight, FaRocket } from 'react-icons/fa';
import ThemeSelector from './ThemeSelector';
import { getTheme, saveTheme, applyTheme } from '../utils/theme';

function Home({ onGetStarted }) {
  const [currentTheme, setCurrentTheme] = useState(getTheme());

  useEffect(() => {
    applyTheme(currentTheme);
  }, [currentTheme]);

  const handleThemeChange = (themeId) => {
    setCurrentTheme(themeId);
    saveTheme(themeId);
    applyTheme(themeId);
  };

  return (
    <div className="home-page">
      <ThemeSelector currentTheme={currentTheme} onThemeChange={handleThemeChange} />
      <div className="home-hero">
        <div className="hero-content">
          <div className="hero-icon-wrapper">
            <div className="hero-icon">
              <FaHeart />
            </div>
            <div className="floating-emoji">✨</div>
            <div className="floating-emoji delay-1">💜</div>
            <div className="floating-emoji delay-2">🔥</div>
          </div>
          <h1 className="hero-title">
            <span className="gradient-text">Speak your heart</span> online 💬
          </h1>
          <p className="hero-subtitle">
            One QR code. All your socials. No cap. 🚀
            <br />
            Connect with your crew across every platform, periodt.
          </p>
          <button onClick={onGetStarted} className="cta-button">
            Let's Gooo! <FaRocket className="cta-rocket" />
          </button>
        </div>
      </div>

      <div className="features-section">
        <div className="container">
          <h2 className="features-title">
            <span className="gradient-text">Why this slaps</span> ✨
          </h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">
                <FaQrcode />
              </div>
              <h3 className="feature-title">One QR, All the Links 📱</h3>
              <p className="feature-description">
                Stop asking people to follow 18 different accounts. One QR code = all your socials. It's giving convenience.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <FaShareAlt />
              </div>
              <h3 className="feature-title">Share Anywhere 🔥</h3>
              <p className="feature-description">
                Business cards? ✅ Flyers? ✅ Instagram bio? ✅ TikTok video? ✅ Works literally everywhere. Periodt.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <FaUsers />
              </div>
              <h3 className="feature-title">See the Stats 📊</h3>
              <p className="feature-description">
                Track how many scans you get and which platform your audience vibes with most. The data hits different.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <FaHeart />
              </div>
              <h3 className="feature-title">Be Unapologetically You 💜</h3>
              <p className="feature-description">
                Add your logo, brand colors, personality - make it yours. Show the world who you are, fr fr.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="how-it-works">
        <div className="container">
          <h2 className="how-it-works-title">
            <span className="gradient-text">How it works</span> (it's easy, fr) 📖
          </h2>
          <div className="steps">
            <div className="step">
              <div className="step-number">1</div>
              <h3>Set Up Your Profile 🎨</h3>
              <p>Add your brand name, logo, and drop all your social links. Takes like 2 mins, no cap.</p>
            </div>
            <div className="step-arrow">✨</div>
            <div className="step">
              <div className="step-number">2</div>
              <h3>Get Your QR Code 📸</h3>
              <p>Download your personalized QR with a heart in the middle. It's giving ✨aesthetic✨</p>
            </div>
            <div className="step-arrow">✨</div>
            <div className="step">
              <div className="step-number">3</div>
              <h3>Share & Watch It Pop Off 🚀</h3>
              <p>Drop it anywhere and watch people connect with all your socials. That's it. You're done.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="cta-section">
        <div className="container">
          <h2 className="cta-title">Ready to level up your socials? 🔥</h2>
          <p className="cta-text">Let's get this bread and connect with your people</p>
          <button onClick={onGetStarted} className="cta-button-large">
            Create Your Profile RN
            <FaRocket className="cta-rocket" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default Home;

