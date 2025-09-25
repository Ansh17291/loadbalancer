
const express = require('express');
const app = express();
const port = 8004;

app.use(express.json());

// Simulate occasional server issues
let isHealthy = true;
setInterval(() => {
  isHealthy = Math.random() > 0.1; // 10% chance of being unhealthy
}, 30000);

app.get('/health', (req, res) => {
  if (!isHealthy) {
    return res.status(503).json({
      status: 'unhealthy',
      server: 'server4',
      port: port,
      timestamp: new Date().toISOString()
    });
  }

  res.json({
    status: 'healthy',
    server: 'server4',
    port: port,
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.get('/', (req, res) => {
  if (!isHealthy) {
    return res.status(500).json({ error: 'Server is experiencing issues' });
  }

  res.json({
    message: 'Hello from Backend Server 4!',
    server: 'server4',
    port: port,
    timestamp: new Date().toISOString()
  });
});

app.get('/api/data', (req, res) => {
  if (!isHealthy) {
    return res.status(500).json({ error: 'Server is experiencing issues' });
  }

  setTimeout(() => {
    res.json({
      data: [
        { id: 7, name: 'Item 7', server: 'server4' },
        { id: 8, name: 'Item 8', server: 'server4' },
      ],
      server: 'server4',
      timestamp: new Date().toISOString()
    });
  }, Math.random() * 200);
});

app.post('/api/data', (req, res) => {
  if (!isHealthy) {
    return res.status(500).json({ error: 'Server is experiencing issues' });
  }

  res.json({
    message: 'Data created successfully',
    server: 'server4',
    data: req.body,
    timestamp: new Date().toISOString()
  });
});

app.get('/api/heavy', (req, res) => {
  if (!isHealthy) {
    return res.status(500).json({ error: 'Server is experiencing issues' });
  }

  const start = Date.now();
  let result = 0;
  for (let i = 0; i < 2000000; i++) {
    result += Math.random();
  }
  
  res.json({
    message: 'Heavy computation completed',
    server: 'server4',
    processingTime: Date.now() - start,
    result: result
  });
});

app.listen(port, () => {
  console.log(`🚀 Backend Server 4 running on port ${port}`);
});