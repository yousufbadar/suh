import React, { useState, useEffect } from 'react';
import './ProfileDashboard.css';
import { getEntityWithAnalytics } from '../utils/storage';
import {
  getSummaryStats,
  getClicksByMinuteWithBreakdown,
  getClicksByHourWithBreakdown,
  getClicksByDayWithBreakdown,
} from '../utils/analytics';
import {
  FaArrowLeft,
  FaChartLine,
  FaCalendarDay,
  FaCalendarWeek,
  FaCalendarAlt,
  FaCalendar,
  FaMousePointer,
  FaChevronLeft,
  FaChevronRight,
  FaSignOutAlt,
  FaSync,
} from 'react-icons/fa';

function ProfileDashboard({ entityId, onBack, onLogout, currentUser }) {
  const [entity, setEntity] = useState(null);
  const [summaryStats, setSummaryStats] = useState(null);
  const [minuteData, setMinuteData] = useState([]);
  const [hourData, setHourData] = useState([]);
  const [dayDataWithBreakdown, setDayDataWithBreakdown] = useState([]);
  const [dayOffset, setDayOffset] = useState(0); // 0 = today, 7 = last week, etc.
  const [minuteOffset, setMinuteOffset] = useState(0); // 0 = now, 30 = 30 minutes ago, etc. (max 120 = 2 hours)
  const [hourOffset, setHourOffset] = useState(0); // 0 = now, 12 = 12 hours ago, etc. (max 7 days = 168 hours)

  useEffect(() => {
    let isMounted = true; // Flag to prevent state updates if component unmounts
    
    const loadEntityData = async () => {
      if (entityId) {
        try {
          const loadedEntity = await getEntityWithAnalytics(entityId);
          if (!isMounted) return; // Don't update state if component unmounted
          if (loadedEntity) {
            console.log('📈 Loaded entity with analytics:', {
              entityId,
              hasQRScans: !!loadedEntity.qrScanTimestamps,
              qrScanCount: loadedEntity.qrScanTimestamps?.length || 0,
              hasClickTimestamps: !!loadedEntity.clickTimestamps,
              clickTimestampKeys: loadedEntity.clickTimestamps ? Object.keys(loadedEntity.clickTimestamps) : [],
              hasCustomLinkTimestamps: !!loadedEntity.customLinkClickTimestamps,
              customLinkTimestampKeys: loadedEntity.customLinkClickTimestamps ? Object.keys(loadedEntity.customLinkClickTimestamps) : [],
            });
            
            setEntity(loadedEntity);
            setSummaryStats(getSummaryStats(loadedEntity));
            // Generate chart data from entity analytics (no additional API calls needed)
            const minute = getClicksByMinuteWithBreakdown(loadedEntity, 30, minuteOffset);
            const hour = getClicksByHourWithBreakdown(loadedEntity, 12, hourOffset);
            const dayBreakdown = getClicksByDayWithBreakdown(loadedEntity, 7, dayOffset);
            
            console.log('📊 Generated chart data from entity analytics:', {
              minuteDataSample: minute.slice(0, 2),
              hourDataSample: hour.slice(0, 2),
              dayDataSample: dayBreakdown.slice(0, 2),
            });
            
            setMinuteData(minute);
            setHourData(hour);
            setDayDataWithBreakdown(dayBreakdown);
          }
        } catch (error) {
          console.error('Error loading entity data:', error);
        }
      }
    };
    loadEntityData();
    
    return () => {
      isMounted = false; // Cleanup: mark as unmounted
    };
  }, [entityId, dayOffset, minuteOffset, hourOffset]);

  // Manual refresh function (auto-refresh disabled to minimize egress)
  const handleManualRefresh = async () => {
    if (!entityId) return;
    
    try {
      const loadedEntity = await getEntityWithAnalytics(entityId);
      if (loadedEntity) {
        setEntity(loadedEntity);
        setSummaryStats(getSummaryStats(loadedEntity));
        // Generate chart data from entity analytics (no additional API calls needed)
        const minute = getClicksByMinuteWithBreakdown(loadedEntity, 30, minuteOffset);
        const hour = getClicksByHourWithBreakdown(loadedEntity, 12, hourOffset);
        const day = getClicksByDayWithBreakdown(loadedEntity, 7, dayOffset);
        setMinuteData(minute);
        setHourData(hour);
        setDayDataWithBreakdown(day);
      }
    } catch (error) {
      console.error('Error refreshing entity data:', error);
    }
  };

  if (!entity) {
    return (
      <div className="dashboard-empty">
        <p>No profile selected</p>
        <button onClick={onBack} className="back-button">
          <FaArrowLeft /> Back
        </button>
      </div>
    );
  }



  // Platform color mapping
  const platformColors = {
    facebook: '#1877f2',
    twitter: '#1da1f2',
    instagram: '#e4405f',
    linkedin: '#0077b5',
    youtube: '#ff0000',
    pinterest: '#bd081c',
    snapchat: '#fffc00',
    tiktok: '#000000',
    reddit: '#ff4500',
    github: '#181717',
    dribbble: '#ea4c89',
    behance: '#1769ff',
    telegram: '#0088cc',
    whatsapp: '#25d366',
    discord: '#5865f2',
    twitch: '#9146ff',
    vimeo: '#1ab7ea',
    flickr: '#ff0084',
  };

  const getPlatformColor = (platform) => {
    return platformColors[platform?.toLowerCase()] || '#10b981';
  };

  const renderBarChart = (data, maxValue, labelKey) => {
    if (!data || data.length === 0) {
      return (
        <div className="chart-empty">
          <p>No data available</p>
        </div>
      );
    }

    // Collect all platforms for legend
    const allPlatforms = new Set();
    data.forEach(item => {
      if (item.platforms) {
        Object.keys(item.platforms).forEach(platform => {
          if (item.platforms[platform] > 0) {
            allPlatforms.add(platform);
          }
        });
      }
    });

    return (
      <div className="chart-container">
        <div className="chart-bars">
          {data.map((item, index) => {
            const total = item.total || 0;
            const height = maxValue > 0 ? (total / maxValue) * 100 : 0;
            const barHeight = total > 0 ? Math.max(height, 5) : 0; // Minimum 5% to ensure visibility
            
            // Build platform segments for stacked bar
            const platformSegments = [];
            if (item.platforms && Object.keys(item.platforms).length > 0) {
              // Sort platforms by count (descending) for consistent stacking
              const sortedPlatforms = Object.entries(item.platforms)
                .filter(([_, count]) => count > 0)
                .sort((a, b) => b[1] - a[1]);
              
              sortedPlatforms.forEach(([platform, count]) => {
                const segmentHeight = total > 0 ? (count / total) * 100 : 0;
                platformSegments.push({
                  platform,
                  count,
                  height: segmentHeight,
                  color: getPlatformColor(platform),
                });
              });
            }
            
            return (
              <div key={index} className="chart-bar-wrapper">
                {/* Always show count above bar */}
                <span className="chart-bar-value-above">{total}</span>
                <div 
                  className="chart-bar-stacked" 
                  style={{ 
                    height: `${barHeight}%`, 
                    minHeight: total > 0 ? '40px' : '0',
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column-reverse',
                  }}
                >
                  {/* QR Scans segment */}
                  {item.qrScans > 0 && (
                    <div
                      className="chart-bar-segment"
                      style={{
                        height: total > 0 ? `${(item.qrScans / total) * 100}%` : '0%',
                        backgroundColor: '#6366f1',
                        minHeight: item.qrScans > 0 ? '4px' : '0',
                      }}
                      title={`QR Scans: ${item.qrScans}`}
                    />
                  )}
                  
                  {/* Platform segments (stacked) */}
                  {platformSegments.map((segment, segIndex) => (
                    <div
                      key={segIndex}
                      className="chart-bar-segment"
                      style={{
                        height: `${segment.height}%`,
                        backgroundColor: segment.color,
                        minHeight: segment.count > 0 ? '4px' : '0',
                      }}
                      title={`${segment.platform}: ${segment.count}`}
                    />
                  ))}
                  
                  {/* Custom Links segment */}
                  {item.customLinkClicks > 0 && (
                    <div
                      className="chart-bar-segment"
                      style={{
                        height: total > 0 ? `${(item.customLinkClicks / total) * 100}%` : '0%',
                        backgroundColor: '#f59e0b',
                        minHeight: item.customLinkClicks > 0 ? '4px' : '0',
                      }}
                      title={`Custom Links: ${item.customLinkClicks}`}
                    />
                  )}
                  
                  {/* Also show count inside bar for tall bars */}
                  {total > 0 && height >= 20 && (
                    <span className="chart-bar-value" style={{ zIndex: 100 }}>
                      {total}
                    </span>
                  )}
                </div>
                <span className="chart-bar-label" title={item.displayTime || item[labelKey] || ''}>
                  {item[labelKey] || item.displayTimeShort || item.displayDate || item.displayTime || item.displayHour || ''}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };


  const getMaxValueForBreakdown = (data) => {
    if (!data || data.length === 0) return 1;
    const totals = data.map((d) => (d.total !== undefined && d.total !== null ? d.total : 0)).filter(c => c > 0);
    if (totals.length === 0) return 1;
    return Math.max(...totals, 1);
  };

  const renderChartLegend = (data) => {
    if (!data || data.length === 0) return null;
    
    // Collect all platforms that have clicks
    const allPlatforms = new Set();
    data.forEach(item => {
      if (item.platforms) {
        Object.keys(item.platforms).forEach(platform => {
          if (item.platforms[platform] > 0) {
            allPlatforms.add(platform);
          }
        });
      }
    });
    
    const sortedPlatforms = Array.from(allPlatforms).sort();
    
    return (
      <div className="chart-legend">
        <div className="legend-item">
          <span className="legend-color" style={{ backgroundColor: '#6366f1' }}></span>
          <span>QR Scans</span>
        </div>
        {sortedPlatforms.map(platform => (
          <div key={platform} className="legend-item">
            <span className="legend-color" style={{ backgroundColor: getPlatformColor(platform) }}></span>
            <span>{platform.charAt(0).toUpperCase() + platform.slice(1)}</span>
          </div>
        ))}
        <div className="legend-item">
          <span className="legend-color" style={{ backgroundColor: '#f59e0b' }}></span>
          <span>Custom Links</span>
        </div>
      </div>
    );
  };

  return (
    <div className="profile-dashboard">
      {onLogout && currentUser && (
        <div className="logout-container-dashboard">
          <button onClick={onLogout} className="logout-button-dashboard" title="Logout">
            <FaSignOutAlt /> Logout ({currentUser.username || currentUser.name || currentUser.email?.split('@')[0] || 'User'})
          </button>
        </div>
      )}
      <div className="dashboard-header">
        <button onClick={onBack} className="back-button">
          <FaArrowLeft /> Back
        </button>
        <button onClick={handleManualRefresh} className="refresh-button" title="Refresh data">
          <FaSync /> Refresh
        </button>
        <div className="dashboard-title-section">
          {entity.logo && (
            <div className="dashboard-logo-wrapper">
              <img src={entity.logo} alt={`${entity.entityName} logo`} className="dashboard-logo" />
            </div>
          )}
          <div>
            <h1 className="dashboard-title">{entity.entityName}</h1>
            <p className="dashboard-subtitle">Profile Analytics Dashboard</p>
          </div>
        </div>
      </div>

      <div className="dashboard-content">
        {/* Summary Statistics */}
        <div className="stats-summary">
          <div className="stat-card">
            <div className="stat-icon today">
              <FaCalendarDay />
            </div>
            <div className="stat-content">
              <div className="stat-value">{summaryStats?.today || 0}</div>
              <div className="stat-label">Today</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon week">
              <FaCalendarWeek />
            </div>
            <div className="stat-content">
              <div className="stat-value">{summaryStats?.thisWeek || 0}</div>
              <div className="stat-label">This Week</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon month">
              <FaCalendarAlt />
            </div>
            <div className="stat-content">
              <div className="stat-value">{summaryStats?.thisMonth || 0}</div>
              <div className="stat-label">This Month</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon year">
              <FaCalendar />
            </div>
            <div className="stat-content">
              <div className="stat-value">{summaryStats?.thisYear || 0}</div>
              <div className="stat-label">This Year</div>
            </div>
          </div>

          <div className="stat-card total">
            <div className="stat-icon total">
              <FaMousePointer />
            </div>
            <div className="stat-content">
              <div className="stat-value">{summaryStats?.total || 0}</div>
              <div className="stat-label">Total Clicks</div>
            </div>
          </div>
        </div>


        {/* Daily Dashboard - Three Bar Graphs */}
        <div className="daily-dashboard-charts">
          {/* Clicks per 5 Minutes */}
          <div className="chart-section">
            <div className="chart-header">
              <h2 className="chart-title">
                <FaChartLine /> Clicks per 5 Minutes (Last 30 Minutes)
              </h2>
              <div className="day-navigation">
                <button
                  className="nav-arrow-button"
                  onClick={async () => {
                    const newOffset = Math.min(120, minuteOffset + 30); // Max 2 hours (120 minutes)
                    setMinuteOffset(newOffset);
                    if (entity) {
                      const data = getClicksByMinuteWithBreakdown(entity, 30, newOffset);
                      setMinuteData(data);
                    }
                  }}
                  disabled={minuteOffset >= 120}
                  title="Go back 30 minutes (max 2 hours)"
                >
                  <FaChevronLeft /> Previous
                </button>
                <span className="day-range-label">
                  {minuteOffset === 0 
                    ? 'Last 30 minutes'
                    : minuteOffset === 30
                    ? '30-60 minutes ago'
                    : `${minuteOffset}-${minuteOffset + 30} minutes ago`}
                </span>
                <button
                  className="nav-arrow-button"
                  onClick={async () => {
                    const newOffset = Math.max(0, minuteOffset - 30);
                    setMinuteOffset(newOffset);
                    if (entity) {
                      const data = getClicksByMinuteWithBreakdown(entity, 30, newOffset);
                      setMinuteData(data);
                    }
                  }}
                  disabled={minuteOffset === 0}
                  title="Go forward 30 minutes"
                >
                  Next <FaChevronRight />
                </button>
              </div>
            </div>
            {renderBarChart(minuteData, getMaxValueForBreakdown(minuteData), 'displayTimeShort')}
            {renderChartLegend(minuteData)}
          </div>

          {/* Clicks per Hour */}
          <div className="chart-section">
            <div className="chart-header">
              <h2 className="chart-title">
                <FaChartLine /> Clicks per Hour (Last 12 Hours)
              </h2>
              <div className="day-navigation">
                <button
                  className="nav-arrow-button"
                  onClick={async () => {
                    const newOffset = Math.min(168, hourOffset + 12); // Max 7 days (168 hours)
                    setHourOffset(newOffset);
                    if (entity) {
                      const data = getClicksByHourWithBreakdown(entity, 12, newOffset);
                      setHourData(data);
                    }
                  }}
                  disabled={hourOffset >= 168}
                  title="Go back 12 hours (max 7 days)"
                >
                  <FaChevronLeft /> Previous
                </button>
                <span className="day-range-label">
                  {hourOffset === 0
                    ? 'Last 12 hours'
                    : hourOffset === 12
                    ? '12-24 hours ago'
                    : `${hourOffset}-${hourOffset + 12} hours ago`}
                </span>
                <button
                  className="nav-arrow-button"
                  onClick={async () => {
                    const newOffset = Math.max(0, hourOffset - 12);
                    setHourOffset(newOffset);
                    if (entity) {
                      const data = getClicksByHourWithBreakdown(entity, 12, newOffset);
                      setHourData(data);
                    }
                  }}
                  disabled={hourOffset === 0}
                  title="Go forward 12 hours"
                >
                  Next <FaChevronRight />
                </button>
              </div>
            </div>
            {renderBarChart(hourData, getMaxValueForBreakdown(hourData), 'displayHour')}
            {renderChartLegend(hourData)}
          </div>

          {/* Clicks per Day */}
          <div className="chart-section">
            <div className="chart-header">
              <h2 className="chart-title">
                <FaChartLine /> Clicks per Day (Last 7 Days)
              </h2>
              <div className="day-navigation">
                <button
                  className="nav-arrow-button"
                  onClick={async () => {
                    const newOffset = dayOffset + 7;
                    setDayOffset(newOffset);
                    if (entity) {
                      const data = getClicksByDayWithBreakdown(entity, 7, newOffset);
                      setDayDataWithBreakdown(data);
                    }
                  }}
                  title="Previous week"
                >
                  <FaChevronLeft /> Previous
                </button>
                <span className="day-range-label">
                  {dayDataWithBreakdown.length > 0 && (
                    <>
                      {dayDataWithBreakdown[0].displayDate} - {dayDataWithBreakdown[dayDataWithBreakdown.length - 1].displayDate}
                    </>
                  )}
                </span>
                    <button
                      className="nav-arrow-button"
                      onClick={async () => {
                        const newOffset = Math.max(0, dayOffset - 7);
                        setDayOffset(newOffset);
                        if (entityId && entity) {
                          const data = getClicksByDayWithBreakdown(entity, 7, newOffset);
                          setDayDataWithBreakdown(data);
                        }
                      }}
                      disabled={dayOffset === 0}
                      title="Next week"
                    >
                      Next <FaChevronRight />
                    </button>
              </div>
            </div>
            {renderBarChart(dayDataWithBreakdown, getMaxValueForBreakdown(dayDataWithBreakdown), 'displayDate')}
            {renderChartLegend(dayDataWithBreakdown)}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProfileDashboard;

