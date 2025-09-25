const express = require('express');
const app = express();
const port = 8001;

app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    server: 'server1',
    port: port,
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Sample API endpoints
app.get('/', (req, res) => {
  res.json({
    message: 'Hello from Backend Server 1!',
    server: 'server1',
    port: port,
    timestamp: new Date().toISOString()
  });
});

app.get('/api/data', (req, res) => {
  // Simulate some processing time
  setTimeout(() => {
    res.json({
      data: [
        { id: 1, name: 'Item 1', server: 'server1' },
        { id: 2, name: 'Item 2', server: 'server1' },
      ],
      server: 'server1',
      timestamp: new Date().toISOString()
    });
  }, Math.random() * 100); // Random delay 0-100ms
});

app.post('/api/data', (req, res) => {
  res.json({
    message: 'Data created successfully',
    server: 'server1',
    data: req.body,
    timestamp: new Date().toISOString()
  });
});

// Simulate server load
app.get('/api/heavy', (req, res) => {
  // Simulate heavy computation
  const start = Date.now();
  let result = 0;
  for (let i = 0; i < 1000000; i++) {
    result += Math.random();
  }
  
  res.json({
    message: 'Heavy computation completed',
    server: 'server1',
    processingTime: Date.now() - start,
    result: result
  });
});

app.listen(port, () => {
  console.log(`🚀 Backend Server 1 running on port ${port}`);
});