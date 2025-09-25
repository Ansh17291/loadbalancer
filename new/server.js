// ==================== MAIN LOAD BALANCER SERVER ====================
// server.js

const express = require('express');
const http = require('http');
const httpProxy = require('http-proxy-middleware');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');
const redis = require('redis');
const geoip = require('geoip-lite');
const useragent = require('express-useragent');
const winston = require('winston');
const socketIo = require('socket.io');
const { createProxyMiddleware } = require('http-proxy-middleware');

// ==================== CONFIGURATION ====================
const config = {
  port: process.env.PORT || 3000,
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  servers: [
    { id: 'server1', url: 'http://localhost:8001', weight: 1, healthy: true },
    { id: 'server2', url: 'http://localhost:8002', weight: 1, healthy: true },
    { id: 'server3', url: 'http://localhost:8003', weight: 1, healthy: true },
    { id: 'server4', url: 'http://localhost:8004', weight: 1, healthy: true },
  ],
  healthCheckInterval: 30000, // 30 seconds
  ddosThresholds: {
    requestsPerMinute: 60,
    requestsPerHour: 1000,
    suspiciousPatterns: 10
  }
};

// ==================== LOGGER SETUP ====================
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

// ==================== REDIS CLIENT ====================
const redisClient = redis.createClient({ url: config.redisUrl });
redisClient.on('error', (err) => logger.error('Redis Client Error', err));
redisClient.connect();

// ==================== EXPRESS APP SETUP ====================
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// ==================== MIDDLEWARE ====================
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(useragent.express());

// Trust proxy for accurate IP detection
app.set('trust proxy', true);

// ==================== DDOS PROTECTION MIDDLEWARE ====================
class DDoSProtection {
  constructor() {
    this.suspiciousIPs = new Set();
    this.blockedIPs = new Set();
    this.attackPatterns = new Map();
  }

  // Rate limiting middleware
  createRateLimiter() {
    return rateLimit({
      windowMs: 60 * 1000, // 1 minute
      max: config.ddosThresholds.requestsPerMinute,
      message: { error: 'Too many requests, please try again later.' },
      standardHeaders: true,
      legacyHeaders: false,
      keyGenerator: (req) => {
        return req.ip || req.connection.remoteAddress;
      },
      onLimitReached: (req) => {
        const ip = req.ip;
        this.suspiciousIPs.add(ip);
        logger.warn(`Rate limit exceeded for IP: ${ip}`);
        this.broadcastAttack('rate_limit', ip);
      }
    });
  }

  // GeoIP filtering middleware
  geoIPFilter(req, res, next) {
    const ip = req.ip;
    const geo = geoip.lookup(ip);
    
    // Block requests from high-risk countries (configurable)
    const blockedCountries = ['CN', 'RU', 'KP']; // Example blocked countries
    
    if (geo && blockedCountries.includes(geo.country)) {
      logger.warn(`Blocked request from ${geo.country} - IP: ${ip}`);
      this.broadcastAttack('geo_block', ip);
      return res.status(403).json({ error: 'Access denied from your location' });
    }
    
    next();
  }

  // Bot detection middleware
  botDetection(req, res, next) {
    const userAgent = req.useragent;
    const ip = req.ip;
    
    // Detect suspicious user agents
    const suspiciousBots = [
      'curl', 'wget', 'python', 'scrapy', 'bot', 'spider',
      'crawler', 'attack', 'scan', 'exploit'
    ];
    
    const userAgentString = (req.headers['user-agent'] || '').toLowerCase();
    const isSuspicious = suspiciousBots.some(bot => userAgentString.includes(bot));
    
    if (isSuspicious || !userAgent.isDesktop && !userAgent.isMobile && !userAgent.isTablet) {
      this.suspiciousIPs.add(ip);
      logger.warn(`Suspicious bot detected - IP: ${ip}, UA: ${userAgentString}`);
      this.broadcastAttack('bot_detection', ip);
      
      // Challenge suspicious requests
      if (Math.random() < 0.3) { // 30% chance of challenge
        return res.status(429).json({ 
          error: 'Please complete verification',
          challenge: true
        });
      }
    }
    
    next();
  }

  // Pattern analysis middleware
  patternAnalysis(req, res, next) {
    const ip = req.ip;
    const path = req.path;
    const method = req.method;
    
    // Track request patterns
    const patternKey = `${ip}:${method}:${path}`;
    const currentCount = this.attackPatterns.get(patternKey) || 0;
    this.attackPatterns.set(patternKey, currentCount + 1);
    
    // Detect repetitive patterns
    if (currentCount > config.ddosThresholds.suspiciousPatterns) {
      this.suspiciousIPs.add(ip);
      logger.warn(`Suspicious pattern detected - IP: ${ip}, Pattern: ${patternKey}`);
      this.broadcastAttack('pattern_analysis', ip);
    }
    
    next();
  }

