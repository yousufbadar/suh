import React from 'react';
import './SiteBanner.css';

/**
 * Reusable site banner: green background, logo in white-bordered square,
 * "Share your heart today" header and tagline.
 * Shown on all screens for consistent branding.
 */
function SiteBanner({ compact }) {
  return (
    <header className={`site-banner ${compact ? 'site-banner--compact' : ''}`}>
      <div className="site-banner__texture" aria-hidden="true" />
      <div className="site-banner__inner">
        <div className="site-banner__logo-wrap">
          <div className="site-banner__logo-box">
            <img src="/logo.png" alt="Share Your Heart" className="site-banner__logo" />
          </div>
        </div>
        <div className="site-banner__text">
          <h1 className="site-banner__heading">Share your heart today</h1>
          <p className="site-banner__tagline">
            your experience today at this place, for all your friends to see!!!
          </p>
        </div>
      </div>
    </header>
  );
}

export default SiteBanner;
