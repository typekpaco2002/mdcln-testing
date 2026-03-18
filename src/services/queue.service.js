/**
 * Request Queue System for WaveSpeed Bronze Tier
 * Handles 3 concurrent request limit gracefully
 */

class RequestQueue {
  constructor(maxConcurrent = 3) {
    this.maxConcurrent = maxConcurrent;
    this.activeRequests = 0;
    this.queue = [];
  }

  /**
   * Add request to queue and process when slot available
   * @param {Function} requestFn - Async function to execute
   * @param {number} timeoutMs - Max time to wait in queue (default: 10 minutes)
   */
  async enqueue(requestFn, timeoutMs = 600000) {
    return new Promise((resolve, reject) => {
      const request = {
        fn: requestFn,
        resolve,
        reject,
        timestamp: Date.now(),
        timeout: null
      };

      // Set timeout to prevent requests from sitting in queue forever
      request.timeout = setTimeout(() => {
        const index = this.queue.indexOf(request);
        if (index > -1) {
          this.queue.splice(index, 1);
          reject(new Error(`Queue timeout: Request waited ${timeoutMs/1000}s without processing`));
          console.error(`⏱️ Queue timeout: Request removed after ${timeoutMs/1000}s`);
        }
      }, timeoutMs);

      this.queue.push(request);
      console.log(`📋 Request added to queue. Queue length: ${this.queue.length}, Active: ${this.activeRequests}`);
      
      this.processQueue();
    });
  }

  /**
   * Process next request in queue if slot available
   */
  async processQueue() {
    // Check if we can process more requests
    if (this.activeRequests >= this.maxConcurrent) {
      console.log(`⏸️  Queue paused: ${this.activeRequests}/${this.maxConcurrent} slots used`);
      return;
    }

    // Get next request from queue
    const request = this.queue.shift();
    if (!request) {
      return; // Queue is empty
    }

    this.activeRequests++;
    const waitTime = Date.now() - request.timestamp;
    console.log(`▶️  Processing request (waited ${Math.round(waitTime/1000)}s). Active: ${this.activeRequests}/${this.maxConcurrent}`);

    // Clear timeout since we're processing now
    if (request.timeout) {
      clearTimeout(request.timeout);
    }

    try {
      const result = await request.fn();
      request.resolve(result);
    } catch (error) {
      request.reject(error);
    } finally {
      this.activeRequests--;
      console.log(`✅ Request completed. Active: ${this.activeRequests}/${this.maxConcurrent}, Queue: ${this.queue.length}`);
      
      // Process next request
      this.processQueue();
    }
  }

  /**
   * Get queue statistics
   */
  getStats() {
    return {
      active: this.activeRequests,
      queued: this.queue.length,
      maxConcurrent: this.maxConcurrent,
      total: this.activeRequests + this.queue.length
    };
  }

  /**
   * Update max concurrent limit (for when you upgrade to Silver/Gold)
   */
  updateConcurrentLimit(newLimit) {
    const oldLimit = this.maxConcurrent;
    this.maxConcurrent = newLimit;
    console.log(`🔄 Concurrent limit updated: ${oldLimit} → ${newLimit}`);
    
    // Process queue in case we can handle more now
    this.processQueue();
  }
}

// Singleton instance
// 100 max concurrent (KIE can have 100 jobs in flight); KIE rate limit 20 new jobs per 10s.
const parsedMaxConcurrent = parseInt(process.env.WAVESPEED_MAX_CONCURRENT || "100", 10);
const MAX_CONCURRENT = Number.isFinite(parsedMaxConcurrent) && parsedMaxConcurrent > 0 ? parsedMaxConcurrent : 100;
const requestQueue = new RequestQueue(MAX_CONCURRENT);

console.log(`🚀 Request Queue initialized with ${MAX_CONCURRENT} concurrent slots (KIE: 100 concurrent, 20 new/10s)`);

export default requestQueue;