  // Broadcast attack information to dashboard
  broadcastAttack(type, ip) {
    const geo = geoip.lookup(ip);
    io.emit('attack_detected', {
      type,
      ip,
      country: geo ? geo.country : 'Unknown',
      timestamp: new Date().toISOString()
    });
  }

  // IP blocking middleware
  ipBlocker(req, res, next) {
    const ip = req.ip;
    
    if (this.blockedIPs.has(ip)) {
      logger.warn(`Blocked IP attempted access: ${ip}`);
      return res.status(403).json({ error: 'Access denied' });
    }
    
    next();
  }
}

const ddosProtection = new DDoSProtection();

// Apply DDoS protection middleware
app.use(ddosProtection.ipBlocker.bind(ddosProtection));
app.use(ddosProtection.createRateLimiter());
app.use(ddosProtection.geoIPFilter.bind(ddosProtection));
app.use(ddosProtection.botDetection.bind(ddosProtection));
app.use(ddosProtection.patternAnalysis.bind(ddosProtection));

// ==================== LOAD BALANCING LOGIC ====================
class LoadBalancer {
  constructor(servers) {
    this.servers = servers;
    this.currentIndex = 0;
    this.stats = {
      totalRequests: 0,
      blockedRequests: 0,
      serverStats: {},
    };
    
    // Initialize server stats
    servers.forEach(server => {
      this.stats.serverStats[server.id] = {
        requests: 0,
        errors: 0,
        responseTime: 0
      };
    });
  }

  // Round-robin with health checks
  getNextServer() {
    const healthyServers = this.servers.filter(server => server.healthy);
    
    if (healthyServers.length === 0) {
      throw new Error('No healthy servers available');
    }
    
    // Weighted round-robin
    let totalWeight = healthyServers.reduce((sum, server) => sum + server.weight, 0);
    let randomWeight = Math.random() * totalWeight;
    
    for (let server of healthyServers) {
      randomWeight -= server.weight;
      if (randomWeight <= 0) {
        return server;
      }
    }
    
    return healthyServers[0]; // Fallback
  }

  // Update server stats
  updateStats(serverId, responseTime, isError = false) {
    this.stats.totalRequests++;
    
    if (this.stats.serverStats[serverId]) {
      this.stats.serverStats[serverId].requests++;
      this.stats.serverStats[serverId].responseTime = responseTime;
      
      if (isError) {
        this.stats.serverStats[serverId].errors++;
      }
    }
  }

  // Get load balancer statistics
  getStats() {
    return {
      ...this.stats,
      suspiciousIPs: ddosProtection.suspiciousIPs.size,
      blockedIPs: ddosProtection.blockedIPs.size,
      servers: this.servers.map(server => ({
        ...server,
        stats: this.stats.serverStats[server.id]
      }))
    };
  }
}

const loadBalancer = new LoadBalancer(config.servers);

// ==================== HEALTH CHECK SYSTEM ====================
class HealthChecker {
  constructor(servers, interval) {
    this.servers = servers;
    this.interval = interval;
    this.checks = new Map();
  }

  start() {
    setInterval(() => {
      this.checkAllServers();
    }, this.interval);
    
    // Initial health check
    this.checkAllServers();
  }

  async checkServer(server) {
    const startTime = Date.now();
    
    try {
      const response = await fetch(`${server.url}/health`, {
        method: 'GET',
        timeout: 5000
      });
      
      const responseTime = Date.now() - startTime;
      const isHealthy = response.ok && responseTime < 5000;
      
      server.healthy = isHealthy;
      server.lastCheck = new Date().toISOString();
      server.responseTime = responseTime;
      
      logger.info(`Health check ${server.id}: ${isHealthy ? 'HEALTHY' : 'UNHEALTHY'} (${responseTime}ms)`);
      
    } catch (error) {
      server.healthy = false;
      server.lastCheck = new Date().toISOString();
      server.responseTime = null;
      
      logger.error(`Health check ${server.id}: FAILED - ${error.message}`);
    }
  }

  async checkAllServers() {
    const promises = this.servers.map(server => this.checkServer(server));
    await Promise.all(promises);
    
    // Broadcast health status to dashboard
    io.emit('health_update', {
      servers: this.servers,
      timestamp: new Date().toISOString()
    });
  }
}

const healthChecker = new HealthChecker(config.servers, config.healthCheckInterval);

// ==================== API ENDPOINTS ====================

