import React, { useState, useEffect, useMemo } from 'react';
import './EntityView.css';
import { QRCodeSVG } from 'qrcode.react';
import LocationMap from './LocationMap';
import { createClient } from '@/lib/supabase/client';
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
  FaEnvelope,
  FaGlobe,
  FaPhone,
  FaMapMarkerAlt,
  FaEdit,
  FaTrash,
  FaArrowLeft,
  FaCopy,
  FaCheck,
  FaDownload,
  FaQrcode,
  FaEye,
  FaHeart,
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

function EntityView({ entity, onBack, onEdit, onDelete, currentUser }) {
  const [copied, setCopied] = useState(false);
  const [currentEntity, setCurrentEntity] = useState(entity);
  const supabase = createClient();

  // Update current entity when prop changes
  useEffect(() => {
    setCurrentEntity(entity);
  }, [entity]);

  // Generate QR code with URL containing UUID
  // Must call hooks before any conditional returns
  const qrCodeValue = useMemo(() => {
    if (!currentEntity || !currentEntity.uuid) return '';
    // Generate URL to icons page with UUID
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    return `${baseUrl}/icons?uuid=${currentEntity.uuid}`;
  }, [currentEntity]);

  // Get shareable link (same as QR code - points to icons page)
  const shareableLink = useMemo(() => {
    if (!currentEntity || !currentEntity.uuid) return '';
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    return `${baseUrl}/icons?uuid=${currentEntity.uuid}`;
  }, [currentEntity]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareableLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = shareableLink;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadQR = () => {
    // Find the QR code SVG element
    const qrCodeSvg = document.querySelector('.qr-code-container svg');
    if (!qrCodeSvg) return;

    // Get SVG data
    const svgData = new XMLSerializer().serializeToString(qrCodeSvg);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    // Convert SVG to PNG using canvas
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Set canvas dimensions (higher resolution for better quality)
      canvas.width = img.width * 2;
      canvas.height = img.height * 2;
      
      // Draw image on canvas
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      // Convert to PNG and download
      canvas.toBlob((blob) => {
        const downloadUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
                      link.download = `${(currentEntity.entity_name || 'profile').replace(/\s+/g, '_')}_QR_Code.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(downloadUrl);
      }, 'image/png');
      
      URL.revokeObjectURL(url);
    };
    
    img.src = url;
  };

  const handleSocialClick = async (platform, url, entityId, e) => {
    e.preventDefault();
    if (!currentEntity?.uuid || !currentEntity?.active) {
      window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }

    try {
      // Track the click using Supabase function
      const { error } = await supabase.rpc('track_social_click', {
        profile_uuid: currentEntity.uuid,
        platform: platform
      });

      if (!error) {
        // Reload entity data to reflect updated click count
        const { data, error: fetchError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', entityId)
          .single();

        if (!fetchError && data) {
          setCurrentEntity(data);
        }
      }
    } catch (error) {
      console.error('Error tracking click:', error);
    }

    // Open in new tab
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  if (!currentEntity) {
    return (
      <div className="entity-view-empty">
        <p>No profile selected</p>
        <button onClick={onBack} className="back-button">
          <FaArrowLeft /> Back to Profiles
        </button>
      </div>
    );
  }

  const socialMediaLinks = Object.keys(currentEntity.social_media || {});

  return (
    <div className="entity-view">
          <div className="entity-view-header">
            <button onClick={onBack} className="back-button">
              <FaArrowLeft /> Back to Profiles
            </button>
            {currentUser && currentUser.id === currentEntity.user_id && (
              <div className="entity-actions">
                <button onClick={() => onEdit(currentEntity)} className="edit-button">
                  <FaEdit /> Edit
                </button>
                <button onClick={() => onDelete(currentEntity.id)} className="delete-button">
                  <FaTrash /> Delete
                </button>
              </div>
            )}
          </div>

      <div className="entity-card">
        <div className="entity-header-top-section">
          <div className="entity-header-top">
            {currentEntity.logo_url && (
              <div className="entity-logo-wrapper">
                <img src={currentEntity.logo_url} alt={`${currentEntity.entity_name} logo`} className="entity-logo" />
              </div>
            )}
            <h1 className="entity-name">{currentEntity.entity_name}</h1>
          </div>
          {currentEntity.description && (
            <p className="entity-description">{currentEntity.description}</p>
          )}
        </div>

        {socialMediaLinks.length > 0 && (
          <div className="social-media-section-top">
            <h2 className="section-title">Social Media</h2>
            <div className="social-links-grid">
              {socialMediaLinks.map((platform) => {
                const platformData = socialMediaPlatforms[platform];
                if (!platformData) return null;

                const Icon = platformData.icon;
                const url = currentEntity.social_media[platform];
                const clickCount = currentEntity.social_clicks?.[platform] || 0;

                return (
                  <a
                    key={platform}
                    href={url}
                    onClick={(e) => handleSocialClick(platform, url, currentEntity.id, e)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="social-link-item"
                    style={{ borderLeftColor: platformData.color }}
                  >
                    <div
                      className="social-link-icon"
                      style={{ backgroundColor: `${platformData.color}15` }}
                    >
                      <Icon
                        className="social-link-icon-svg"
                        style={{ color: platformData.color }}
                      />
                    </div>
                    <div className="social-link-content">
                      <span className="social-link-name">
                        {platformData.name}
                      </span>
                      <span className="social-link-clicks">
                        {clickCount} {clickCount === 1 ? 'click' : 'clicks'}
                      </span>
                    </div>
                  </a>
                );
              })}
            </div>
          </div>
        )}

        <div className="entity-header-with-qr">
          <div className="entity-header-with-qr-top">
            <div className="qr-code-container">
              <div className="qr-code-wrapper">
                <QRCodeSVG
                  value={qrCodeValue}
                  size={360}
                  level="H"
                  includeMargin={true}
                />
                <div className="qr-heart-overlay">
                  <FaHeart className="qr-heart-icon" />
                </div>
              </div>
              <div className="qr-code-right-section">
                <div className="qr-scan-count">
                  <span className="scan-count-label">QR Scans: </span>
                      <span className="scan-count-value">{currentEntity.qr_scans || 0}</span>
                </div>
                <button
                  onClick={handleDownloadQR}
                  className="download-qr-button"
                  title="Download QR Code"
                >
                  <FaDownload /> Download QR Code
                </button>
                <div className="shareable-link-section">
                  <label className="shareable-link-label">Shareable Link</label>
                  <div className="shareable-link-input-group">
                    <input
                      type="text"
                      value={shareableLink}
                      readOnly
                      className="shareable-link-input"
                      onClick={(e) => e.target.select()}
                    />
                    <button
                      onClick={handleCopyLink}
                      className="copy-link-button"
                      title={copied ? 'Copied!' : 'Copy link'}
                    >
                      {copied ? <FaCheck /> : <FaCopy />}
                    </button>
                  </div>
                  {copied && <span className="copy-success">Link copied!</span>}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="entity-details">
          <div className="detail-section">
            <h2 className="section-title">Contact Information</h2>
            <div className="detail-grid">
              {currentEntity.email && (
                <div className="detail-item">
                  <FaEnvelope className="detail-icon" />
                  <div className="detail-content">
                    <span className="detail-label">Email</span>
                    <a href={`mailto:${currentEntity.email}`} className="detail-value">
                      {currentEntity.email}
                    </a>
                  </div>
                </div>
              )}

              {currentEntity.phone && (
                <div className="detail-item">
                  <FaPhone className="detail-icon" />
                  <div className="detail-content">
                    <span className="detail-label">Phone</span>
                    <a href={`tel:${currentEntity.phone}`} className="detail-value">
                      {currentEntity.phone}
                    </a>
                  </div>
                </div>
              )}

              {currentEntity.website && (
                <div className="detail-item">
                  <FaGlobe className="detail-icon" />
                  <div className="detail-content">
                    <span className="detail-label">Website</span>
                    <a
                      href={currentEntity.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="detail-value"
                    >
                      {currentEntity.website}
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>

          {(currentEntity.address || currentEntity.city || currentEntity.country) && (
            <div className="detail-section">
              <h2 className="section-title">Location</h2>
              <div className="location-with-map">
                <div className="location-info">
                  <div className="detail-item">
                    <FaMapMarkerAlt className="detail-icon" />
                    <div className="detail-content">
                      <span className="detail-label">Address</span>
                      <span className="detail-value">
                        {[
                          currentEntity.address,
                          currentEntity.city,
                          currentEntity.country,
                        ]
                          .filter(Boolean)
                          .join(', ')}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="location-map-wrapper">
                  <LocationMap
                    address={currentEntity.address}
                    city={currentEntity.city}
                    country={currentEntity.country}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default EntityView;

