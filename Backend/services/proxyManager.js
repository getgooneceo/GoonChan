import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ProxyManager {
    constructor() {
        this.workingProxies = [];
        this.isChecking = false;
        this.refreshInterval = null;
        this.cacheFilePath = path.join(__dirname, 'cache', 'proxy-cache.json');
        this.onCheckStart = () => {};
        this.onCheckEnd = () => {};
    }

    async start(hooks = {}) {
        this.onCheckStart = hooks.onCheckStart || (() => {});
        this.onCheckEnd = hooks.onCheckEnd || (() => {});
        console.log('[PROXY MANAGER] Starting proxy manager...');
        await this.initFromCacheOrCheck();
        
        this.refreshInterval = setInterval(async () => {
            console.log('[PROXY MANAGER] Hourly refresh triggered...');
            await this.checkProxies();
        }, 60 * 60 * 1000);
        
        console.log('[PROXY MANAGER] Proxy manager started with hourly refresh cycle.');
    }

    async initFromCacheOrCheck() {
        try {
            const cache = await this.loadCache();
            if (cache && Array.isArray(cache.working) && typeof cache.storedAt === 'string') {
                const last = new Date(cache.storedAt).getTime();
                const now = Date.now();
                const ageMs = now - last;
                const oneHourMs = 60 * 60 * 1000;
                const isFresh = ageMs < oneHourMs;
                const isComplete = !!cache.complete;
                const total = cache.total || 0;
                const checked = cache.checked || 0;

                if (isFresh && isComplete) {
                    this.workingProxies = cache.working;
                    console.log(`[PROXY MANAGER] Using cached proxies (${this.workingProxies.length}) from ${cache.storedAt}.`);
                    return;
                }

                if (isFresh && !isComplete) {
                    console.log(`[PROXY MANAGER] Cache is fresh but incomplete (${checked}/${total}). Starting check...`);
                    await this.checkProxies();
                    return;
                }

                console.log('[PROXY MANAGER] Cache is stale or invalid. Starting a fresh check...');
                await this.checkProxies();
                return;
            }
        } catch (e) {
            console.warn('[PROXY MANAGER] Failed to load cache, proceeding with fresh check:', e.message);
        }
        await this.checkProxies();
    }

    async loadCache() {
        try {
            if (!fs.existsSync(path.dirname(this.cacheFilePath))) return null;
            if (!fs.existsSync(this.cacheFilePath)) return null;
            const raw = fs.readFileSync(this.cacheFilePath, 'utf-8');
            return JSON.parse(raw);
        } catch {
            return null;
        }
    }

    async saveCache(data) {
        try {
            const dir = path.dirname(this.cacheFilePath);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(this.cacheFilePath, JSON.stringify(data, null, 2), 'utf-8');
        } catch (e) {
            console.warn('[PROXY MANAGER] Failed to write cache:', e.message);
        }
    }

    async checkProxies() {
        if (this.isChecking) {
            console.log('[PROXY MANAGER] Already checking proxies, skipping...');
            return;
        }

        this.isChecking = true;
        this.onCheckStart();
        console.log('[PROXY MANAGER] Started checking proxies...');

        try {
            // Download proxy list
            console.log('[PROXY MANAGER] Downloading proxy list...');
            const response = await axios.get('https://raw.githubusercontent.com/TheSpeedX/PROXY-List/refs/heads/master/http.txt');
            const proxies = response.data.split('\n').map(p => p.trim()).filter(p => p !== '');
            
            console.log(`[PROXY MANAGER] Downloaded ${proxies.length} proxies.`);
            console.log('[PROXY MANAGER] Starting proxy test with 100 workers...');

            const storedAt = new Date().toISOString();
            // Initialize cache file for progress tracking
            await this.saveCache({ storedAt, total: proxies.length, checked: 0, complete: false, working: [] });

            const newWorkingProxies = await this.testProxiesWithQueue(proxies, 100, storedAt);
            
            this.workingProxies = newWorkingProxies;
            await this.saveCache({ storedAt, total: proxies.length, checked: proxies.length, complete: true, working: this.workingProxies });
            console.log(`[PROXY MANAGER] Ended checking with ${this.workingProxies.length} live proxies`);
            
        } catch (error) {
            console.error('[PROXY MANAGER] Error during proxy check:', error.message);
        } finally {
            this.isChecking = false;
            this.onCheckEnd();
        }
    }

    async testProxiesWithQueue(proxies, numWorkers = 100, storedAt) {
        const workingProxies = [];
        const totalProxies = proxies.length;
        let processed = 0;
        let nextIndex = 0;

        const progressInterval = setInterval(() => {
            process.stdout.write(`\r[PROXY MANAGER] Progress: ${processed}/${totalProxies}`);
            // Persist incremental progress once per second
            this.saveCache({ storedAt, total: totalProxies, checked: processed, complete: false, working: workingProxies });
        }, 1000);

        const worker = async () => {
            while (true) {
                const current = nextIndex++;
                if (current >= totalProxies) break;
                const proxy = proxies[current];
                const isWorking = await this.checkSingleProxy(proxy);
                if (isWorking) {
                    console.log(`\n[PROXY MANAGER] Found working proxy (${workingProxies.length + 1}): ${proxy}`);
                    workingProxies.push(proxy);
                }
                processed++;
            }
        };

        const workers = [];
        for (let i = 0; i < Math.min(numWorkers, totalProxies); i++) {
            workers.push(worker());
        }
        await Promise.all(workers);
        clearInterval(progressInterval);
        console.log(`\n[PROXY MANAGER] Progress: ${processed}/${totalProxies}`);
        // Final progress write (not complete yet, caller will mark complete)
        await this.saveCache({ storedAt, total: totalProxies, checked: processed, complete: false, working: workingProxies });

        return workingProxies;
    }

    async checkSingleProxy(proxy) {
        try {
            const [host, port] = proxy.split(':');
            if (!host || !port || isNaN(parseInt(port))) {
                return false;
            }

            const headers = {
                'User-Agent': this.getRandomUserAgent(),
                'Referer': 'https://motherless.com/',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
                'Accept-Language': 'en-US,en;q=0.9',
            };

            const targetUrl = 'https://motherless.com/D4EFEB3';
            
            const response = await axios.get(targetUrl, {
                headers,
                timeout: 15000, // Match python's 15s timeout
                proxy: {
                    host,
                    port: parseInt(port, 10),
                    protocol: 'http'
                }
            });

            if (response.status === 200) {
                const $ = cheerio.load(response.data);
                const videoTag = $('video');
                return videoTag.length > 0;
            }
            
            return false;
        } catch (error) {
            return false;
        }
    }

    getRandomUserAgent() {
        const userAgents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36'
        ];
        return userAgents[Math.floor(Math.random() * userAgents.length)];
    }

    getWorkingProxies() {
        return [...this.workingProxies];
    }

    getRandomProxy() {
        if (this.workingProxies.length === 0) {
            return null;
        }
        return this.workingProxies[Math.floor(Math.random() * this.workingProxies.length)];
    }

    stop() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
        console.log('[PROXY MANAGER] Proxy manager stopped.');
    }
}

export default new ProxyManager(); 