// Dashboard API endpoints
app.get('/api/stats', async (req, res) => {
  try {
    const stats = loadBalancer.getStats();
    const trafficData = await this.getTrafficData(); // Implement based on your needs
    
    res.json({
      success: true,
      data: {
        ...stats,
        trafficData,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Error getting stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Server management endpoints
app.post('/api/servers', (req, res) => {
  const { url, weight = 1 } = req.body;
  
  if (!url) {
    return res.status(400).json({ error: 'Server URL is required' });
  }
  
  const newServer = {
    id: `server${config.servers.length + 1}`,
    url,
    weight,
    healthy: false
  };
  
  config.servers.push(newServer);
  loadBalancer.servers = config.servers;
  
  // Immediate health check for new server
  healthChecker.checkServer(newServer);
  
  res.json({ success: true, server: newServer });
});

app.delete('/api/servers/:id', (req, res) => {
  const serverId = req.params.id;
  const serverIndex = config.servers.findIndex(s => s.id === serverId);
  
  if (serverIndex === -1) {
    return res.status(404).json({ error: 'Server not found' });
  }
  
  config.servers.splice(serverIndex, 1);
  loadBalancer.servers = config.servers;
  
  res.json({ success: true, message: 'Server removed' });
});

// DDoS protection management
app.post('/api/protection/block-ip', (req, res) => {
  const { ip } = req.body;
  
  if (!ip) {
    return res.status(400).json({ error: 'IP address is required' });
  }
  
  ddosProtection.blockedIPs.add(ip);
  logger.info(`Manually blocked IP: ${ip}`);
  
  res.json({ success: true, message: `IP ${ip} blocked` });
});

app.post('/api/protection/unblock-ip', (req, res) => {
  const { ip } = req.body;
  
  if (!ip) {
    return res.status(400).json({ error: 'IP address is required' });
  }
  
  ddosProtection.blockedIPs.delete(ip);
  ddosProtection.suspiciousIPs.delete(ip);
  logger.info(`Unblocked IP: ${ip}`);
  
  res.json({ success: true, message: `IP ${ip} unblocked` });
});

// ==================== MAIN PROXY MIDDLEWARE ====================
const proxyMiddleware = createProxyMiddleware({
  target: '', // Will be set dynamically
  changeOrigin: true,
  ws: true, // Enable WebSocket proxying
  
  router: (req) => {
    try {
      const server = loadBalancer.getNextServer();
      logger.info(`Routing request to: ${server.url}`);
      return server.url;
    } catch (error) {
      logger.error('No healthy servers available:', error);
      return null;
    }
  },
  
  onProxyReq: (proxyReq, req, res) => {
    const startTime = Date.now();
    req.startTime = startTime;
    
    // Add load balancer headers
    proxyReq.setHeader('X-LoadBalancer', 'LoadBalancer-Pro');
    proxyReq.setHeader('X-Request-ID', `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
  },
  
  onProxyRes: (proxyRes, req, res) => {
    const responseTime = Date.now() - req.startTime;
    const server = req.selectedServer;
    
    if (server) {
      loadBalancer.updateStats(server.id, responseTime, proxyRes.statusCode >= 400);
    }
    
    // Add response headers
    proxyRes.headers['X-Response-Time'] = `${responseTime}ms`;
    proxyRes.headers['X-LoadBalancer'] = 'LoadBalancer-Pro';
    
    logger.info(`Request completed: ${req.method} ${req.url} - ${proxyRes.statusCode} (${responseTime}ms)`);
    
    // Broadcast real-time stats
    io.emit('request_completed', {
      method: req.method,
      url: req.url,
      statusCode: proxyRes.statusCode,
      responseTime,
      timestamp: new Date().toISOString()
    });
  },
  
  onError: (err, req, res) => {
    logger.error('Proxy error:', err);
    
    if (!res.headersSent) {
      res.status(503).json({
        error: 'Service temporarily unavailable',
        message: 'All backend servers are currently unavailable'
      });
    }
  }
});

// Apply proxy middleware to all routes not starting with /api
app.use((req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/health')) {
    return next();
  }
  
  proxyMiddleware(req, res, next);
});

// ==================== WEBSOCKET CONNECTIONS ====================
io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id}`);
  
  // Send current stats to newly connected client
  socket.emit('initial_stats', loadBalancer.getStats());
  
  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);
  });
});

// ==================== HEALTH CHECK ENDPOINT ====================
app.get('/health', (req, res) => {
  const healthyServers = config.servers.filter(server => server.healthy);
  
  res.json({
    status: 'healthy',
    loadBalancer: 'operational',
    servers: {
      total: config.servers.length,
      healthy: healthyServers.length,
      unhealthy: config.servers.length - healthyServers.length
    },
    stats: loadBalancer.getStats(),
    timestamp: new Date().toISOString()
  });
});

// ==================== ERROR HANDLING ====================
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  
  if (!res.headersSent) {
    res.status(500).json({
      error: 'Internal server error',
      message: 'Something went wrong'
    });
  }
});

// ==================== SERVER STARTUP ====================
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    redisClient.quit();
    process.exit(0);
  });
});

// Start the server
healthChecker.start();

server.listen(config.port, () => {
  logger.info(`🚀 LoadBalancer Pro started on port ${config.port}`);
  logger.info(`📊 Dashboard available at http://localhost:${config.port}`);
  logger.info(`🛡️  DDoS protection: ACTIVE`);
  logger.info(`⚖️  Load balancing: ${config.servers.length} servers configured`);
});

module.exports = { app, server, loadBalancer, ddosProtection };