module.exports = {
  apps: [
    {
      name: 'surge-main',
      script: 'src/index.js',
      instances: 2, // Main API instances
      exec_mode: 'cluster',
      env_development: {
        NODE_ENV: 'development',
        PORT: 3000,
        WORKER_TYPE: 'main'
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
        WORKER_TYPE: 'main'
      },
      // Performance optimizations for main API
      max_memory_restart: '1G',
      node_args: '--max-old-space-size=1024',

      // Logging
      log_file: './logs/main-combined.log',
      out_file: './logs/main-out.log',
      error_file: './logs/main-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',

      // Restart policy
      restart_delay: 2000,
      max_restarts: 10,
      min_uptime: '10s',

      // Graceful shutdown
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000
    },
    {
      name: 'surge-search',
      script: 'src/workers/searchWorker.js',
      instances: 'max', // Dedicated search workers using all remaining cores
      exec_mode: 'cluster',
      env_development: {
        NODE_ENV: 'development',
        PORT: 3001,
        WORKER_TYPE: 'search'
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001,
        WORKER_TYPE: 'search'
      },
      // Optimized for search operations
      max_memory_restart: '2G', // More memory for search operations
      node_args: '--max-old-space-size=2048 --optimize-for-size',

      // Search-specific logging
      log_file: './logs/search-combined.log',
      out_file: './logs/search-out.log',
      error_file: './logs/search-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',

      // Faster restart for search workers
      restart_delay: 1000,
      max_restarts: 15,
      min_uptime: '5s',

      // Search worker specific settings
      kill_timeout: 3000,
      wait_ready: true,
      listen_timeout: 8000,

      // Health monitoring for search performance
      health_check_grace_period: 2000,
      health_check_fatal_exceptions: true
    },
    {
      name: 'surge-embedding',
      script: 'src/workers/embeddingWorker.js',
      instances: 1, // Single instance for embedding processing
      exec_mode: 'fork',
      env_development: {
        NODE_ENV: 'development',
        WORKER_TYPE: 'embedding'
      },
      env_production: {
        NODE_ENV: 'production',
        WORKER_TYPE: 'embedding'
      },
      // High memory for embedding operations
      max_memory_restart: '3G',
      node_args: '--max-old-space-size=3072',

      // Embedding worker logging
      log_file: './logs/embedding-combined.log',
      out_file: './logs/embedding-out.log',
      error_file: './logs/embedding-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',

      // Embedding worker restart policy
      restart_delay: 5000,
      max_restarts: 5,
      min_uptime: '30s',

      // Longer timeout for embedding operations
      kill_timeout: 10000,
      wait_ready: true,
      listen_timeout: 15000
    }
  ]
};