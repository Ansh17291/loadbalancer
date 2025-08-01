import http from 'http';
import httpProxy from 'http-proxy';
import { RateLimiterMemory } from 'rate-limiter-flexible';

const backendServers = [
  'http://localhost:3001',
  'http://localhost:3002',
  'http://localhost:3003',
  'http://localhost:3004'
];

let current = 0; 

const rateLimiter = new RateLimiterMemory({
  points: 20,      // Allow 20 requests per second per IP
  duration: 1,
  blockDuration: 5
});


const ipActivityMap: Record<string, number[]> = {}; // IP -> timestamps[]

// proxy server to re-direct the requests 
const proxy = httpProxy.createProxyServer({});

const loadBalancer = http.createServer(async (req, res) => {
  const ip = req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const url = req.url || '/';

  console.log(`[${new Date().toISOString()}] Request from ${ip} to ${url}`);

  if (!ipActivityMap[ip]) ipActivityMap[ip] = [];
  ipActivityMap[ip].push(now);

  

  // keeping only the data of last 5 seconds to check for the dos attacks 
  ipActivityMap[ip] = ipActivityMap[ip].filter(ts => now - ts <= 5000);



  // checking if the request counts are above the threshold , if so then dos , :)
  if (ipActivityMap[ip].length > 50) {
    console.warn(`DDoS Suspicion: ${ip} made ${ipActivityMap[ip].length} requests in 5s`);
  }



  try {
    await rateLimiter.consume(ip);

    // Round Robin 
    const target = backendServers[current];
    current = (current + 1) % backendServers.length;

    proxy.web(req, res, { target });

  } catch (rateLimiterRes) {
    res.writeHead(429, { 'Content-Type': 'text/plain' });
    res.end('Too many requests - You are temporarily blocked');
  }
});



loadBalancer.listen(8080, () => {
  console.log('Load balancer listening at http://localhost:8080');
});