import http from "http";
import httpProxy from "http-proxy";
import { RateLimiterRedis } from "rate-limiter-flexible";
import Redis from "ioredis";
import cluster from "cluster";
import os from "os";
import geoip from "geoip-lite";
import { TLSSocket } from "tls";

// redis setup
const redisClient = new Redis();
// number of cpus
const numCPUs = os.cpus().length;

// backend servers
const backendServers = [
  "http://localhost:3001",
  "http://localhost:3002",
  "http://localhost:3003",
  "http://localhost:3004",
];

// idx for round robin
let current = 0;

const rateLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: "ddos",
  points: 100, // max 100 requests allowed.
  duration: 60, // in 60 sec
  blockDuration: 30, // block for 30 sec
});

// proxy server to re-direct the requests to backend servers
const proxy = httpProxy.createProxyServer({});

async function updateAndExtractFeatures(ip: string, req: http.IncomingMessage) {
  const now = Date.now();

  // Increment counters
  await Promise.all([ // parallel execution and waits untill all are completed
    redisClient.incr(`ip:${ip}:count:1s`).then(() => redisClient.expire(`ip:${ip}:count:1s`, 2)), // 1s ip count
    redisClient.incr(`ip:${ip}:count:10s`).then(() => redisClient.expire(`ip:${ip}:count:10s`, 12)), // 10s ip count
    redisClient.incr(`ip:${ip}:count:60s`).then(() => redisClient.expire(`ip:${ip}:count:60s`, 65)), // 1min ip count
    redisClient.sadd(`ip:${ip}:paths:60s`, req.url || ""), // unique requested urls
    redisClient.expire(`ip:${ip}:paths:60s`, 65), // clears all urls after 1 min
  ]);

  // Inter-arrival times
  const firstTsKey = `ip:${ip}:first_ts`; // Stores the timestamp of the first request from this IP
  const lastTsKey = `ip:${ip}:last_ts`; // Stores the timestamp of the last request from this IP
  // Get the timestamp of the last request from Redis (if it exists)
  const lastTs = await redisClient.get(lastTsKey);
  if (!await redisClient.exists(firstTsKey)) await redisClient.set(firstTsKey, now, "EX", 65); // checks if firstTsKey exists else sets it
  if (lastTs) {
    const iat = now - parseInt(lastTs, 10); // inter-arrival time, i.e., time difference between the current and previous request.
    await redisClient.lpush(`ip:${ip}:iat`, iat); // pushes ip request
    await redisClient.ltrim(`ip:${ip}:iat`, 0, 99); // keeps only the latest 100 IATs
    await redisClient.expire(`ip:${ip}:iat`, 65); // clears after 1 min
  }
  // update the lastsKey with the current timestamp (now) whenever a request comes
  await redisClient.set(lastTsKey, now, "EX", 65);

  // Packet-level features
  // Checks if the request is encrypted or not
  const protocol = (req.socket as TLSSocket).encrypted ? "HTTPS" : "HTTP";
  const contentLength = Number(req.headers["content-length"] || 0);
  const headersSize = Buffer.byteLength(JSON.stringify(req.headers), "utf-8");
  const packetSize = headersSize + contentLength;
  const packetType = req.method || "UNKNOWN";

  await redisClient.incrby(`ip:${ip}:total_bytes:60s`, packetSize); // adds packet size to the same ip
  await redisClient.expire(`ip:${ip}:total_bytes:60s`, 65); 
  await redisClient.rpush(`ip:${ip}:packet_sizes:60s`, packetSize); // adds the packet size to a list for this IP.
  await redisClient.ltrim(`ip:${ip}:packet_sizes:60s`, -99, -1); // keep only latest 100 packet sizes
  await redisClient.expire(`ip:${ip}:packet_sizes:60s`, 65); 
  await redisClient.hincrby(`ip:${ip}:method_counts:60s`, packetType, 1); // increments the count of this HTTP method (packet type) in a hash. (e.g GET , POST)
  await redisClient.expire(`ip:${ip}:method_counts:60s`, 65);

  // Read counters and stats
  // runs all Redis commands in parallel and gets the value.
  const [r1, r10, r60, uniquePaths, iatList, totalBytesRaw, methodCountsRaw, packetSizesRaw, firstTsRaw] = await Promise.all([
    redisClient.get(`ip:${ip}:count:1s`),
    redisClient.get(`ip:${ip}:count:10s`),
    redisClient.get(`ip:${ip}:count:60s`),
    redisClient.scard(`ip:${ip}:paths:60s`),
    redisClient.lrange(`ip:${ip}:iat`, 0, -1),
    redisClient.get(`ip:${ip}:total_bytes:60s`),
    redisClient.hgetall(`ip:${ip}:method_counts:60s`),
    redisClient.lrange(`ip:${ip}:packet_sizes:60s`, 0, -1),
    redisClient.get(firstTsKey),
  ]);

  const iats = iatList.map(Number); // converts iats strings to numbers
  const avgIat = iats.length > 0 ? iats.reduce((a, b) => a + b, 0) / iats.length : 0;
  const stdIat = iats.length > 1
    ? Math.sqrt(iats.map(x => Math.pow(x - avgIat, 2)).reduce((a, b) => a + b, 0) / iats.length)
    : 0;

  // Flow duration: time since the first request from this IP
  const flowDuration = firstTsRaw ? now - parseInt(firstTsRaw) : 0;

  // Avg and variance of packet sizes
  const packetSizes = packetSizesRaw.map(Number); // converts packet sizes (strings from Redis) to numbers.
  const avgPacketSize = packetSizes.length > 0 ? packetSizes.reduce((a, b) => a + b, 0) / packetSizes.length : 0;
  const varPacketSize = packetSizes.length > 1
    ? packetSizes.map(x => Math.pow(x - avgPacketSize, 2)).reduce((a, b) => a + b, 0) / packetSizes.length
    : 0;

  const geo = geoip.lookup(ip); // to find the country of the IP
  const country = geo ? geo.country : "ZZ";

  const uaHeader = req.headers["user-agent"];
  const uaString = Array.isArray(uaHeader) ? uaHeader[0] : uaHeader || "";
  // Checks if the request comes from a headless browser, bot, or crawler.
  const isHeadless = /HeadlessChrome|PhantomJS|curl|bot/i.test(uaString);

  // Convert method counts to numbers (e.g GET: "10" -> GET: 10)
  const methodCounts: Record<string, number> = {};
  for (const [key, value] of Object.entries(methodCountsRaw)) methodCounts[key] = Number(value);

  return {
    client_ip: ip,
    country,
    source_port: req.socket.remotePort,
    dest_port: req.socket.localPort,
    protocol,
    flow_duration_ms: flowDuration,
    requests_1s: Number(r1 || 0),
    requests_10s: Number(r10 || 0),
    requests_60s: Number(r60 || 0),
    packets_per_second: r60 ? Number(r60) / 60 : 0,
    unique_paths_60s: Number(uniquePaths || 0),
    avg_inter_arrival_ms: avgIat,
    std_inter_arrival_ms: stdIat,
    avg_packet_size: avgPacketSize,
    packet_size_variance: varPacketSize,
    user_agent: uaString,
    is_headless: isHeadless,
    packet_size: packetSize,
    total_bytes_60s: Number(totalBytesRaw || 0),
    packet_type_counts: methodCounts,
  };
}

// Cluster setup
if (cluster.isPrimary) {
  console.log(`Master PID: ${process.pid}`);

  // workers
  for (let i = 0; i < numCPUs; i++) {
    const worker = cluster.fork();
    // the master receives the message
    worker.on("message", (msg) => {
      if (msg.type === "features") {
        console.log("Extracted features:", msg.data);
      }
    });
  }

} else {
  const loadBalancer = http.createServer(async (req, res) => {
    const ip = (req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown").toString();

    try {
      // calling rate limiter with redis
      await rateLimiter.consume(ip); // automatically stores IP in Redis

      try {
        // fetches features
        const features = await updateAndExtractFeatures(ip, req);

        // Sends features back to the master process using process.send
        if (process.send) process.send({ type: "features", data: features });
      } catch (err) {
        console.error("Error extracting features:", err);
      }

      // Round Robin
      const target = backendServers[current];
      current = (current + 1) % backendServers.length;
      proxy.web(req, res, { target });

    } catch (err) {
      res.writeHead(429, { "Content-Type": "text/plain" });
      res.end("Too many requests - You are temporarily blocked");
    }
  });

  loadBalancer.listen(8080, () => {
    console.log(`Worker ${process.pid} listening on http://localhost:8080`);
  });
}