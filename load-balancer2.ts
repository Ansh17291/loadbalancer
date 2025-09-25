import * as http from 'http';
import httpProxy from 'http-proxy';
import { RateLimiterMemory, RateLimiterRes } from 'rate-limiter-flexible';

declare module 'http-proxy' {
  interface Server {
    on(event: 'error', listener: (err: Error, req?: http.IncomingMessage, res?: http.ServerResponse) => void): this;
    on(event: 'proxyReq', listener: (proxyReq: http.ClientRequest, req: http.IncomingMessage, res: http.ServerResponse, options: any) => void): this;
    on(event: 'proxyRes', listener: (proxyRes: http.IncomingMessage, req: http.IncomingMessage, res: http.ServerResponse) => void): this;
  }
}

interface ServerHealth {
  [server: string]: boolean;
}

interface ServerResponseTimes {
  [server: string]: number[];
}

interface RequestWithTimeout extends RequestInit {
  timeout?: number;
}

const backendServers: string[] = [
  'http://localhost:3001',
  'http://localhost:3002',
  'http://localhost:3003',
  'http://localhost:3004'
];

const serverHealth = new Map<string, boolean>(
  backendServers.map(server => [server, true])
);
const serverResponseTimes = new Map<string, number[]>(
  backendServers.map(server => [server, []])
);

let current: number = 0;

const rateLimiter = new RateLimiterMemory({
  points: 20 ,       
  duration: 1,       
  blockDuration: 30, 
  execEvenly: true   
});

const ipActivityMap = new Map<string, number[]>();
const suspiciousIPs = new Set<string>();

const whitelistedIPs = new Set<string>([
  '::1',      
  '127.0.0.1' 
]);

const proxy = httpProxy.createProxyServer({
  timeout: 10000,     
  proxyTimeout: 10000 
});


function trackIPActivity(ip: string): number[] {
  const now: number = Date.now();
  
  if (!ipActivityMap.has(ip)) {
    ipActivityMap.set(ip, []);
  }
  
  const timestamps: number[] = ipActivityMap.get(ip) || [];
  timestamps.push(now);
  
  const filtered: number[] = timestamps.filter((ts: number) => now - ts <= 10000);
  ipActivityMap.set(ip, filtered);
  
  return filtered;
}

function detectDoSAttack(ip: string, timestamps: number[]): boolean {
  if (whitelistedIPs.has(ip)) return false;
  
  const now: number = Date.now();
  
  const last1sec: number = timestamps.filter((ts: number) => now - ts <= 1000).length;
  const last5sec: number = timestamps.filter((ts: number) => now - ts <= 5000).length;
  const last10sec: number = timestamps.filter((ts: number) => now - ts <= 10000).length;
  console.log(`DEBUG: ${ip} - 1s: ${last1sec}, 5s: ${last5sec}, 10s: ${last10sec}`);
  
  if (last1sec > 15) {
    console.warn(`  HIGH RATE: ${ip} made ${last1sec} requests in 1s`);
    return true;
  }
  
  if (last5sec > 40) {
    console.warn(`  POTENTIAL DoS: ${ip} made ${last5sec} requests in 5s`);
    return true;
  }
  
  if (last10sec > 60) {
    console.warn(` LIKELY DoS: ${ip} made ${last10sec} requests in 10s`);
    suspiciousIPs.add(ip);
    return true;
  }
  
  return false;
}



function getFastestHealthyServer(): string {
  const healthyServers = backendServers.filter(server => serverHealth.get(server));
  if (healthyServers.length === 0) throw new Error('No healthy servers');

  healthyServers.sort((a, b) => {
    const avgA = average(serverResponseTimes.get(a) || []);
    const avgB = average(serverResponseTimes.get(b) || []);
    return avgA - avgB;
  });

  return healthyServers[0];
}

