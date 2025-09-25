
const express = require('express');
const app = express();
const port = 8002;

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    server: 'server2',
    port: port,
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.get('/', (req, res) => {
  res.json({
    message: 'Hello from Backend Server 2!',
    server: 'server2',
    port: port,
    timestamp: new Date().toISOString()
  });
});

app.get('/api/data', (req, res) => {
  setTimeout(() => {
    res.json({
      data: [
        { id: 3, name: 'Item 3', server: 'server2' },
        { id: 4, name: 'Item 4', server: 'server2' },
      ],
      server: 'server2',
      timestamp: new Date().toISOString()
    });
  }, Math.random() * 150);
});

app.post('/api/data', (req, res) => {
  res.json({
    message: 'Data created successfully',
    server: 'server2',
    data: req.body,
    timestamp: new Date().toISOString()
  });
});

app.get('/api/heavy', (req, res) => {
  const start = Date.now();
  let result = 0;
  for (let i = 0; i < 1500000; i++) {
    result += Math.random();
  }
  
  res.json({
    message: 'Heavy computation completed',
    server: 'server2',
    processingTime: Date.now() - start,
    result: result
  });
});

app.listen(port, () => {
  console.log(`🚀 Backend Server 2 running on port ${port}`);
});
