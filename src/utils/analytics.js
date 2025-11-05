// Analytics utility functions for aggregating click data

/**
 * Get all click timestamps for an entity (social media + custom links + QR scans)
 */
export const getAllClickTimestamps = (entity) => {
  const timestamps = [];
  
  // QR scan timestamps
  if (entity.qrScanTimestamps && Array.isArray(entity.qrScanTimestamps)) {
    timestamps.push(...entity.qrScanTimestamps);
  }
  
  // Social media click timestamps
  if (entity.clickTimestamps) {
    Object.values(entity.clickTimestamps).forEach((platformTimestamps) => {
      if (Array.isArray(platformTimestamps)) {
        timestamps.push(...platformTimestamps);
      }
    });
  }
  
  // Custom link click timestamps
  if (entity.customLinkClickTimestamps) {
    Object.values(entity.customLinkClickTimestamps).forEach((linkTimestamps) => {
      if (Array.isArray(linkTimestamps)) {
        timestamps.push(...linkTimestamps);
      }
    });
  }
  
  return timestamps.sort((a, b) => new Date(a) - new Date(b));
};

/**
 * Get clicks by day
 * @param {Object} entity - The entity object
 * @param {number} days - Number of days to show (default: 7)
 * @param {number} dayOffset - Number of days to offset from today (0 = today, 7 = last week)
 */
export const getClicksByDay = (entity, days = 7, dayOffset = 0) => {
  const timestamps = getAllClickTimestamps(entity);
  const now = new Date();
  
  // Calculate the end date (today - dayOffset), normalized to start of day
  const endDate = new Date(now);
  endDate.setDate(now.getDate() - dayOffset);
  endDate.setHours(0, 0, 0, 0);
  
  // Calculate the start date (days - 1 days before endDate)
  const startDate = new Date(endDate);
  startDate.setDate(endDate.getDate() - (days - 1));
  startDate.setHours(0, 0, 0, 0);
  
  const clicksByDay = {};
  
  timestamps.forEach((timestamp) => {
    const date = new Date(timestamp);
    // Normalize to start of day for comparison
    const dateNormalized = new Date(date);
    dateNormalized.setHours(0, 0, 0, 0);
    
    if (dateNormalized >= startDate && dateNormalized <= endDate) {
      const dayKey = dateNormalized.toISOString().split('T')[0]; // YYYY-MM-DD
      clicksByDay[dayKey] = (clicksByDay[dayKey] || 0) + 1;
    }
  });
  
  // Fill in missing days with 0, from oldest to newest
  const result = [];
  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    date.setHours(0, 0, 0, 0);
    const dayKey = date.toISOString().split('T')[0];
    result.push({
      date: dayKey,
      count: clicksByDay[dayKey] || 0,
      displayDate: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    });
  }
  
  return result;
};

/**
 * Get clicks by week
 */
export const getClicksByWeek = (entity, weeks = 8) => {
  const timestamps = getAllClickTimestamps(entity);
  const now = new Date();
  
  // Get current week's Sunday (end of week)
  const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const currentWeekSunday = new Date(now);
  currentWeekSunday.setDate(now.getDate() + (7 - currentDay)); // Go to Sunday
  currentWeekSunday.setHours(23, 59, 59, 999); // End of Sunday
  
  const clicksByWeek = {};
  
  timestamps.forEach((timestamp) => {
    const date = new Date(timestamp);
    // Get the start of the week (Monday) for this timestamp
    const weekStart = new Date(date);
    const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
    // Calculate Monday: if Sunday (0), go back 6 days; otherwise go back (dayOfWeek - 1) days
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    weekStart.setDate(date.getDate() - daysToMonday);
    weekStart.setHours(0, 0, 0, 0);
    const weekKey = weekStart.toISOString().split('T')[0];
    clicksByWeek[weekKey] = (clicksByWeek[weekKey] || 0) + 1;
  });
  
  // Generate week ranges (Monday to Sunday)
  const result = [];
  for (let i = 0; i < weeks; i++) {
    // Calculate Sunday for this week (going back i weeks)
    const weekSunday = new Date(currentWeekSunday);
    weekSunday.setDate(currentWeekSunday.getDate() - (i * 7));
    weekSunday.setHours(23, 59, 59, 999);
    
    // Calculate Monday (start of week) - 6 days before Sunday
    const weekMonday = new Date(weekSunday);
    weekMonday.setDate(weekSunday.getDate() - 6);
    weekMonday.setHours(0, 0, 0, 0);
    
    const weekKey = weekMonday.toISOString().split('T')[0];
    
    result.push({
      weekStart: weekKey,
      weekEnd: weekSunday.toISOString().split('T')[0],
      count: clicksByWeek[weekKey] || 0,
      displayWeek: `${weekMonday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekSunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
    });
  }
  
  return result.reverse();
};

/**
 * Get clicks by month
 */
export const getClicksByMonth = (entity, months = 12) => {
  const timestamps = getAllClickTimestamps(entity);
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);
  
  const clicksByMonth = {};
  
  timestamps.forEach((timestamp) => {
    const date = new Date(timestamp);
    if (date >= startDate) {
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      clicksByMonth[monthKey] = (clicksByMonth[monthKey] || 0) + 1;
    }
  });
  
  // Generate month ranges
  const result = [];
  for (let i = 0; i < months; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    result.push({
      month: monthKey,
      count: clicksByMonth[monthKey] || 0,
      displayMonth: date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    });
  }
  
  return result.reverse();
};

/**
 * Get clicks by year
 */
export const getClicksByYear = (entity) => {
  const timestamps = getAllClickTimestamps(entity);
  const clicksByYear = {};
  
  timestamps.forEach((timestamp) => {
    const date = new Date(timestamp);
    const yearKey = date.getFullYear().toString();
    clicksByYear[yearKey] = (clicksByYear[yearKey] || 0) + 1;
  });
  
  // Convert to array and sort
  const result = Object.keys(clicksByYear)
    .sort()
    .map((year) => ({
      year: year,
      count: clicksByYear[year],
      displayYear: year,
    }));
  
  return result;
};

/**
 * Get summary statistics
 */
export const getSummaryStats = (entity) => {
  const timestamps = getAllClickTimestamps(entity);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const thisWeek = new Date(today);
  thisWeek.setDate(today.getDate() - today.getDay());
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisYear = new Date(now.getFullYear(), 0, 1);
  
  const todayCount = timestamps.filter((ts) => new Date(ts) >= today).length;
  const weekCount = timestamps.filter((ts) => new Date(ts) >= thisWeek).length;
  const monthCount = timestamps.filter((ts) => new Date(ts) >= thisMonth).length;
  const yearCount = timestamps.filter((ts) => new Date(ts) >= thisYear).length;
  const totalCount = timestamps.length;
  
  return {
    today: todayCount,
    thisWeek: weekCount,
    thisMonth: monthCount,
    thisYear: yearCount,
    total: totalCount,
  };
};

