# Egress Optimization Guide

This document outlines the optimizations implemented to reduce Supabase egress usage.

## Optimizations Implemented

### 1. Dashboard Auto-Refresh Disabled
- **Before**: Auto-refreshed every 30 seconds (then 2 minutes)
- **After**: Auto-refresh completely disabled
- **Added**: Manual refresh button for on-demand updates
- **Impact**: Eliminates all automatic dashboard queries (100% reduction)
- **Benefit**: Users control when data is refreshed, saving significant egress

### 3. Reduced Date Range Queries
- **Before**: Queried 2 days before and after the target range
- **After**: Queries 1 day before and after
- **Impact**: Reduces data fetched per query by ~33%
- **Note**: Still handles timezone edge cases effectively

### 4. Removed Unnecessary Entity Reloads
- **Before**: After tracking a click, the entire entity was reloaded with analytics
- **After**: Click tracking happens asynchronously without reload
- **Impact**: Eliminates 2-3 queries per click (one for entity, one for analytics)
- **Benefit**: Dashboard will refresh automatically, showing updated counts

### 5. Home Page Stats Caching
- **Added**: 5-minute cache for home page summary statistics
- **Impact**: Reduces queries when navigating back to home page
- **Storage**: Uses sessionStorage (cleared on browser close)

### 6. Conditional Loading
- **Added**: Skip analytics loading if no active profiles exist
- **Impact**: Prevents unnecessary queries for empty states

## Expected Egress Reduction

Based on typical usage patterns:

- **Dashboard**: ~75% reduction (from 30s to 2min polling)
- **Click Tracking**: ~100% reduction (removed reload queries)
- **Home Page**: ~50-80% reduction (caching + conditional loading)
- **Date Range**: ~33% reduction per query

**Overall Expected Reduction**: 60-70% of previous egress usage

## Monitoring

To monitor your egress usage:

1. Go to Supabase Dashboard → Settings → Usage
2. Check the "Egress" section
3. Review daily breakdown to see patterns
4. Adjust polling intervals if needed

## Further Optimizations (If Needed)

If you still exceed limits, consider:

1. **Increase polling interval** to 5 minutes (change `120000` to `300000` in ProfileDashboard.js)
2. **Extend cache TTL** to 10 minutes (change `300000` to `600000` in Home.js)
3. **Disable auto-refresh** on dashboard (remove polling entirely, refresh only on user action)
4. **Batch queries** - combine multiple queries into single requests where possible
5. **Use Supabase Realtime** - subscribe to changes instead of polling (if real-time updates are critical)

## Configuration

Current settings can be adjusted in:

- **Dashboard polling**: `src/components/ProfileDashboard.js` line 93 (120000 = 2 minutes)
- **Home cache TTL**: `src/components/Home.js` line 50 (300000 = 5 minutes)
- **Date range buffer**: `src/utils/storage.js` lines 799-802 (1 day buffer)

## Notes

- Caching uses `sessionStorage` which is cleared when the browser closes
- Visibility API is supported in all modern browsers
- Click tracking still works correctly - counts update on next dashboard refresh
- All optimizations maintain functionality while reducing data transfer

