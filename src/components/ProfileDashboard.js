import React, { useState, useEffect } from 'react';
import './ProfileDashboard.css';
import { getEntityWithAnalytics } from '../utils/storage';
import {
  getSummaryStats,
} from '../utils/analytics';
import {
  getClicksByMinuteDirect,
  getClicksByHourDirect,
  getClicksByDayDirect,
} from '../utils/storage';
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
    const loadEntityData = async () => {
      if (entityId) {
        try {
          const loadedEntity = await getEntityWithAnalytics(entityId);
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
            // Use direct database queries instead of timestamp reconstruction
            const minute = await getClicksByMinuteDirect(loadedEntity.id, loadedEntity.uuid, 30, minuteOffset);
            const hour = await getClicksByHourDirect(loadedEntity.id, loadedEntity.uuid, 12, hourOffset);
            const dayBreakdown = await getClicksByDayDirect(loadedEntity.id, loadedEntity.uuid, 7, dayOffset);
            
            console.log('📊 Generated chart data:', {
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
  }, [entityId, dayOffset, minuteOffset, hourOffset]);

  // Refresh data periodically
  useEffect(() => {
    const interval = setInterval(async () => {
      if (entityId) {
        try {
          const loadedEntity = await getEntityWithAnalytics(entityId);
          if (loadedEntity) {
            setEntity(loadedEntity);
            setSummaryStats(getSummaryStats(loadedEntity));
            setMinuteData(await getClicksByMinuteDirect(loadedEntity.id, loadedEntity.uuid, 30, minuteOffset));
            setHourData(await getClicksByHourDirect(loadedEntity.id, loadedEntity.uuid, 12, hourOffset));
            setDayDataWithBreakdown(await getClicksByDayDirect(loadedEntity.id, loadedEntity.uuid, 7, dayOffset));
          }
        } catch (error) {
          console.error('Error refreshing entity data:', error);
        }
      }
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [entityId, dayOffset, minuteOffset, hourOffset]);

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



  const renderBarChart = (data, maxValue, labelKey) => {
    if (!data || data.length === 0) {
      return (
        <div className="chart-empty">
          <p>No data available</p>
        </div>
      );
    }

    return (
      <div className="chart-container">
        <div className="chart-bars">
          {data.map((item, index) => {
            const total = item.total || 0;
            const height = maxValue > 0 ? (total / maxValue) * 100 : 0;
            const barHeight = total > 0 ? Math.max(height, 5) : 0; // Minimum 5% to ensure visibility
            
            return (
              <div key={index} className="chart-bar-wrapper">
                {/* Always show count above bar */}
                <span className="chart-bar-value-above">{total}</span>
                <div 
                  className="chart-bar" 
                  style={{ 
                    height: `${barHeight}%`, 
                    minHeight: total > 0 ? '40px' : '0',
                    position: 'relative',
                  }}
                >
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
                    if (entityId && entity) {
                      const data = await getClicksByMinuteDirect(entityId, entity.uuid, 30, newOffset);
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
                    if (entityId && entity) {
                      const data = await getClicksByMinuteDirect(entityId, entity.uuid, 30, newOffset);
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
            <div className="chart-legend">
              <div className="legend-item">
                <span className="legend-color" style={{ backgroundColor: '#6366f1' }}></span>
                <span>QR Scans</span>
              </div>
              <div className="legend-item">
                <span className="legend-color" style={{ backgroundColor: '#10b981' }}></span>
                <span>Social Clicks</span>
              </div>
              <div className="legend-item">
                <span className="legend-color" style={{ backgroundColor: '#f59e0b' }}></span>
                <span>Custom Links</span>
              </div>
            </div>
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
                    if (entityId && entity) {
                      const data = await getClicksByHourDirect(entityId, entity.uuid, 12, newOffset);
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
                    if (entityId && entity) {
                      const data = await getClicksByHourDirect(entityId, entity.uuid, 12, newOffset);
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
            <div className="chart-legend">
              <div className="legend-item">
                <span className="legend-color" style={{ backgroundColor: '#6366f1' }}></span>
                <span>QR Scans</span>
              </div>
              <div className="legend-item">
                <span className="legend-color" style={{ backgroundColor: '#10b981' }}></span>
                <span>Social Clicks</span>
              </div>
              <div className="legend-item">
                <span className="legend-color" style={{ backgroundColor: '#f59e0b' }}></span>
                <span>Custom Links</span>
              </div>
            </div>
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
                    if (entityId && entity) {
                      const data = await getClicksByDayDirect(entityId, entity.uuid, 7, newOffset);
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
                          const data = await getClicksByDayDirect(entityId, entity.uuid, 7, newOffset);
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
            <div className="chart-legend">
              <div className="legend-item">
                <span className="legend-color" style={{ backgroundColor: '#6366f1' }}></span>
                <span>QR Scans</span>
              </div>
              <div className="legend-item">
                <span className="legend-color" style={{ backgroundColor: '#10b981' }}></span>
                <span>Social Clicks</span>
              </div>
              <div className="legend-item">
                <span className="legend-color" style={{ backgroundColor: '#f59e0b' }}></span>
                <span>Custom Links</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProfileDashboard;

