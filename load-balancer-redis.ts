import http from "http";
import httpProxy from "http-proxy";
import { RateLimiterRedis } from "rate-limiter-flexible";
import Redis from "ioredis";
import cluster from 'cluster';
import os from 'os';

const redisClient = new Redis(); // redis connection
const numCPUs = os.cpus().length; // no.of cpus 

const backendServers = [
  "http://localhost:3001",
  "http://localhost:3002",
  "http://localhost:3003",
  "http://localhost:3004",
];

let current = 0;

const rateLimiter = new RateLimiterRedis({
  storeClient: redisClient, // limiter to access (talk) redis (to store in redis)
  keyPrefix: "ddos", // prefix key for ip eg. ddos:192.168.1.1
  points: 20, // Allow 20 requests per second per IP
  duration: 30, // for 1 second and its also the TTL (Time to live)
  blockDuration: 5, // block for 5 sec
});

// proxy server to re-direct the requests
const proxy = httpProxy.createProxyServer({});

if (cluster.isPrimary) {
  console.log(`Master PID: ${process.pid}`);

  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }
} else {
  const loadBalancer = http.createServer(async (req, res) => {
    const ip = req.socket.remoteAddress || "unknown"; // extract client ip

    try {
      // calling rate limiter with redis
      await rateLimiter.consume(ip); // automatically stores IP in Redis

      // storing date and ip in custom dictionary
      const now = new Date().toISOString();
      await redisClient.set(`ddos-log:${ip}`, JSON.stringify({ ip, timestamp: now }), 'EX', 20); // expiry 20 sec

      // Round Robin
      const target = backendServers[current];
      current = (current + 1) % backendServers.length;

      // worker forwards the request to the particular port e.g s1, s2, s3, s4
      console.log(`Worker ${process.pid} forwarding ${ip} to ${target}`);

      proxy.web(req, res, { target })
    } catch (err) {
      res.writeHead(429, { "Content-Type": "text/plain" });
      res.end("Too many requests - You are temporarily blocked");
    }
  });

  loadBalancer.listen(8080, () => {
      console.log("Load balancer listening at http://localhost:8080");
  });
}
