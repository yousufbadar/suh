import React, { useEffect, useState, useRef } from 'react';
import './SocialMediaIconsPage.css';
import { getEntityByUUID, trackQRScan, trackSocialClick, trackCustomLinkClick } from '../utils/storage';
import ThemeSelector from './ThemeSelector';
import { getTheme, saveTheme, applyTheme } from '../utils/theme';
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
  FaSpinner,
} from 'react-icons/fa';

const socialMediaPlatforms = {
  facebook: { name: 'Facebook', icon: FaFacebook, color: '#1877f2' },
  twitter: { name: 'Twitter', icon: FaTwitter, color: '#1da1f2' },
  instagram: { name: 'Instagram', icon: FaInstagram, color: '#e4405f' },
  linkedin: { name: 'LinkedIn', icon: FaLinkedin, color: '#0077b5' },
  youtube: { name: 'YouTube', icon: FaYoutube, color: '#ff0000' },
  pinterest: { name: 'Pinterest', icon: FaPinterest, color: '#bd081c' },
  snapchat: { name: 'Snapchat', icon: FaSnapchat, color: '#fffc00' },
  tiktok: { name: 'TikTok', icon: FaTiktok, color: '#000000' },
  reddit: { name: 'Reddit', icon: FaReddit, color: '#ff4500' },
  github: { name: 'GitHub', icon: FaGithub, color: '#181717' },
  dribbble: { name: 'Dribbble', icon: FaDribbble, color: '#ea4c89' },
  behance: { name: 'Behance', icon: FaBehance, color: '#1769ff' },
  telegram: { name: 'Telegram', icon: FaTelegram, color: '#0088cc' },
  whatsapp: { name: 'WhatsApp', icon: FaWhatsapp, color: '#25d366' },
  discord: { name: 'Discord', icon: FaDiscord, color: '#5865f2' },
  twitch: { name: 'Twitch', icon: FaTwitch, color: '#9146ff' },
  vimeo: { name: 'Vimeo', icon: FaVimeo, color: '#1ab7ea' },
  flickr: { name: 'Flickr', icon: FaFlickr, color: '#ff0084' },
};

function SocialMediaIconsPage({ uuid }) {
  const [entity, setEntity] = useState(null);
  const [loading, setLoading] = useState(true);
  const hasTracked = useRef(false);
  const [currentTheme, setCurrentTheme] = useState(getTheme());

  useEffect(() => {
    applyTheme(currentTheme);
  }, [currentTheme]);

  const handleThemeChange = (themeId) => {
    setCurrentTheme(themeId);
    saveTheme(themeId);
    applyTheme(themeId);
  };

  useEffect(() => {
    if (uuid && !hasTracked.current) {
      // Load entity by UUID
      const foundEntity = getEntityByUUID(uuid);
      
      if (foundEntity) {
        setEntity(foundEntity);
        
        // Track QR code scan only once per page load
        // Use sessionStorage to prevent duplicate tracking in same session
        const scanKey = `qr_scanned_${uuid}`;
        const alreadyScanned = sessionStorage.getItem(scanKey);
        
        if (!alreadyScanned) {
          trackQRScan(uuid);
          sessionStorage.setItem(scanKey, 'true');
          hasTracked.current = true;
        } else {
          hasTracked.current = true;
        }
      }
      setLoading(false);
    } else if (!uuid) {
      setLoading(false);
    }
  }, [uuid]);

  const handleSocialClick = (platform, url, entityId) => {
    if (!entity?.uuid || !entity?.active) {
      window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }

    // Track the click
    trackSocialClick(entityId, platform);
    // Reload entity data to reflect updated click count
    const updatedEntity = getEntityByUUID(uuid);
    if (updatedEntity) {
      setEntity(updatedEntity);
    }
    // Open in new tab
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleCustomLinkClick = (customLinkIndex, url, entityId) => {
    if (!entity?.uuid || !entity?.active) {
      window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }

    // Track the click
    trackCustomLinkClick(entityId, customLinkIndex);
    // Reload entity data to reflect updated click count
    const updatedEntity = getEntityByUUID(uuid);
    if (updatedEntity) {
      setEntity(updatedEntity);
    }
    // Open in new tab
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  if (loading) {
    return (
      <div className="social-icons-page">
        <ThemeSelector currentTheme={currentTheme} onThemeChange={handleThemeChange} />
        <div className="loading-container">
          <FaSpinner className="spinner" />
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!entity) {
    return (
      <div className="social-icons-page">
        <ThemeSelector currentTheme={currentTheme} onThemeChange={handleThemeChange} />
            <div className="error-container">
              <h1>Profile Not Found</h1>
              <p>The QR code is invalid or the profile has been removed.</p>
            </div>
      </div>
    );
  }

  const socialMediaLinks = Object.keys(entity.socialMedia || {});
  const customLinks = entity.customLinks || [];

  if (socialMediaLinks.length === 0 && customLinks.length === 0) {
    return (
      <div className="social-icons-page">
        <ThemeSelector currentTheme={currentTheme} onThemeChange={handleThemeChange} />
        <div className="social-icons-container">
          <p className="no-links-message">No links available for this profile.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="social-icons-page">
      <ThemeSelector currentTheme={currentTheme} onThemeChange={handleThemeChange} />
      <div className="social-icons-container">
        <div className="company-header">
          {entity.logo && (
            <div className="company-logo-wrapper">
              <img src={entity.logo} alt={`${entity.entityName} logo`} className="company-logo" />
            </div>
          )}
          <h1 className="company-name">{entity.entityName}</h1>
        </div>
        <div className="social-icons-grid">
          {socialMediaLinks.map((platform) => {
            const platformData = socialMediaPlatforms[platform];
            if (!platformData) return null;

            const Icon = platformData.icon;
            const url = entity.socialMedia[platform];

            return (
              <button
                key={platform}
                onClick={() => handleSocialClick(platform, url, entity.id)}
                className="social-icon-button"
                style={{
                  backgroundColor: `${platformData.color}15`,
                  borderColor: platformData.color,
                }}
                title={platformData.name}
              >
                <Icon
                  className="social-icon-svg"
                  style={{ color: platformData.color }}
                />
              </button>
            );
          })}
          {customLinks.map((customLink, index) => (
            <button
              key={`custom-${index}`}
              onClick={() => handleCustomLinkClick(index, customLink.link, entity.id)}
              className="social-icon-button custom-link-button"
              style={{
                backgroundColor: '#32cd3215',
                borderColor: '#32cd32',
              }}
              title={customLink.name}
            >
              {customLink.icon ? (
                <img 
                  src={customLink.icon} 
                  alt={`${customLink.name} icon`}
                  className="custom-link-icon-image-page"
                />
              ) : (
                <span className="custom-link-icon-placeholder">{customLink.name.charAt(0)}</span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default SocialMediaIconsPage;

