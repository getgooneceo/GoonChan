import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';
import { workerData, parentPort } from 'worker_threads';
import { fileURLToPath } from 'url';

const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36'
];

const getRandomUserAgent = () => USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const downloadsDir = path.join(__dirname, 'downloads');
if (!fs.existsSync(downloadsDir)) {
  fs.mkdirSync(downloadsDir, { recursive: true });
}

async function scrapeVideoData(pageUrl, proxy) {
    const [host, port] = proxy.split(':');
    const headers = {
        'User-Agent': getRandomUserAgent(),
        'Referer': 'https://motherless.com/',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
        'Accept-Language': 'en-US,en;q=0.9',
    };

    const response = await axios.get(pageUrl, {
        headers,
        timeout: 20000, // Reduced for speed
        proxy: {
            host,
            port: parseInt(port, 10),
            protocol: 'http'
        }
    });

    const $ = cheerio.load(response.data);
    const videoTag = $('video');
    if (!videoTag.length) throw new Error("No <video> tag found.");

    const sources = videoTag.find('source');
    if (!sources.length) throw new Error("No <source> tags found.");
    
    const sourceList = [];
    sources.each((i, el) => {
        const src = $(el).attr('src');
        if (!src || !src.startsWith('https') || !src.includes('.mp4')) return;
        
        const label = $(el).attr('label');
        let res = 0;
        if (label && label.includes('p')) {
            res = parseInt(label, 10);
        } else {
            const match = src.match(/-(\d+)p\.mp4/);
            if (match) res = parseInt(match[1], 10);
        }
        sourceList.push({ res, src });
    });

    if (!sourceList.length) throw new Error("No valid MP4 sources found.");

    sourceList.sort((a, b) => b.res - a.res);
    const videoUrl = sourceList[0].src;

    const title = $('.media-meta-title h1').text().trim();
    if (!title) throw new Error("Title not found.");

    const tags = [];
    $('.media-meta-tags a').each((i, el) => {
        tags.push($(el).text().replace('#', '').trim());
    });

    const thumbnailUrl = $('meta[property="og:image"]').attr('content');

    return { videoUrl, title, tags, thumbnailUrl };
}

async function downloadVideo(url, videoId, proxy) {
    const [host, port] = proxy.split(':');
    const filePath = path.join(downloadsDir, `${videoId}.mp4`);
    const writer = fs.createWriteStream(filePath);

    const response = await axios({
        url,
        method: 'GET',
        responseType: 'stream',
        headers: {
            'User-Agent': getRandomUserAgent(),
            'Referer': 'https://motherless.com/',
            'Accept': 'video/webm,video/ogg,video/*;q=0.9,application/ogg;q=0.7,audio/*;q=0.6,*/*;q=0.5',
            'Accept-Language': 'en-US,en;q=0.9',
        },
        timeout: 90000, // 1.5 minutes timeout
        proxy: {
            host,
            port: parseInt(port, 10),
            protocol: 'http'
        }
    });

    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
        response.data.on('error', err => {
            writer.close();
            fs.unlink(filePath, () => {}); // Clean up failed download
            reject(err);
        });
        writer.on('finish', () => {
            resolve(filePath);
        });
        writer.on('error', err => {
             fs.unlink(filePath, () => {}); // Clean up failed download
            reject(err)
        });
    });
}

async function processVideo({ proxy, targetUrl, videoId }) {
    try {
        parentPort.postMessage({ status: 'info', proxy, message: `Scraping video data from ${targetUrl}...` });
        const videoData = await scrapeVideoData(targetUrl, proxy);
        parentPort.postMessage({ status: 'success', proxy, message: `Scraped video metadata: "${videoData.title}"` });
        
        parentPort.postMessage({ status: 'download_started', proxy, message: `Downloading video...` });
        const filePath = await downloadVideo(videoData.videoUrl, videoId, proxy);
        parentPort.postMessage({ 
            status: 'download_finished', 
            proxy, 
            message: `Video downloaded and saved to ${filePath}`,
            data: { filePath, videoData }
        });

    } catch (error) {
        parentPort.postMessage({ status: 'fail', proxy, message: `Error: ${error.message.substring(0, 200)}` });
    }
}

processVideo(workerData); 