function average(arr: number[]): number {
  if (arr.length === 0) return Infinity;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

async function fetchWithTimeout(url: string, options: RequestWithTimeout = {}): Promise<Response> {
  const { timeout = 5000, ...fetchOptions } = options;
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

async function healthCheck(): Promise<void> {
  for (const server of backendServers) {
    try {
      const start: number = Date.now();
      const response: Response = await fetchWithTimeout(`${server}/health`, { 
        timeout: 5000,
        method: 'GET' 
      });
      const responseTime: number = Date.now() - start;
      
      const times: number[] = serverResponseTimes.get(server) || [];
      times.push(responseTime);
      if (times.length > 10) times.shift();
      serverResponseTimes.set(server, times);
      
      serverHealth.set(server, response.ok);
      
      if (!response.ok) {
        console.warn(` Server ${server} is unhealthy`);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(` Server ${server} health check failed:`, errorMessage);
      serverHealth.set(server, false);
    }
  }
}

function getNextServer(): string {
  const healthyServers: string[] = backendServers.filter(server => serverHealth.get(server));
  
  if (healthyServers.length === 0) {
    throw new Error('No healthy servers available');
  }
  
  let attempts: number = 0;
  while (attempts < backendServers.length) {
    const server: string = backendServers[current];
    current = (current + 1) % backendServers.length;
    
    if (serverHealth.get(server)) {
      return server;
    }
    attempts++;
  }
  
  return healthyServers[0];
}

function logRequest(ip: string, url: string, method: string, userAgent?: string): void {
  const timestamp: string = new Date().toISOString();
  const suspicious: string = suspiciousIPs.has(ip) ? '🚨' : '';
  console.log(`[${timestamp}] ${suspicious} ${method} ${url} from ${ip} | UA: ${userAgent?.substring(0, 50) || 'N/A'}`);
}

const loadBalancer = http.createServer(async (req: http.IncomingMessage, res: http.ServerResponse) => {
  const ip: string = req.socket.remoteAddress || req.headers['x-forwarded-for'] as string || 'unknown';
  const url: string = req.url || '/';
  const method: string = req.method || 'GET';
  const userAgent: string | undefined = req.headers['user-agent'];
  
  logRequest(ip, url, method, userAgent);
  
  try {
    const timestamps: number[] = trackIPActivity(ip);
    
    if (detectDoSAttack(ip, timestamps)) {
      res.writeHead(429, { 
        'Content-Type': 'text/plain',
        'Retry-After': '60'
      });
      res.end('Request blocked - Suspicious activity detected');
      return;
    }
    
    await rateLimiter.consume(ip);
    
    const target: string = getNextServer();
    
    proxy.web(req, res, { 
      target,
      changeOrigin: true,
      timeout: 10000
    }, (error: Error) => {
      console.error(`Proxy error for ${target}:`, error.message);
      
      serverHealth.set(target, false);
      
      if (!res.headersSent) {
        res.writeHead(502, { 'Content-Type': 'text/plain' });
        res.end('Bad Gateway - Backend server unavailable');
      }
    });
    
  } catch (rateLimiterRes: unknown) {
    const rateLimiterError = rateLimiterRes as RateLimiterRes;
    const msBeforeNext: number = rateLimiterError.msBeforeNext || 30000;
    
    res.writeHead(429, { 
      'Content-Type': 'text/plain',
      'Retry-After': Math.round(msBeforeNext / 1000).toString(),
      'X-RateLimit-Limit': '20',
      'X-RateLimit-Remaining': '0',
      'X-RateLimit-Reset': new Date(Date.now() + msBeforeNext).toISOString()
    });
    res.end('Too Many Requests - Rate limit exceeded');
  }
});

proxy.on('error', ((err: Error, req?: http.IncomingMessage, res?: http.ServerResponse) => {
  console.error('Proxy error:', err);

  if (res && !res.headersSent) {
    try {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Internal Server Error');
    } catch (writeError) {
      console.error('Error writing error response:', writeError);
    }
  }
}) as (...args: any[]) => void);

proxy.on('proxyRes', (proxyRes: http.IncomingMessage, req: http.IncomingMessage, res: http.ServerResponse) => {
  const ip = req.socket.remoteAddress || 'unknown';
  console.log(`✅ Proxy response: ${proxyRes.statusCode} for ${req.method} ${req.url} from ${ip}`);
});

setInterval(() => {
  const now: number = Date.now();
  const cutoff: number = 5 * 60 * 1000; 
  
  for (const [ip, timestamps] of ipActivityMap.entries()) {
    const recent: number[] = timestamps.filter((ts: number) => now - ts <= cutoff);
    if (recent.length === 0) {
      ipActivityMap.delete(ip);
      suspiciousIPs.delete(ip);
    } else {
      ipActivityMap.set(ip, recent);
    }
  }
  
  console.log(`🧹 Cleanup: Tracking ${ipActivityMap.size} IPs, ${suspiciousIPs.size} suspicious`);
}, 60000); 

setInterval(healthCheck, 10000); 
healthCheck(); 

process.on('SIGTERM', () => {
  console.log('Graceful shutdown initiated...');
  loadBalancer.close(() => {
    console.log(' Load balancer stopped');
    process.exit(0);
  });
});

loadBalancer.listen(8080, () => {
  console.log(' Load balancer listening at http://localhost:8080');
  console.log(` Monitoring ${backendServers.length} backend servers`);
});

export { loadBalancer, proxy };