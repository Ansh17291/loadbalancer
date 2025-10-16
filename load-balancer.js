"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = __importDefault(require("http"));
const http_proxy_1 = __importDefault(require("http-proxy"));
const rate_limiter_flexible_1 = require("rate-limiter-flexible");
const fs = __importStar(require("fs"));
const http_2 = require("http");
const backendServers = [
    'http://localhost:3001',
    'http://localhost:3002',
    'http://localhost:3003',
    'http://localhost:3004'
];
let current = 0;
let activeIndex = 0;
const rateLimiter = new rate_limiter_flexible_1.RateLimiterMemory({
    points: 20, // Allow 20 requests per second per IP
    duration: 1,
    blockDuration: 5
});
const ipActivityMap = {}; // IP -> timestamps[]
// --- Metrics/state ---
const statsFile = './stats.json';
let stats = {
    totalRequests: 0,
    blockedRequests: 0,
    ddosFlags: 0,
    activeServers: [],
    failedRequestsByServer: {},
    responseTimesByServer: {},
    loadDistribution: {},
    lastUpdated: Date.now(),
};
// initialize per-server counters
for (const s of backendServers) {
    stats.loadDistribution[s] = 0;
    stats.responseTimesByServer[s] = { count: 0, totalMs: 0, avgMs: 0 };
    stats.failedRequestsByServer[s] = 0;
}
// try to load existing stats from disk (preserve past metrics)
try {
    if (fs.existsSync(statsFile)) {
        const raw = fs.readFileSync(statsFile, 'utf8');
        const parsed = JSON.parse(raw || '{}');
        // merge parsed into stats (preserve new-server defaults)
        stats = Object.assign(Object.assign({}, stats), parsed);
        // ensure per-server entries exist
        for (const s of backendServers) {
            stats.loadDistribution[s] = ((_a = stats.loadDistribution) === null || _a === void 0 ? void 0 : _a[s]) || 0;
            stats.responseTimesByServer[s] = ((_b = stats.responseTimesByServer) === null || _b === void 0 ? void 0 : _b[s]) || { count: 0, totalMs: 0, avgMs: 0 };
        }
    }
}
catch (e) {
    console.warn('Could not read existing stats:', (e === null || e === void 0 ? void 0 : e.message) || e);
}
// Debounced save to reduce disk I/O
let saveTimer = null;
function saveStats(debounceMs = 1000) {
    stats.lastUpdated = Date.now();
    if (saveTimer)
        clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
        fs.writeFile(statsFile, JSON.stringify(stats, null, 2), (err) => {
            if (err)
                console.error('Failed to write stats:', err.message);
        });
        saveTimer = null;
    }, debounceMs);
}
// lightweight health check for active servers
function checkActiveServers() {
    return __awaiter(this, void 0, void 0, function* () {
        const up = [];
        yield Promise.all(backendServers.map((srv) => {
            return new Promise((resolve) => {
                const u = new URL(srv);
                const req = (0, http_2.request)({ method: 'HEAD', hostname: u.hostname, port: u.port, path: '/', timeout: 1500 }, (res) => {
                    if (res.statusCode && res.statusCode < 500)
                        up.push(srv);
                    resolve();
                });
                req.on('error', () => resolve());
                req.on('timeout', () => {
                    req.destroy();
                    resolve();
                });
                req.end();
            });
        }));
        stats.activeServers = up;
        saveStats();
    });
}
// run first check and schedule
checkActiveServers();
setInterval(checkActiveServers, 5000);
// proxy server to re-direct the requests 
const proxy = http_proxy_1.default.createProxyServer({});
// handle proxy errors gracefully
proxy.on('error', (err, req, res) => {
    console.error('Proxy error for target', (req && req.__target) || 'unknown', err.message);
    try {
        const t = req && req.__target;
        if (t)
            stats.failedRequestsByServer[t] = (stats.failedRequestsByServer[t] || 0) + 1;
        saveStats();
    }
    catch (e) { }
    try {
        if (!res.headersSent)
            res.writeHead(502, { 'Content-Type': 'text/plain' });
        res.end('Bad gateway');
    }
    catch (e) {
        // ignore
    }
});
const loadBalancer = http_1.default.createServer((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const ip = req.socket && req.socket.remoteAddress ? req.socket.remoteAddress : 'unknown';
    const now = Date.now();
    const url = req.url || '/';
    // CORS preflight for metrics/health
    if (url === '/metrics' || url === '/health') {
        // respond to OPTIONS preflight
        if (req.method === 'OPTIONS') {
            res.writeHead(204, {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET,OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            });
            res.end();
            return;
        }
    }
    // local endpoints: metrics and health (do not proxy)
    if (req.method === 'GET' && (url === '/metrics' || url === '/health')) {
        if (url === '/metrics') {
            res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
            res.end(JSON.stringify(stats));
            return;
        }
        // health
        const health = {
            status: 'ok',
            activeServers: stats.activeServers,
            lastUpdated: stats.lastUpdated,
        };
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify(health));
        return;
    }
    // safe logging: only log serializable parts
    console.log({ time: new Date().toISOString(), ip, method: req.method, url, headers: req.headers });
    // update activity map
    if (!ipActivityMap[ip])
        ipActivityMap[ip] = [];
    ipActivityMap[ip].push(now);
    // keeping only the data of last 5 seconds to check for the dos attacks 
    ipActivityMap[ip] = ipActivityMap[ip].filter(ts => now - ts <= 5000);
    // checking if the request counts are above the threshold , if so then dos , :)
    if (ipActivityMap[ip].length > 50) {
        console.warn(`DDoS Suspicion: ${ip} made ${ipActivityMap[ip].length} requests in 5s`);
        stats.ddosFlags = (stats.ddosFlags || 0) + 1;
        saveStats();
    }
    try {
        yield rateLimiter.consume(ip);
        // Round Robin over healthy servers when possible
        const pool = (stats.activeServers && stats.activeServers.length > 0) ? stats.activeServers : backendServers;
        const target = pool[activeIndex % pool.length];
        activeIndex = (activeIndex + 1) % pool.length;
        // record stats for attempt
        stats.totalRequests = (stats.totalRequests || 0) + 1;
        stats.loadDistribution[target] = (stats.loadDistribution[target] || 0) + 1;
        // attach metadata to req so proxy events can read it
        req.__startTime = Date.now();
        req.__target = target;
        proxy.web(req, res, { target });
    }
    catch (rateLimiterRes) {
        stats.blockedRequests = (stats.blockedRequests || 0) + 1;
        saveStats();
        res.writeHead(429, { 'Content-Type': 'text/plain' });
        res.end('Too many requests - You are temporarily blocked');
    }
}));
loadBalancer.listen(8080, () => {
    console.log('Load balancer listening at http://localhost:8080');
});
// update response time stats once proxy responds
proxy.on('proxyRes', (proxyRes, req, res) => {
    try {
        const target = req && req.__target ? req.__target : 'unknown';
        const start = req && req.__startTime ? req.__startTime : Date.now();
        const duration = Date.now() - start;
        if (!stats.responseTimesByServer[target])
            stats.responseTimesByServer[target] = { count: 0, totalMs: 0, avgMs: 0 };
        const entry = stats.responseTimesByServer[target];
        entry.count += 1;
        entry.totalMs += duration;
        entry.avgMs = entry.totalMs / entry.count;
        saveStats();
        // optionally log a short line
        console.log(`Proxied ${req.method} ${req.url} -> ${target} in ${duration}ms`);
    }
    catch (e) {
        // ignore
    }
});
