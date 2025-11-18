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
 * Get clicks by minute
 * @param {Object} entity - The entity object
 * @param {number} hours - Number of hours to show (default: 24)
 */
export const getClicksByMinute = (entity, hours = 24) => {
  const timestamps = getAllClickTimestamps(entity);
  const now = new Date();
  const startTime = new Date(now.getTime() - hours * 60 * 60 * 1000);
  
  const clicksByMinute = {};
  
  timestamps.forEach((timestamp) => {
    const date = new Date(timestamp);
    if (date >= startTime) {
      // Create a key: YYYY-MM-DD-HH-MM
      const minuteKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}-${String(date.getHours()).padStart(2, '0')}-${String(date.getMinutes()).padStart(2, '0')}`;
      clicksByMinute[minuteKey] = (clicksByMinute[minuteKey] || 0) + 1;
    }
  });
  
  // Generate minute intervals
  const result = [];
  for (let i = hours * 60 - 1; i >= 0; i--) {
    const minuteDate = new Date(now.getTime() - i * 60 * 1000);
    const minuteKey = `${minuteDate.getFullYear()}-${String(minuteDate.getMonth() + 1).padStart(2, '0')}-${String(minuteDate.getDate()).padStart(2, '0')}-${String(minuteDate.getHours()).padStart(2, '0')}-${String(minuteDate.getMinutes()).padStart(2, '0')}`;
    
    result.push({
      date: minuteDate.toISOString(),
      dateKey: minuteKey,
      count: clicksByMinute[minuteKey] || 0,
      displayTime: minuteDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
      displayDate: minuteDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    });
  }
  
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

/**
 * Get clicks by 5-minute intervals with breakdown by click type
 * @param {Object} entity - The entity object with analytics
 * @param {number} minutes - Number of minutes to show (default: 30)
 * @param {number} offsetMinutes - Number of minutes to offset from now (default: 0)
 */
export const getClicksByMinuteWithBreakdown = (entity, minutes = 30, offsetMinutes = 0) => {
  const now = new Date();
  const endTime = new Date(now.getTime() - offsetMinutes * 60 * 1000);
  const startTime = new Date(endTime.getTime() - minutes * 60 * 1000);
  
  console.log('⏰ Minute breakdown time range:', {
    now: now.toISOString(),
    endTime: endTime.toISOString(),
    startTime: startTime.toISOString(),
    minutes,
    offsetMinutes,
  });
  
  // Initialize data structure - group by 5-minute intervals
  const clicksByInterval = {};
  
  // Helper function to get 5-minute interval key
  const getIntervalKey = (date) => {
    const intervalMinute = Math.floor(date.getMinutes() / 5) * 5;
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}-${String(date.getHours()).padStart(2, '0')}-${String(intervalMinute).padStart(2, '0')}`;
  };
  
  // Process QR scan timestamps
  if (entity.qrScanTimestamps && Array.isArray(entity.qrScanTimestamps)) {
    let qrScansInRange = 0;
    entity.qrScanTimestamps.forEach((timestamp) => {
      const date = new Date(timestamp);
      if (date >= startTime && date <= endTime) {
        qrScansInRange++;
        const intervalKey = getIntervalKey(date);
        if (!clicksByInterval[intervalKey]) {
          clicksByInterval[intervalKey] = { qrScans: 0, socialClicks: 0, customLinkClicks: 0, total: 0 };
        }
        clicksByInterval[intervalKey].qrScans++;
        clicksByInterval[intervalKey].total++;
      }
    });
    console.log('📱 QR scans in range:', qrScansInRange, 'of', entity.qrScanTimestamps.length);
  }
  
  // Process social media click timestamps
  if (entity.clickTimestamps) {
    let socialClicksInRange = 0;
    let totalSocialClicks = 0;
    let clicksOutsideRange = [];
    Object.values(entity.clickTimestamps).forEach((platformTimestamps) => {
      if (Array.isArray(platformTimestamps)) {
        totalSocialClicks += platformTimestamps.length;
        platformTimestamps.forEach((timestamp) => {
          const date = new Date(timestamp);
          const isInRange = date >= startTime && date <= endTime;
          
          if (isInRange) {
            socialClicksInRange++;
            const intervalKey = getIntervalKey(date);
            if (!clicksByInterval[intervalKey]) {
              clicksByInterval[intervalKey] = { qrScans: 0, socialClicks: 0, customLinkClicks: 0, total: 0 };
            }
            clicksByInterval[intervalKey].socialClicks++;
            clicksByInterval[intervalKey].total++;
            
            // Debug first few matches
            if (socialClicksInRange <= 3) {
              console.log('✅ Click in range:', {
                timestamp,
                date: date.toISOString(),
                localTime: date.toLocaleString(),
                intervalKey,
                startTime: startTime.toISOString(),
                endTime: endTime.toISOString(),
              });
            }
          } else {
            // Only log first few outside range to avoid spam
            if (clicksOutsideRange.length < 3) {
              clicksOutsideRange.push({
                timestamp,
                date: date.toISOString(),
                localTime: date.toLocaleString(),
                startTime: startTime.toISOString(),
                endTime: endTime.toISOString(),
                dateBeforeStart: date < startTime,
                dateAfterEnd: date > endTime,
              });
            }
          }
        });
      }
    });
    console.log('🖱️ Social clicks in range:', socialClicksInRange, 'of', totalSocialClicks);
    if (clicksOutsideRange.length > 0) {
      console.log('⚠️ Clicks outside range (first 3):', clicksOutsideRange.slice(0, 3));
    }
    console.log('📊 Clicks by interval keys:', Object.keys(clicksByInterval));
  }
  
  // Process custom link click timestamps
  if (entity.customLinkClickTimestamps) {
    let customClicksInRange = 0;
    let totalCustomClicks = 0;
    Object.values(entity.customLinkClickTimestamps).forEach((linkTimestamps) => {
      if (Array.isArray(linkTimestamps)) {
        totalCustomClicks += linkTimestamps.length;
        linkTimestamps.forEach((timestamp) => {
          const date = new Date(timestamp);
          if (date >= startTime && date <= endTime) {
            customClicksInRange++;
            const intervalKey = getIntervalKey(date);
            if (!clicksByInterval[intervalKey]) {
              clicksByInterval[intervalKey] = { qrScans: 0, socialClicks: 0, customLinkClicks: 0, total: 0 };
            }
            clicksByInterval[intervalKey].customLinkClicks++;
            clicksByInterval[intervalKey].total++;
          }
        });
      }
    });
    console.log('🔗 Custom clicks in range:', customClicksInRange, 'of', totalCustomClicks);
  }
  
  // Generate 5-minute intervals for the specified time range
  const result = [];
  const intervalCount = Math.ceil(minutes / 5); // Number of 5-minute intervals
  
  console.log('📅 Generating intervals:', {
    intervalCount,
    clicksByIntervalKeys: Object.keys(clicksByInterval),
    clicksByIntervalData: clicksByInterval,
  });
  
  for (let i = intervalCount - 1; i >= 0; i--) {
    const intervalDate = new Date(endTime.getTime() - i * 5 * 60 * 1000);
    // Round down to the nearest 5-minute mark
    intervalDate.setMinutes(Math.floor(intervalDate.getMinutes() / 5) * 5);
    intervalDate.setSeconds(0);
    intervalDate.setMilliseconds(0);
    
    const intervalKey = getIntervalKey(intervalDate);
    const data = clicksByInterval[intervalKey] || { qrScans: 0, socialClicks: 0, customLinkClicks: 0, total: 0 };
    
    console.log('📊 Interval:', {
      i,
      intervalDate: intervalDate.toISOString(),
      intervalKey,
      data,
      hasData: !!clicksByInterval[intervalKey],
    });
    
    // Create a readable time label
    const nextInterval = new Date(intervalDate.getTime() + 5 * 60 * 1000);
    const displayTime = `${intervalDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })} - ${nextInterval.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}`;
    
    result.push({
      date: intervalDate.toISOString(),
      dateKey: intervalKey,
      ...data,
      displayTime: displayTime,
      displayTimeShort: intervalDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
      displayDate: intervalDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    });
  }
  
  console.log('✅ Final result:', result.map(r => ({ key: r.dateKey, total: r.total, time: r.displayTimeShort })));
  
  return result;
};

/**
 * Get clicks by hour with breakdown by click type
 * @param {Object} entity - The entity object with analytics
 * @param {number} days - Number of days to show (default: 7)
 */
export const getClicksByHourWithBreakdown = (entity, days = 7) => {
  const now = new Date();
  const startTime = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  
  console.log('⏰ Hour breakdown time range:', {
    now: now.toISOString(),
    startTime: startTime.toISOString(),
    days,
  });
  
  // Initialize data structure
  const clicksByHour = {};
  
  // Process QR scan timestamps
  if (entity.qrScanTimestamps && Array.isArray(entity.qrScanTimestamps)) {
    let qrScansInRange = 0;
    entity.qrScanTimestamps.forEach((timestamp) => {
      const date = new Date(timestamp);
      if (date >= startTime) {
        qrScansInRange++;
        const hourKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}-${String(date.getHours()).padStart(2, '0')}`;
        if (!clicksByHour[hourKey]) {
          clicksByHour[hourKey] = { qrScans: 0, socialClicks: 0, customLinkClicks: 0, total: 0 };
        }
        clicksByHour[hourKey].qrScans++;
        clicksByHour[hourKey].total++;
      }
    });
    console.log('📱 QR scans in hour range:', qrScansInRange, 'of', entity.qrScanTimestamps.length);
  }
  
  // Process social media click timestamps
  if (entity.clickTimestamps) {
    let socialClicksInRange = 0;
    let totalSocialClicks = 0;
    Object.values(entity.clickTimestamps).forEach((platformTimestamps) => {
      if (Array.isArray(platformTimestamps)) {
        totalSocialClicks += platformTimestamps.length;
        platformTimestamps.forEach((timestamp) => {
          const date = new Date(timestamp);
          if (date >= startTime) {
            socialClicksInRange++;
            const hourKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}-${String(date.getHours()).padStart(2, '0')}`;
            if (!clicksByHour[hourKey]) {
              clicksByHour[hourKey] = { qrScans: 0, socialClicks: 0, customLinkClicks: 0, total: 0 };
            }
            clicksByHour[hourKey].socialClicks++;
            clicksByHour[hourKey].total++;
          }
        });
      }
    });
    console.log('🖱️ Social clicks in hour range:', socialClicksInRange, 'of', totalSocialClicks);
  }
  
  // Process custom link click timestamps
  if (entity.customLinkClickTimestamps) {
    let customClicksInRange = 0;
    let totalCustomClicks = 0;
    Object.values(entity.customLinkClickTimestamps).forEach((linkTimestamps) => {
      if (Array.isArray(linkTimestamps)) {
        totalCustomClicks += linkTimestamps.length;
        linkTimestamps.forEach((timestamp) => {
          const date = new Date(timestamp);
          if (date >= startTime) {
            customClicksInRange++;
            const hourKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}-${String(date.getHours()).padStart(2, '0')}`;
            if (!clicksByHour[hourKey]) {
              clicksByHour[hourKey] = { qrScans: 0, socialClicks: 0, customLinkClicks: 0, total: 0 };
            }
            clicksByHour[hourKey].customLinkClicks++;
            clicksByHour[hourKey].total++;
          }
        });
      }
    });
    console.log('🔗 Custom clicks in hour range:', customClicksInRange, 'of', totalCustomClicks);
  }
  
  // Generate hour intervals
  const result = [];
  for (let i = days * 24 - 1; i >= 0; i--) {
    const hourDate = new Date(now.getTime() - i * 60 * 60 * 1000);
    const hourKey = `${hourDate.getFullYear()}-${String(hourDate.getMonth() + 1).padStart(2, '0')}-${String(hourDate.getDate()).padStart(2, '0')}-${String(hourDate.getHours()).padStart(2, '0')}`;
    const data = clicksByHour[hourKey] || { qrScans: 0, socialClicks: 0, customLinkClicks: 0, total: 0 };
    
    result.push({
      date: hourDate.toISOString(),
      dateKey: hourKey,
      ...data,
      displayTime: hourDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
      displayDate: hourDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      displayHour: hourDate.toLocaleTimeString('en-US', { hour: '2-digit', hour12: true }),
    });
  }
  
  return result;
};

/**
 * Get clicks by day with breakdown by click type
 * @param {Object} entity - The entity object with analytics
 * @param {number} days - Number of days to show (default: 7)
 * @param {number} dayOffset - Number of days to offset from today (0 = today)
 */
export const getClicksByDayWithBreakdown = (entity, days = 7, dayOffset = 0) => {
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
  
  // Process QR scan timestamps
  if (entity.qrScanTimestamps && Array.isArray(entity.qrScanTimestamps)) {
    entity.qrScanTimestamps.forEach((timestamp) => {
      const date = new Date(timestamp);
      const dateNormalized = new Date(date);
      dateNormalized.setHours(0, 0, 0, 0);
      
      if (dateNormalized >= startDate && dateNormalized <= endDate) {
        const dayKey = dateNormalized.toISOString().split('T')[0];
        if (!clicksByDay[dayKey]) {
          clicksByDay[dayKey] = { qrScans: 0, socialClicks: 0, customLinkClicks: 0, total: 0 };
        }
        clicksByDay[dayKey].qrScans++;
        clicksByDay[dayKey].total++;
      }
    });
  }
  
  // Process social media click timestamps
  if (entity.clickTimestamps) {
    Object.values(entity.clickTimestamps).forEach((platformTimestamps) => {
      if (Array.isArray(platformTimestamps)) {
        platformTimestamps.forEach((timestamp) => {
          const date = new Date(timestamp);
          const dateNormalized = new Date(date);
          dateNormalized.setHours(0, 0, 0, 0);
          
          if (dateNormalized >= startDate && dateNormalized <= endDate) {
            const dayKey = dateNormalized.toISOString().split('T')[0];
            if (!clicksByDay[dayKey]) {
              clicksByDay[dayKey] = { qrScans: 0, socialClicks: 0, customLinkClicks: 0, total: 0 };
            }
            clicksByDay[dayKey].socialClicks++;
            clicksByDay[dayKey].total++;
          }
        });
      }
    });
  }
  
  // Process custom link click timestamps
  if (entity.customLinkClickTimestamps) {
    Object.values(entity.customLinkClickTimestamps).forEach((linkTimestamps) => {
      if (Array.isArray(linkTimestamps)) {
        linkTimestamps.forEach((timestamp) => {
          const date = new Date(timestamp);
          const dateNormalized = new Date(date);
          dateNormalized.setHours(0, 0, 0, 0);
          
          if (dateNormalized >= startDate && dateNormalized <= endDate) {
            const dayKey = dateNormalized.toISOString().split('T')[0];
            if (!clicksByDay[dayKey]) {
              clicksByDay[dayKey] = { qrScans: 0, socialClicks: 0, customLinkClicks: 0, total: 0 };
            }
            clicksByDay[dayKey].customLinkClicks++;
            clicksByDay[dayKey].total++;
          }
        });
      }
    });
  }
  
  // Fill in missing days with 0, from oldest to newest
  const result = [];
  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    date.setHours(0, 0, 0, 0);
    const dayKey = date.toISOString().split('T')[0];
    const data = clicksByDay[dayKey] || { qrScans: 0, socialClicks: 0, customLinkClicks: 0, total: 0 };
    
    result.push({
      date: dayKey,
      ...data,
      displayDate: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    });
  }
  
  return result;
};

