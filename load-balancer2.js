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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.proxy = exports.loadBalancer = void 0;
const http = __importStar(require("http"));
const http_proxy_1 = __importDefault(require("http-proxy"));
const rate_limiter_flexible_1 = require("rate-limiter-flexible");
const backendServers = [
    'http://localhost:3001',
    'http://localhost:3002',
    'http://localhost:3003',
    'http://localhost:3004'
];
const serverHealth = new Map(backendServers.map(server => [server, true]));
const serverResponseTimes = new Map(backendServers.map(server => [server, []]));
let current = 0;
const rateLimiter = new rate_limiter_flexible_1.RateLimiterMemory({
    points: 20,
    duration: 1,
    blockDuration: 30,
    execEvenly: true
});
const ipActivityMap = new Map();
const suspiciousIPs = new Set();
const whitelistedIPs = new Set([
    '::1',
    '127.0.0.1'
]);
const proxy = http_proxy_1.default.createProxyServer({
    timeout: 10000,
    proxyTimeout: 10000
});
exports.proxy = proxy;
function trackIPActivity(ip) {
    const now = Date.now();
    if (!ipActivityMap.has(ip)) {
        ipActivityMap.set(ip, []);
    }
    const timestamps = ipActivityMap.get(ip) || [];
    timestamps.push(now);
    const filtered = timestamps.filter((ts) => now - ts <= 10000);
    ipActivityMap.set(ip, filtered);
    return filtered;
}
function detectDoSAttack(ip, timestamps) {
    if (whitelistedIPs.has(ip))
        return false;
    const now = Date.now();
    const last1sec = timestamps.filter((ts) => now - ts <= 1000).length;
    const last5sec = timestamps.filter((ts) => now - ts <= 5000).length;
    const last10sec = timestamps.filter((ts) => now - ts <= 10000).length;
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
function getFastestHealthyServer() {
    const healthyServers = backendServers.filter(server => serverHealth.get(server));
    if (healthyServers.length === 0)
        throw new Error('No healthy servers');
    healthyServers.sort((a, b) => {
        const avgA = average(serverResponseTimes.get(a) || []);
        const avgB = average(serverResponseTimes.get(b) || []);
        return avgA - avgB;
    });
    return healthyServers[0];
}
function average(arr) {
    if (arr.length === 0)
        return Infinity;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
}
function fetchWithTimeout(url_1) {
    return __awaiter(this, arguments, void 0, function* (url, options = {}) {
        const { timeout = 5000 } = options, fetchOptions = __rest(options, ["timeout"]);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        try {
            const response = yield fetch(url, Object.assign(Object.assign({}, fetchOptions), { signal: controller.signal }));
            clearTimeout(timeoutId);
            return response;
        }
        catch (error) {
            clearTimeout(timeoutId);
            throw error;
        }
    });
}
function healthCheck() {
    return __awaiter(this, void 0, void 0, function* () {
        for (const server of backendServers) {
            try {
                const start = Date.now();
                const response = yield fetchWithTimeout(`${server}/health`, {
                    timeout: 5000,
                    method: 'GET'
                });
                const responseTime = Date.now() - start;
                const times = serverResponseTimes.get(server) || [];
                times.push(responseTime);
                if (times.length > 10)
                    times.shift();
                serverResponseTimes.set(server, times);
                serverHealth.set(server, response.ok);
                if (!response.ok) {
                    console.warn(` Server ${server} is unhealthy`);
                }
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                console.error(` Server ${server} health check failed:`, errorMessage);
                serverHealth.set(server, false);
            }
        }
    });
}
function getNextServer() {
    const healthyServers = backendServers.filter(server => serverHealth.get(server));
    if (healthyServers.length === 0) {
        throw new Error('No healthy servers available');
    }
    let attempts = 0;
    while (attempts < backendServers.length) {
        const server = backendServers[current];
        current = (current + 1) % backendServers.length;
        if (serverHealth.get(server)) {
            return server;
        }
        attempts++;
    }
    return healthyServers[0];
}
function logRequest(ip, url, method, userAgent) {
    const timestamp = new Date().toISOString();
    const suspicious = suspiciousIPs.has(ip) ? '🚨' : '';
    console.log(`[${timestamp}] ${suspicious} ${method} ${url} from ${ip} | UA: ${(userAgent === null || userAgent === void 0 ? void 0 : userAgent.substring(0, 50)) || 'N/A'}`);
}
const loadBalancer = http.createServer((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const ip = req.socket.remoteAddress || req.headers['x-forwarded-for'] || 'unknown';
    const url = req.url || '/';
    const method = req.method || 'GET';
    const userAgent = req.headers['user-agent'];
    logRequest(ip, url, method, userAgent);
    try {
        const timestamps = trackIPActivity(ip);
        if (detectDoSAttack(ip, timestamps)) {
            res.writeHead(429, {
                'Content-Type': 'text/plain',
                'Retry-After': '60'
            });
            res.end('Request blocked - Suspicious activity detected');
            return;
        }
        yield rateLimiter.consume(ip);
        const target = getNextServer();
        proxy.web(req, res, {
            target,
            changeOrigin: true,
            timeout: 10000
        }, (error) => {
            console.error(`Proxy error for ${target}:`, error.message);
            serverHealth.set(target, false);
            if (!res.headersSent) {
                res.writeHead(502, { 'Content-Type': 'text/plain' });
                res.end('Bad Gateway - Backend server unavailable');
            }
        });
    }
    catch (rateLimiterRes) {
        const rateLimiterError = rateLimiterRes;
        const msBeforeNext = rateLimiterError.msBeforeNext || 30000;
        res.writeHead(429, {
            'Content-Type': 'text/plain',
            'Retry-After': Math.round(msBeforeNext / 1000).toString(),
            'X-RateLimit-Limit': '20',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(Date.now() + msBeforeNext).toISOString()
        });
        res.end('Too Many Requests - Rate limit exceeded');
    }
}));
exports.loadBalancer = loadBalancer;
proxy.on('error', ((err, req, res) => {
    console.error('Proxy error:', err);
    if (res && !res.headersSent) {
        try {
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('Internal Server Error');
        }
        catch (writeError) {
            console.error('Error writing error response:', writeError);
        }
    }
}));
proxy.on('proxyRes', (proxyRes, req, res) => {
    const ip = req.socket.remoteAddress || 'unknown';
    console.log(`✅ Proxy response: ${proxyRes.statusCode} for ${req.method} ${req.url} from ${ip}`);
});
setInterval(() => {
    const now = Date.now();
    const cutoff = 5 * 60 * 1000;
    for (const [ip, timestamps] of ipActivityMap.entries()) {
        const recent = timestamps.filter((ts) => now - ts <= cutoff);
        if (recent.length === 0) {
            ipActivityMap.delete(ip);
            suspiciousIPs.delete(ip);
        }
        else {
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
