import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';
import VideoQueue from '../models/VideoQueue.js';
import { io } from '../server.js';
import { fileURLToPath } from 'url';
import FormDataNode from 'form-data';
import { config as dotenvConfig } from 'dotenv';
import config from '../../config.json' assert { type: 'json' };

dotenvConfig();

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

async function uploadViaApiRoute(filePath, title, tags, thumbnailUrl, userToken) {
    const form = new FormDataNode();

    form.append('title', title);
    form.append('description', 'nothing');
    form.append('tags', tags.join(' '));
    form.append('token', userToken);

    const videoBuffer = fs.readFileSync(filePath);
    form.append('videoFile', videoBuffer, {
        filename: path.basename(filePath) || 'video.mp4',
        contentType: 'video/mp4',
    });

    if (thumbnailUrl) {
        try {
            const thumbResponse = await axios.get(thumbnailUrl, { responseType: 'arraybuffer' });
            form.append('thumbnailFile', thumbResponse.data, {
                filename: 'thumbnail.jpg',
                contentType: thumbResponse.headers['content-type'] || 'image/jpeg'
            });
        } catch (error) {
            console.warn(`Could not download thumbnail from ${thumbnailUrl}:`, error.message);
        }
    }

    try {
        const response = await axios.post(
            `${config.url}/api/uploadVideo`,
            form,
            {
                headers: {
                    ...form.getHeaders(),
                },
                maxContentLength: Infinity,
                maxBodyLength: Infinity,
            }
        );

        if (!response.data.success) {
            throw new Error(`API upload failed: ${response.data.message}`);
        }
        
        console.log(`Successfully submitted video to upload API for: ${title}`);
    } catch (error) {
        const errorMessage = error.response ? JSON.stringify(error.response.data) : error.message;
        console.error('Error calling uploadVideo API route:', errorMessage);
        throw new Error(`Failed to upload via API: ${errorMessage}`);
    }
}


async function scrapeVideoData(pageUrl, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            const headers = {
                'User-Agent': getRandomUserAgent(),
                'Referer': 'https://motherless.com/',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept-Encoding': 'gzip, deflate, br',
            };
            const response = await axios.get(pageUrl, { headers, timeout: 30000 });
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
            if (!thumbnailUrl) {
                console.warn(`Could not find thumbnail for ${pageUrl}`);
            }

            return { videoUrl, title, tags, thumbnailUrl }; // Success, return data

        } catch (error) {
            console.error(`Failed to get video data for ${pageUrl} (attempt ${i + 1}/${retries}):`, error.message);
            if (i === retries - 1) { // Last attempt failed
                throw error;
            }
            await new Promise(resolve => setTimeout(resolve, 5000)); // wait 5s before retrying
        }
    }
    throw new Error(`Failed to scrape video data from ${pageUrl} after ${retries} attempts.`);
}

async function downloadVideo(url, videoId, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
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
                    'Accept-Encoding': 'gzip, deflate, br',
                },
                timeout: 120000 // 2 minutes timeout
            });

            response.data.pipe(writer);

            return await new Promise((resolve, reject) => {
                response.data.on('error', err => {
                    console.error(`Error during video download stream (attempt ${i + 1}/${retries}):`, err.message);
                    writer.close();
                    fs.unlink(filePath, () => {});
                    reject(err);
                });
                writer.on('finish', () => {
                    resolve(filePath);
                });
                writer.on('error', reject);
            });
        } catch (error) {
            console.error(`Download attempt ${i + 1} failed for ${url}:`, error.message);
            if (i === retries - 1) throw error;
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }
    // This should not be reachable, but as a safeguard:
    throw new Error(`Failed to download video from ${url} after ${retries} attempts.`);
}

async function processQueue() {
    const video = await VideoQueue.findOneAndUpdate(
      { status: 'queued' },
      { status: 'processing' },
      { new: true, sort: { createdAt: 1 } }
    );

    if (!video) {
        setTimeout(processQueue, 5000); 
        return;
    }

    io.emit('queue:update', await VideoQueue.find().sort({ createdAt: -1 }));
    
    let filePath = null;
    try {
        const { videoUrl, title, tags, thumbnailUrl } = await scrapeVideoData(video.link);
        const videoId = video.link.split('/').pop() || `video_${video._id.toString()}`;
        
        video.status = 'downloading';
        await video.save();
        io.emit('queue:update', await VideoQueue.find().sort({ createdAt: -1 }));

        filePath = await downloadVideo(videoUrl, videoId);

        video.status = 'uploading';
        await video.save();
        io.emit('queue:update', await VideoQueue.find().sort({ createdAt: -1 }));

        if (video.destination === 'goonchan' || video.destination === 'both') {
            await uploadViaApiRoute(filePath, title, tags, thumbnailUrl, video.userToken);
        }

        video.status = 'completed';
        await video.save();
        io.emit('queue:update', await VideoQueue.find().sort({ createdAt: -1 }));
        
        console.log(`Successfully processed: ${video.link}.`);

        if (filePath) {
            fs.unlink(filePath, (err) => {
                if (err) console.error(`Failed to delete temporary file ${filePath}:`, err);
            });
        }
        processQueue();

    } catch (error) {
        if (filePath) {
            fs.unlink(filePath, (err) => {
                if (err) console.error(`Failed to delete temporary file on error ${filePath}:`, err);
            });
        }
        video.status = 'failed';
        video.errorMessage = error.message;
        video.retries += 1;
        await video.save();

        console.error(`Failed to process ${video.link}:`, error.message);
        io.emit('queue:update', await VideoQueue.find().sort({ createdAt: -1 }));
        
        const delay = 10000; // 10 seconds
        setTimeout(processQueue, delay);
    }
}

export function startQueueProcessor() {
    console.log('Queue processor started.');
    processQueue();
} 