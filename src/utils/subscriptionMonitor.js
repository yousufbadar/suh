// Subscription Monitoring Service
// This service periodically checks subscription status and handles expirations

import { checkExpiredSubscriptions, monitorSubscriptions } from './subscriptionTracking';

class SubscriptionMonitor {
  constructor() {
    this.intervalId = null;
    this.isRunning = false;
    this.checkInterval = 60 * 60 * 1000; // Check every hour by default
  }

  /**
   * Start monitoring subscriptions
   * @param {number} intervalMs - Interval in milliseconds (default: 1 hour)
   */
  start(intervalMs = null) {
    if (this.isRunning) {
      console.warn('⚠️  Subscription monitor is already running');
      return;
    }

    if (intervalMs) {
      this.checkInterval = intervalMs;
    }

    console.log(`🔄 Starting subscription monitor (checking every ${this.checkInterval / 1000 / 60} minutes)`);
    
    // Run immediately
    this.check();

    // Then run at intervals
    this.intervalId = setInterval(() => {
      this.check();
    }, this.checkInterval);

    this.isRunning = true;
  }

  /**
   * Stop monitoring subscriptions
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('⏹️  Subscription monitor stopped');
  }

  /**
   * Perform a subscription check
   */
  async check() {
    try {
      console.log('🔍 Running subscription check...');
      const result = await monitorSubscriptions();
      
      if (result && result.expiredCount > 0) {
        console.warn(`⚠️  ${result.expiredCount} subscription(s) expired`);
      }
      
      return result;
    } catch (error) {
      console.error('❌ Error during subscription check:', error);
      return null;
    }
  }

  /**
   * Get monitor status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      checkInterval: this.checkInterval,
      nextCheck: this.intervalId ? new Date(Date.now() + this.checkInterval) : null,
    };
  }
}

// Create singleton instance
const subscriptionMonitor = new SubscriptionMonitor();

// Auto-start in browser (optional - you may want to control this manually)
if (typeof window !== 'undefined') {
  // Only start if we're in a browser environment
  // You might want to start this from your App component instead
  // subscriptionMonitor.start();
}

export default subscriptionMonitor;
export { SubscriptionMonitor };

