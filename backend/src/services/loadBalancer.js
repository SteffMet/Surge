const axios = require('axios');
const logger = require('../utils/logger');

class LoadBalancer {
  constructor() {
    this.searchWorkers = [
      { url: 'http://localhost:3001', healthy: true, lastCheck: Date.now() },
    ];
    this.embeddingWorkers = [
      { url: 'http://localhost:3002', healthy: true, lastCheck: Date.now() },
    ];
    this.currentSearchIndex = 0;
    this.currentEmbeddingIndex = 0;
    this.healthCheckInterval = 30000; // 30 seconds
    
    // Start health checks
    this.startHealthChecks();
  }

  // Round-robin load balancing for search workers
  getNextSearchWorker() {
    const healthyWorkers = this.searchWorkers.filter(worker => worker.healthy);
    
    if (healthyWorkers.length === 0) {
      throw new Error('No healthy search workers available');
    }

    const worker = healthyWorkers[this.currentSearchIndex % healthyWorkers.length];
    this.currentSearchIndex = (this.currentSearchIndex + 1) % healthyWorkers.length;
    
    return worker;
  }

  // Round-robin load balancing for embedding workers
  getNextEmbeddingWorker() {
    const healthyWorkers = this.embeddingWorkers.filter(worker => worker.healthy);
    
    if (healthyWorkers.length === 0) {
      throw new Error('No healthy embedding workers available');
    }

    const worker = healthyWorkers[this.currentEmbeddingIndex % healthyWorkers.length];
    this.currentEmbeddingIndex = (this.currentEmbeddingIndex + 1) % healthyWorkers.length;
    
    return worker;
  }

  // Proxy search request to worker
  async proxySearchRequest(endpoint, data, timeout = 10000) {
    const maxRetries = 3;
    let lastError;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const worker = this.getNextSearchWorker();
        logger.info(`LoadBalancer: Proxying search request to ${worker.url}${endpoint}`);

        const response = await axios.post(`${worker.url}${endpoint}`, data, {
          timeout,
          headers: {
            'Content-Type': 'application/json',
          },
        });

        return response.data;
      } catch (error) {
        lastError = error;
        logger.warn(`LoadBalancer: Search request failed (attempt ${attempt + 1}):`, error.message);
        
        // Mark worker as unhealthy if it's a connection error
        if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
          this.markWorkerUnhealthy('search', error.config?.baseURL);
        }
        
        // Wait before retry
        if (attempt < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
        }
      }
    }

    throw new Error(`Search request failed after ${maxRetries} attempts: ${lastError.message}`);
  }

  // Proxy embedding request to worker
  async proxyEmbeddingRequest(endpoint, data, timeout = 30000) {
    const maxRetries = 2;
    let lastError;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const worker = this.getNextEmbeddingWorker();
        logger.info(`LoadBalancer: Proxying embedding request to ${worker.url}${endpoint}`);

        const response = await axios.post(`${worker.url}${endpoint}`, data, {
          timeout,
          headers: {
            'Content-Type': 'application/json',
          },
        });

        return response.data;
      } catch (error) {
        lastError = error;
        logger.warn(`LoadBalancer: Embedding request failed (attempt ${attempt + 1}):`, error.message);
        
        // Mark worker as unhealthy if it's a connection error
        if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
          this.markWorkerUnhealthy('embedding', error.config?.baseURL);
        }
        
        // Wait before retry
        if (attempt < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000 * (attempt + 1)));
        }
      }
    }

    throw new Error(`Embedding request failed after ${maxRetries} attempts: ${lastError.message}`);
  }

  // Mark worker as unhealthy
  markWorkerUnhealthy(type, url) {
    const workers = type === 'search' ? this.searchWorkers : this.embeddingWorkers;
    const worker = workers.find(w => w.url === url);
    
    if (worker) {
      worker.healthy = false;
      worker.lastCheck = Date.now();
      logger.warn(`LoadBalancer: Marked ${type} worker ${url} as unhealthy`);
    }
  }

  // Health check for workers
  async checkWorkerHealth(worker, type) {
    try {
      const response = await axios.get(`${worker.url}/health`, {
        timeout: 5000,
      });

      if (response.status === 200 && response.data.status === 'healthy') {
        if (!worker.healthy) {
          logger.info(`LoadBalancer: ${type} worker ${worker.url} is back online`);
        }
        worker.healthy = true;
      } else {
        worker.healthy = false;
      }
    } catch (error) {
      if (worker.healthy) {
        logger.warn(`LoadBalancer: ${type} worker ${worker.url} health check failed:`, error.message);
      }
      worker.healthy = false;
    }
    
    worker.lastCheck = Date.now();
  }

  // Start periodic health checks
  startHealthChecks() {
    setInterval(async () => {
      logger.debug('LoadBalancer: Running health checks...');
      
      // Check search workers
      const searchChecks = this.searchWorkers.map(worker => 
        this.checkWorkerHealth(worker, 'search')
      );
      
      // Check embedding workers
      const embeddingChecks = this.embeddingWorkers.map(worker => 
        this.checkWorkerHealth(worker, 'embedding')
      );
      
      await Promise.all([...searchChecks, ...embeddingChecks]);
      
      const healthySearch = this.searchWorkers.filter(w => w.healthy).length;
      const healthyEmbedding = this.embeddingWorkers.filter(w => w.healthy).length;
      
      logger.debug(`LoadBalancer: Health check complete - Search: ${healthySearch}/${this.searchWorkers.length}, Embedding: ${healthyEmbedding}/${this.embeddingWorkers.length}`);
    }, this.healthCheckInterval);
  }

  // Get load balancer status
  getStatus() {
    return {
      searchWorkers: this.searchWorkers.map(worker => ({
        url: worker.url,
        healthy: worker.healthy,
        lastCheck: new Date(worker.lastCheck).toISOString(),
      })),
      embeddingWorkers: this.embeddingWorkers.map(worker => ({
        url: worker.url,
        healthy: worker.healthy,
        lastCheck: new Date(worker.lastCheck).toISOString(),
      })),
      healthySearchWorkers: this.searchWorkers.filter(w => w.healthy).length,
      healthyEmbeddingWorkers: this.embeddingWorkers.filter(w => w.healthy).length,
    };
  }

  // Add worker dynamically
  addWorker(type, url) {
    const workers = type === 'search' ? this.searchWorkers : this.embeddingWorkers;
    
    if (!workers.find(w => w.url === url)) {
      workers.push({
        url,
        healthy: true,
        lastCheck: Date.now(),
      });
      
      logger.info(`LoadBalancer: Added ${type} worker: ${url}`);
    }
  }

  // Remove worker dynamically
  removeWorker(type, url) {
    const workers = type === 'search' ? this.searchWorkers : this.embeddingWorkers;
    const index = workers.findIndex(w => w.url === url);
    
    if (index !== -1) {
      workers.splice(index, 1);
      logger.info(`LoadBalancer: Removed ${type} worker: ${url}`);
    }
  }
}

// Create singleton instance
const loadBalancer = new LoadBalancer();

module.exports = loadBalancer;