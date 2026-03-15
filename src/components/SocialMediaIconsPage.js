import React, { useEffect, useState, useRef } from 'react';
import './SocialMediaIconsPage.css';
import SiteBanner from './SiteBanner';
import { getEntityByUUID, trackQRScan, trackSocialClick, trackCustomLinkClick } from '../utils/storage';
import { getTheme, applyTheme } from '../utils/theme';
import {
  FaFacebook,
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
import { FaXTwitter } from 'react-icons/fa6';

const socialMediaPlatforms = {
  facebook: { name: 'Facebook', icon: FaFacebook, color: '#1877f2' },
  twitter: { name: 'X', icon: FaXTwitter, color: '#000000' },
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

  // Apply theme on mount
  useEffect(() => {
    const theme = getTheme();
    applyTheme(theme);
  }, []);


  useEffect(() => {
    const loadEntity = async () => {
      if (uuid && !hasTracked.current) {
        // Load entity by UUID
        const foundEntity = await getEntityByUUID(uuid);
      
        if (foundEntity) {
          setEntity(foundEntity);
          
          // Track QR code scan only once per page load
          // Use sessionStorage to prevent duplicate tracking in same session
          const scanKey = `qr_scanned_${uuid}`;
          const alreadyScanned = sessionStorage.getItem(scanKey);
          
          if (!alreadyScanned) {
            await trackQRScan(uuid);
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
    };
    loadEntity();
  }, [uuid]);

  const handleSocialClick = async (e, platform, url, entityId) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log(`🔗 Icon clicked: ${platform}`, { url, entityId, entity });
    
    // Validate URL before opening
    if (!url || typeof url !== 'string' || url.trim() === '') {
      console.warn(`⚠️ No URL provided for ${platform}`);
      return;
    }

    // Ensure URL has protocol
    let validUrl = url.trim();
    if (!validUrl.startsWith('http://') && !validUrl.startsWith('https://')) {
      validUrl = 'https://' + validUrl;
    }

    try {
      // Validate URL format
      new URL(validUrl);
    } catch (error) {
      console.error(`❌ Invalid URL for ${platform}:`, validUrl, error);
      return;
    }

    console.log(`✅ Opening URL: ${validUrl}`);

    if (!entity?.uuid || !entity?.active) {
      const newWindow = window.open(validUrl, '_blank', 'noopener,noreferrer');
      if (!newWindow) {
        console.error('❌ Popup blocked. Please allow popups for this site.');
      }
      return;
    }

    // Track the click (optimized: skip reload to reduce egress)
    trackSocialClick(entityId, platform).catch(err => console.error('Error tracking click:', err));
    // Open in new tab immediately
    const newWindow = window.open(validUrl, '_blank', 'noopener,noreferrer');
    if (!newWindow) {
      console.error('❌ Popup blocked. Please allow popups for this site.');
    }
  };

  const handleCustomLinkClick = async (e, customLinkIndex, url, entityId) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log(`🔗 Custom link clicked: ${customLinkIndex}`, { url, entityId, entity });
    
    // Validate URL before opening
    if (!url || typeof url !== 'string' || url.trim() === '') {
      console.warn(`⚠️ No URL provided for custom link ${customLinkIndex}`);
      return;
    }

    // Ensure URL has protocol
    let validUrl = url.trim();
    if (!validUrl.startsWith('http://') && !validUrl.startsWith('https://')) {
      validUrl = 'https://' + validUrl;
    }

    try {
      // Validate URL format
      new URL(validUrl);
    } catch (error) {
      console.error(`❌ Invalid URL for custom link ${customLinkIndex}:`, validUrl, error);
      return;
    }

    console.log(`✅ Opening URL: ${validUrl}`);

    if (!entity?.uuid || !entity?.active) {
      const newWindow = window.open(validUrl, '_blank', 'noopener,noreferrer');
      if (!newWindow) {
        console.error('❌ Popup blocked. Please allow popups for this site.');
      }
      return;
    }

    // Track the click (optimized: skip reload to reduce egress)
    trackCustomLinkClick(entityId, customLinkIndex).catch(err => console.error('Error tracking click:', err));
    // Open in new tab immediately
    const newWindow = window.open(validUrl, '_blank', 'noopener,noreferrer');
    if (!newWindow) {
      console.error('❌ Popup blocked. Please allow popups for this site.');
    }
  };

  if (loading) {
    return (
      <>
        <SiteBanner compact />
        <div className="social-icons-page">
          <div className="loading-container">
            <FaSpinner className="spinner" />
            <p>Loading...</p>
          </div>
        </div>
      </>
    );
  }

  if (!entity) {
    return (
      <>
        <SiteBanner compact />
        <div className="social-icons-page">
            <div className="error-container">
              <h1>Profile Not Found</h1>
              <p>The QR code is invalid or the profile has been removed.</p>
            </div>
        </div>
      </>
    );
  }

  const socialMediaLinks = Object.keys(entity.socialMedia || {});
  const customLinks = entity.customLinks || [];

  if (socialMediaLinks.length === 0 && customLinks.length === 0) {
    return (
      <>
        <SiteBanner compact />
        <div className="social-icons-page">
          <div className="social-icons-container">
            <p className="no-links-message">No links available for this profile.</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <SiteBanner compact />
      <div className="social-icons-page">
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

            // Only render button if URL exists and is valid
            if (!url || typeof url !== 'string' || url.trim() === '') {
              return null;
            }

            return (
              <button
                key={platform}
                onClick={(e) => handleSocialClick(e, platform, url, entity.id)}
                className="social-icon-button"
                style={{ color: platformData.color }}
                title={platformData.name}
                type="button"
                aria-label={`Open ${platformData.name}`}
              >
                <Icon
                  className="social-icon-svg"
                  style={{ color: platformData.color }}
                />
              </button>
            );
          })}
          {customLinks.map((customLink, index) => {
            // Only render button if link exists and is valid
            if (!customLink?.link || typeof customLink.link !== 'string' || customLink.link.trim() === '') {
              return null;
            }

            return (
              <button
                key={`custom-${index}`}
                onClick={(e) => handleCustomLinkClick(e, index, customLink.link, entity.id)}
                className="social-icon-button custom-link-button"
                title={customLink.name}
                type="button"
                aria-label={`Open ${customLink.name}`}
              >
                {customLink.icon ? (
                  <img 
                    src={customLink.icon} 
                    alt={`${customLink.name} icon`}
                    className="custom-link-icon-image-page"
                  />
                ) : (
                  <span className="custom-link-icon-placeholder">
                    {customLink.name?.charAt(0) || '?'}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <a
          href="https://shareyourhearttoday.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="website-link-below-icons"
        >
          shareyourhearttoday.com
        </a>
      </div>
    </div>
    </>
  );
}

export default SocialMediaIconsPage;

