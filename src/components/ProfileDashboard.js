import React, { useState, useEffect } from 'react';
import './ProfileDashboard.css';
import { getEntityById } from '../utils/storage';
import {
  getSummaryStats,
  getClicksByDay,
  getClicksByWeek,
  getClicksByMonth,
  getClicksByYear,
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
} from 'react-icons/fa';

function ProfileDashboard({ entityId, onBack }) {
  const [entity, setEntity] = useState(null);
  const [summaryStats, setSummaryStats] = useState(null);
  const [dailyData, setDailyData] = useState([]);
  const [weeklyData, setWeeklyData] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);
  const [yearlyData, setYearlyData] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState('day');
  const [dayOffset, setDayOffset] = useState(0); // 0 = today, 7 = last week, etc.

  useEffect(() => {
    if (entityId) {
      const loadedEntity = getEntityById(entityId);
      if (loadedEntity) {
        setEntity(loadedEntity);
        setSummaryStats(getSummaryStats(loadedEntity));
        const daily = getClicksByDay(loadedEntity, 7, dayOffset);
        const weekly = getClicksByWeek(loadedEntity, 8);
        const monthly = getClicksByMonth(loadedEntity, 12);
        const yearly = getClicksByYear(loadedEntity);
        setDailyData(daily);
        setWeeklyData(weekly);
        setMonthlyData(monthly);
        setYearlyData(yearly);
      }
    }
  }, [entityId, dayOffset]);

  // Refresh data periodically
  useEffect(() => {
    const interval = setInterval(() => {
      if (entityId) {
        const loadedEntity = getEntityById(entityId);
        if (loadedEntity) {
          setEntity(loadedEntity);
          setSummaryStats(getSummaryStats(loadedEntity));
          setDailyData(getClicksByDay(loadedEntity, 7, dayOffset));
          setWeeklyData(getClicksByWeek(loadedEntity, 8));
          setMonthlyData(getClicksByMonth(loadedEntity, 12));
          setYearlyData(getClicksByYear(loadedEntity));
        }
      }
    }, 5000); // Refresh every 5 seconds

    return () => clearInterval(interval);
  }, [entityId]);

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

  const getCurrentData = () => {
    switch (selectedPeriod) {
      case 'day':
        return dailyData || [];
      case 'week':
        return weeklyData || [];
      case 'month':
        return monthlyData || [];
      case 'year':
        return yearlyData || [];
      default:
        return dailyData || [];
    }
  };

  const getMaxValue = () => {
    const data = getCurrentData();
    if (!data || data.length === 0) return 1;
    const counts = data.map((d) => (d.count !== undefined && d.count !== null ? d.count : 0)).filter(c => c > 0);
    if (counts.length === 0) return 1;
    return Math.max(...counts, 1);
  };

  const renderChart = () => {
    const data = getCurrentData();
    const maxValue = getMaxValue();

    if (!data || data.length === 0) {
      return (
        <div className="chart-empty">
          <p>No data available for the selected period</p>
        </div>
      );
    }
    
    return (
      <div className="chart-container">
        <div className="chart-bars">
          {data.map((item, index) => {
            const count = item.count !== undefined && item.count !== null ? item.count : 0;
            const height = maxValue > 0 ? (count / maxValue) * 100 : 0;
            const barHeight = count > 0 ? Math.max(height, 8) : 0; // Ensure minimum height to show value
            const showValueOutside = height < 15 && count > 0; // Show value above bar if bar is too small
            
            return (
              <div key={index} className="chart-bar-wrapper">
                {(showValueOutside || count === 0) && (
                  <span className="chart-bar-value-above">{count}</span>
                )}
                <div className="chart-bar" style={{ height: `${barHeight}%`, minHeight: count > 0 ? '30px' : '0' }}>
                  {count > 0 && !showValueOutside && (
                    <span className="chart-bar-value">{count}</span>
                  )}
                </div>
                <span className="chart-bar-label">
                  {selectedPeriod === 'day'
                    ? (item.displayDate || item.date || '')
                    : selectedPeriod === 'week'
                    ? (item.displayWeek || `${item.weekStart || ''} - ${item.weekEnd || ''}`)
                    : selectedPeriod === 'month'
                    ? (item.displayMonth || item.month || '')
                    : (item.displayYear || item.year || '')}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="profile-dashboard">
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

        {/* Period Selector */}
        <div className="period-selector">
          <button
            className={`period-button ${selectedPeriod === 'day' ? 'active' : ''}`}
            onClick={() => {
              setSelectedPeriod('day');
              setDayOffset(0);
              // Force refresh data
              if (entityId) {
                const loadedEntity = getEntityById(entityId);
                if (loadedEntity) {
                  setDailyData(getClicksByDay(loadedEntity, 7, 0));
                }
              }
            }}
          >
            <FaCalendarDay /> Daily
          </button>
          <button
            className={`period-button ${selectedPeriod === 'week' ? 'active' : ''}`}
            onClick={() => {
              setSelectedPeriod('week');
              // Force refresh data
              if (entityId) {
                const loadedEntity = getEntityById(entityId);
                if (loadedEntity) {
                  setWeeklyData(getClicksByWeek(loadedEntity, 8));
                }
              }
            }}
          >
            <FaCalendarWeek /> Weekly
          </button>
          <button
            className={`period-button ${selectedPeriod === 'month' ? 'active' : ''}`}
            onClick={() => setSelectedPeriod('month')}
          >
            <FaCalendarAlt /> Monthly
          </button>
          <button
            className={`period-button ${selectedPeriod === 'year' ? 'active' : ''}`}
            onClick={() => setSelectedPeriod('year')}
          >
            <FaCalendar /> Yearly
          </button>
        </div>

        {/* Chart Section */}
        <div className="chart-section">
          <div className="chart-header">
            <h2 className="chart-title">
              <FaChartLine /> Clicks by {selectedPeriod === 'day' ? 'Day' : selectedPeriod === 'week' ? 'Week' : selectedPeriod === 'month' ? 'Month' : 'Year'}
            </h2>
            {selectedPeriod === 'day' && (
              <div className="day-navigation">
                <button
                  className="nav-arrow-button"
                  onClick={() => setDayOffset(dayOffset + 7)}
                  title="Previous week"
                >
                  <FaChevronLeft /> Previous
                </button>
                <span className="day-range-label">
                  {dailyData.length > 0 && (
                    <>
                      {dailyData[0].displayDate} - {dailyData[dailyData.length - 1].displayDate}
                    </>
                  )}
                </span>
                <button
                  className="nav-arrow-button"
                  onClick={() => setDayOffset(Math.max(0, dayOffset - 7))}
                  disabled={dayOffset === 0}
                  title="Next week"
                >
                  Next <FaChevronRight />
                </button>
              </div>
            )}
          </div>
          {renderChart()}
        </div>
      </div>
    </div>
  );
}

export default ProfileDashboard;

