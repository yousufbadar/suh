import React, { useState, useEffect, useRef, useMemo } from 'react';
import './Home.css';
import { FaHeart, FaQrcode, FaShareAlt, FaUsers, FaRocket, FaSignInAlt, FaList, FaPlus, FaUser, FaChartBar, FaMousePointer, FaSignOutAlt, FaCrown } from 'react-icons/fa';
import { getTheme, applyTheme } from '../utils/theme';
import { getEntityWithAnalytics } from '../utils/storage';
function Home({ onGetStarted, onLogin, currentUser, onViewProfiles, onCreateProfile, onViewDashboard, onLogout, entities, onViewSubscription, subscriptionStatus }) {
  const [summaryStats, setSummaryStats] = useState({ totalScans: 0, totalClicks: 0, totalProfiles: 0 });
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const isLoadingRef = useRef(false);
  const lastEntitiesRef = useRef(null);

  // Apply theme on mount
  useEffect(() => {
    const theme = getTheme();
    applyTheme(theme);
  }, []);

  // Log user state for debugging
  useEffect(() => {
    console.log('🏠 Home component - User state:', currentUser ? `Logged in as ${currentUser.email}` : 'Not logged in');
  }, [currentUser]);

  // Memoize entities to prevent unnecessary recalculations
  const entitiesKey = useMemo(() => {
    if (!entities || entities.length === 0) return null;
    // Create a stable key based on entity IDs and active status
    return entities
      .filter(e => e.active !== false)
      .map(e => `${e.id}-${e.active}`)
      .sort()
      .join(',');
  }, [entities]);

  // Load summary statistics for all profiles (with caching to reduce egress)
  useEffect(() => {
    const loadSummaryStats = async () => {
      // Prevent multiple simultaneous loads
      if (isLoadingRef.current) {
        return;
      }

      // Check if entities actually changed
      if (lastEntitiesRef.current === entitiesKey && entitiesKey !== null) {
        return;
      }

      if (!currentUser || !entities || entities.length === 0) {
        if (lastEntitiesRef.current !== null) {
          setSummaryStats({ totalScans: 0, totalClicks: 0, totalProfiles: 0 });
          setIsLoadingStats(false);
          lastEntitiesRef.current = null;
        }
        return;
      }

      // Check cache (5 minute TTL to reduce egress)
      const cacheKey = `home_stats_${currentUser.id}_${entitiesKey}`;
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        try {
          const { stats, timestamp } = JSON.parse(cached);
          const age = Date.now() - timestamp;
          if (age < 300000) { // 5 minutes
            console.log('📊 Using cached home stats');
            setSummaryStats(stats);
            lastEntitiesRef.current = entitiesKey;
            return;
        }
        } catch (e) {
          // Invalid cache, continue to load
        }
      }

      isLoadingRef.current = true;
      setIsLoadingStats(true);
      
      try {
        let totalScans = 0;
        let totalClicks = 0;
        const activeProfiles = entities.filter(e => e.active !== false);

        // Only load analytics if we have profiles (optimized: skip if no profiles)
        if (activeProfiles.length === 0) {
          const newStats = { totalScans: 0, totalClicks: 0, totalProfiles: 0 };
          setSummaryStats(newStats);
          sessionStorage.setItem(cacheKey, JSON.stringify({ stats: newStats, timestamp: Date.now() }));
          lastEntitiesRef.current = entitiesKey;
          return;
        }

        // Load analytics for each profile in parallel for better performance
        const analyticsPromises = activeProfiles.map(entity => getEntityWithAnalytics(entity.id));
        const analyticsResults = await Promise.all(analyticsPromises);

        analyticsResults.forEach((entityWithAnalytics) => {
          if (entityWithAnalytics) {
            // Count QR scans
            if (entityWithAnalytics.qrScanTimestamps && Array.isArray(entityWithAnalytics.qrScanTimestamps)) {
              totalScans += entityWithAnalytics.qrScanTimestamps.length;
            }

            // Count social media clicks
            if (entityWithAnalytics.clickTimestamps) {
              Object.values(entityWithAnalytics.clickTimestamps).forEach((platformTimestamps) => {
                if (Array.isArray(platformTimestamps)) {
                  totalClicks += platformTimestamps.length;
                }
              });
            }

            // Count custom link clicks
            if (entityWithAnalytics.customLinkClickTimestamps) {
              Object.values(entityWithAnalytics.customLinkClickTimestamps).forEach((linkTimestamps) => {
                if (Array.isArray(linkTimestamps)) {
                  totalClicks += linkTimestamps.length;
                }
              });
            }
          }
        });

        const newStats = {
          totalScans,
          totalClicks,
          totalProfiles: activeProfiles.length
        };

        // Cache the results
        sessionStorage.setItem(cacheKey, JSON.stringify({ stats: newStats, timestamp: Date.now() }));

        // Only update if stats actually changed
        setSummaryStats(prevStats => {
          if (prevStats.totalScans === newStats.totalScans &&
              prevStats.totalClicks === newStats.totalClicks &&
              prevStats.totalProfiles === newStats.totalProfiles) {
            return prevStats; // Return previous to prevent re-render
          }
          return newStats;
        });

        lastEntitiesRef.current = entitiesKey;
      } catch (error) {
        console.error('Error loading summary stats:', error);
        const activeProfiles = entities.filter(e => e.active !== false);
        setSummaryStats({ totalScans: 0, totalClicks: 0, totalProfiles: activeProfiles.length });
        lastEntitiesRef.current = entitiesKey;
      } finally {
        setIsLoadingStats(false);
        isLoadingRef.current = false;
      }
    };

    loadSummaryStats();
  }, [currentUser, entitiesKey, entities]);


  console.log('Home component rendering, onGetStarted:', typeof onGetStarted);

  // If user is logged in, show personalized dashboard
  if (currentUser) {
    return (
      <div className="home-page">
        {onLogout && (
          <div className="logout-container-home">
            <button type="button" onClick={onLogout} className="logout-button-home" title="Logout">
              <FaSignOutAlt /> Logout ({currentUser.name || currentUser.username || currentUser.email?.split('@')[0] || 'User'})
            </button>
          </div>
        )}
        <div className="home-hero">
          <div className="hero-content">
            <div className="hero-brand-row">
              <div className="hero-icon-wrapper hero-logo-wrapper">
                <img src="/logo.png" alt="Share Your Heart" className="hero-logo" />
                <div className="floating-emoji">✨</div>
                <div className="floating-emoji delay-1">💜</div>
                <div className="floating-emoji delay-2">🔥</div>
              </div>
              <div className="hero-brand-text">
                <h1 className="hero-heading">Share your heart today</h1>
                <p className="hero-tagline">your experience today at this place, for all your friends to see!!!</p>
              </div>
            </div>
            <h2 className="hero-title hero-welcome-title">
              Welcome back,<br />
              <span className="gradient-text">{currentUser.name || currentUser.username || (currentUser.email ? currentUser.email.split('@')[0] : 'User')}</span>! 👋
            </h2>
            <p className="hero-subtitle">
              Manage your profiles and connect with your audience
              <br />
              Ready to create something amazing? Let's go! 🚀
            </p>
            
            {/* Summary Statistics */}
            {currentUser && (
              <div style={{ 
                display: 'flex', 
                gap: '2rem', 
                justifyContent: 'center', 
                flexWrap: 'wrap',
                marginTop: '2rem',
                padding: '1.5rem',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '12px',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                minHeight: '120px',
                alignItems: 'center'
              }}>
                {isLoadingStats ? (
                  <div style={{ textAlign: 'center', width: '100%', opacity: 0.7 }}>
                    Loading statistics...
                  </div>
                ) : (
                  <>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--primary-color, #6366f1)' }}>
                        {summaryStats.totalProfiles}
                      </div>
                      <div style={{ fontSize: '0.9rem', opacity: 0.8, marginTop: '0.5rem' }}>
                        {summaryStats.totalProfiles === 1 ? 'Profile' : 'Profiles'}
                      </div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--primary-color, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                        <FaQrcode /> {summaryStats.totalScans.toLocaleString()}
                      </div>
                      <div style={{ fontSize: '0.9rem', opacity: 0.8, marginTop: '0.5rem' }}>
                        {summaryStats.totalScans === 1 ? 'QR Scan' : 'QR Scans'}
                      </div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--primary-color, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                        <FaMousePointer /> {summaryStats.totalClicks.toLocaleString()}
                      </div>
                      <div style={{ fontSize: '0.9rem', opacity: 0.8, marginTop: '0.5rem' }}>
                        {summaryStats.totalClicks === 1 ? 'Click' : 'Clicks'}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              {onViewProfiles && (
                <button onClick={onViewProfiles} className="cta-button">
                  <FaList /> View My Profiles
                </button>
              )}
              {onCreateProfile && (
                <button onClick={onCreateProfile} className="cta-button" style={{ backgroundColor: 'transparent', border: '2px solid currentColor' }}>
                  <FaPlus /> Create New Profile
                </button>
              )}
              {onViewDashboard && entities && entities.length > 0 && (
                <button 
                  onClick={() => onViewDashboard(entities[0])} 
                  className="cta-button"
                  style={{ backgroundColor: 'transparent', border: '2px solid currentColor' }}
                >
                  <FaChartBar /> View Dashboard
                </button>
              )}
              {currentUser && subscriptionStatus?.trialActive && subscriptionStatus?.trialDaysRemaining != null && onViewSubscription && (
                <button 
                  type="button"
                  onClick={onViewSubscription}
                  className="cta-button"
                  style={{ backgroundColor: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', fontWeight: 600, cursor: 'pointer' }}
                  title="View subscription and manage trial"
                >
                  <FaCrown /> Trial: {subscriptionStatus.trialDaysRemaining} day{subscriptionStatus.trialDaysRemaining !== 1 ? 's' : ''} remaining
                </button>
              )}
              {onViewSubscription && currentUser && subscriptionStatus?.isActive && (
                <button 
                  onClick={onViewSubscription} 
                  className="cta-button"
                  style={{ backgroundColor: 'transparent', border: '2px solid currentColor' }}
                >
                  <FaCrown /> Manage subscription
                </button>
              )}
              {onViewSubscription && currentUser && subscriptionStatus?.hasSubscriptionRecord && !subscriptionStatus?.isActive && !subscriptionStatus?.trialActive && (
                <button
                  onClick={onViewSubscription}
                  type="button"
                  className="cta-button"
                  style={{ backgroundColor: '#ffd700', color: '#2d3748', border: 'none', flexDirection: 'column', gap: '0.25rem' }}
                >
                  <span style={{ fontSize: '0.9rem', opacity: 0.95 }}>Trial Ended</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 600 }}>
                    <FaCrown /> Upgrade
                  </span>
                </button>
              )}
              {onViewSubscription && currentUser && !subscriptionStatus?.hasSubscriptionRecord && !subscriptionStatus?.isActive && !subscriptionStatus?.trialActive && (
                <button 
                  onClick={onViewSubscription} 
                  type="button"
                  className="cta-button"
                  style={{ backgroundColor: '#ffd700', color: '#2d3748', border: 'none' }}
                >
                  <FaCrown /> Upgrade Plan
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="features-section">
          <div className="container">
            <h2 className="features-title">
              <span className="gradient-text">Quick Actions</span> ⚡
            </h2>
            <div className="features-grid">
              <div className="feature-card" style={{ cursor: 'pointer' }} onClick={onViewProfiles}>
                <div className="feature-icon">
                  <FaList />
                </div>
                <h3 className="feature-title">View All Profiles 📋</h3>
                <p className="feature-description">
                  See and manage all your profiles in one place. Edit, archive, or view analytics.
                </p>
              </div>

              <div className="feature-card" style={{ cursor: 'pointer' }} onClick={onCreateProfile}>
                <div className="feature-icon">
                  <FaPlus />
                </div>
                <h3 className="feature-title">Create New Profile ✨</h3>
                <p className="feature-description">
                  Add a new profile with all your social links. Takes just a few minutes!
                </p>
              </div>

              <div className="feature-card">
                <div className="feature-icon">
                  <FaQrcode />
                </div>
                <h3 className="feature-title">QR Codes 📱</h3>
                <p className="feature-description">
                  Each profile gets its own unique QR code. Download and share anywhere!
                </p>
              </div>

              <div className="feature-card" style={{ cursor: onViewDashboard && entities && entities.length > 0 ? 'pointer' : 'default' }} onClick={onViewDashboard && entities && entities.length > 0 ? () => onViewDashboard(entities[0]) : undefined}>
                <div className="feature-icon">
                  <FaChartBar />
                </div>
                <h3 className="feature-title">View Dashboard 📊</h3>
                <p className="feature-description">
                  {entities && entities.length > 0 
                    ? 'Track scans and clicks to see which platforms your audience loves most.'
                    : 'Create a profile first to view analytics and track performance.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Original landing page for non-logged-in users
  return (
    <div className="home-page">
      <div className="home-hero">
        <div className="hero-content">
          <div className="hero-brand-row">
            <div className="hero-icon-wrapper hero-logo-wrapper">
              <img src="/logo.png" alt="Share Your Heart" className="hero-logo" />
              <div className="floating-emoji">✨</div>
              <div className="floating-emoji delay-1">💜</div>
              <div className="floating-emoji delay-2">🔥</div>
            </div>
            <div className="hero-brand-text">
              <h1 className="hero-heading">Share your heart today</h1>
              <p className="hero-tagline">your experience today at this place, for all your friends to see!!!</p>
            </div>
          </div>
          <p className="hero-subtitle">
            One QR code. All your socials. No cap. 🚀
            <br />
            Connect with your crew across every platform, periodt.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={onGetStarted} className="cta-button">
              Let's Gooo! <FaRocket className="cta-rocket" />
            </button>
            {onLogin && (
              <button onClick={onLogin} className="cta-button" style={{ backgroundColor: 'transparent', border: '2px solid currentColor' }}>
                <FaSignInAlt /> Login
              </button>
            )}
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

      <div className="cta-section">
        <div className="container">
          <h2 className="cta-title">Ready to level up your socials? 🔥</h2>
          <p className="cta-text">Let's get this bread and connect with your people</p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={onGetStarted} className="cta-button-large">
              Create Your Profile RN
              <FaRocket className="cta-rocket" />
            </button>
            {onLogin && (
              <button onClick={onLogin} className="cta-button-large" style={{ backgroundColor: 'transparent', border: '2px solid currentColor' }}>
                <FaSignInAlt /> Login
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Home;

