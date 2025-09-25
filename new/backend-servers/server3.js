const express = require('express');
const app = express();
const port = 8003;

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    server: 'server3',
    port: port,
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.get('/', (req, res) => {
  res.json({
    message: 'Hello from Backend Server 3!',
    server: 'server3',
    port: port,
    timestamp: new Date().toISOString()
  });
});

app.get('/api/data', (req, res) => {
  setTimeout(() => {
    res.json({
      data: [
        { id: 5, name: 'Item 5', server: 'server3' },
        { id: 6, name: 'Item 6', server: 'server3' },
      ],
      server: 'server3',
      timestamp: new Date().toISOString()
    });
  }, Math.random() * 80);
});

app.post('/api/data', (req, res) => {
  res.json({
    message: 'Data created successfully',
    server: 'server3',
    data: req.body,
    timestamp: new Date().toISOString()
  });
});

app.get('/api/heavy', (req, res) => {
  const start = Date.now();
  let result = 0;
  for (let i = 0; i < 800000; i++) {
    result += Math.random();
  }
  
  res.json({
    message: 'Heavy computation completed',
    server: 'server3',
    processingTime: Date.now() - start,
    result: result
  });
});

app.listen(port, () => {
  console.log(`🚀 Backend Server 3 running on port ${port}`);
});
