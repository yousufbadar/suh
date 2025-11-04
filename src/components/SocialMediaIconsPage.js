import React, { useEffect, useState, useRef } from 'react';
import './SocialMediaIconsPage.css';
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
  const supabase = createClient();

  useEffect(() => {
    if (uuid && !hasTracked.current) {
      loadEntity();
    } else if (!uuid) {
      setLoading(false);
    }
  }, [uuid]);

  const loadEntity = async () => {
    if (!uuid) {
      setLoading(false);
      return;
    }

    try {
      // Get profile by UUID
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('uuid', uuid)
        .single();

      if (error) {
        console.error('Error loading entity:', error);
        setLoading(false);
        return;
      }

      if (data) {
        setEntity(data);
        
        // Track QR scan (once per session)
        const scanKey = `qr_scanned_${uuid}`;
        const alreadyScanned = sessionStorage.getItem(scanKey);
        
        if (!alreadyScanned && data.active) {
          // Call Supabase function to track scan
          const { error: trackError } = await supabase.rpc('track_qr_scan', {
            profile_uuid: uuid
          });
          
          if (!trackError) {
            sessionStorage.setItem(scanKey, 'true');
            // Reload entity to get updated scan count
            loadEntity();
          }
          hasTracked.current = true;
        } else {
          hasTracked.current = true;
        }
      }
      setLoading(false);
    } catch (error) {
      console.error('Error:', error);
      setLoading(false);
    }
  };

  const handleSocialClick = async (platform, url, entityId) => {
    if (!uuid || !entity?.active) return;

    try {
      // Track the click using Supabase function
      const { error } = await supabase.rpc('track_social_click', {
        profile_uuid: uuid,
        platform: platform
      });

      if (!error) {
        // Reload entity data to reflect updated click count
        await loadEntity();
      }
    } catch (error) {
      console.error('Error tracking click:', error);
    }

    // Open in new tab
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  if (loading) {
    return (
      <div className="social-icons-page">
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
        <div className="error-container">
          <h1>Profile Not Found</h1>
          <p>The QR code is invalid or the profile has been removed.</p>
        </div>
      </div>
    );
  }

  const socialMediaLinks = Object.keys(entity.social_media || {});

  if (socialMediaLinks.length === 0) {
    return (
      <div className="social-icons-page">
        <div className="social-icons-container">
          <p className="no-links-message">No social media links available for this profile.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="social-icons-page">
      <div className="social-icons-container">
        <div className="company-header">
          {entity.logo_url && (
            <div className="company-logo-wrapper">
              <img src={entity.logo_url} alt={`${entity.entity_name} logo`} className="company-logo" />
            </div>
          )}
          <h1 className="company-name">{entity.entity_name}</h1>
        </div>
        <div className="social-icons-grid">
          {socialMediaLinks.map((platform) => {
            const platformData = socialMediaPlatforms[platform];
            if (!platformData) return null;

            const Icon = platformData.icon;
            const url = entity.social_media[platform];

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
        </div>
      </div>
    </div>
  );
}

export default SocialMediaIconsPage;

