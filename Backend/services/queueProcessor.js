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
import { Worker } from 'worker_threads';
import proxyManager from './proxyManager.js';

dotenvConfig();

let processorRunning = false; // singleton guard

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

async function downloadVideoWithProxies(pageUrl, videoId, queueDocId) {
    const workingProxies = proxyManager.getWorkingProxies();
    
    if (workingProxies.length === 0) {
        throw new Error('No working proxies available');
    }

    console.log(`[QUEUE PROCESSOR] Starting download with ${Math.min(5, workingProxies.length)} threads using working proxies...`);

    return new Promise((resolve, reject) => {
        let settled = false;
        const resolveOnce = (data) => {
            if (settled) return;
            settled = true;
            resolve(data);
        };
        const rejectOnce = (err) => {
            if (settled) return;
            settled = true;
            reject(err);
        };
        const proxyQueue = [...workingProxies];
        let activeWorkers = 0;
        let downloadStarted = false;
        let allWorkers = [];
        let activeWorker = null;
        const CONCURRENT_WORKERS = 5; // Reduced for better performance

        function terminateOthers(except) {
            allWorkers.forEach(w => {
                if (w !== except) {
                    try { w.terminate(); } catch (e) { console.error(`Failed to terminate worker: ${e.message}`); }
                }
            });
            allWorkers = except ? [except] : [];
        }

        function startWorker() {
            if (proxyQueue.length === 0 || downloadStarted) {
                if (activeWorkers === 0 && !downloadStarted) {
                    rejectOnce(new Error('All proxies failed to download the video'));
                }
                return;
            }

            activeWorkers++;
            const proxy = proxyQueue.shift();
            const worker = new Worker(path.resolve(__dirname, 'videoDownloadWorker.js'), {
                workerData: { proxy, targetUrl: pageUrl, videoId }
            });

            allWorkers.push(worker);

            worker.on('message', async (message) => {
                console.log(`[QUEUE PROCESSOR] [${message.proxy}] ${message.message}`);
                
                switch (message.status) {
                    case 'download_started':
                        if (!downloadStarted) {
                            downloadStarted = true;
                            activeWorker = worker;
                            try {
                                if (queueDocId) {
                                    const v = await VideoQueue.findById(queueDocId);
                                    if (v && v.status !== 'downloading') {
                                        v.status = 'downloading';
                                        await v.save();
                                    }
                                    io.emit('queue:downloading', { _id: queueDocId.toString() });
                                }
                            } catch (e) {
                                console.error('Emit on download_started failed:', e.message);
                            }
                            terminateOthers(worker);
                        }
                        break;
                    case 'download_finished':
                        if (worker !== activeWorker) return;
                        try {
                            if (queueDocId) {
                                const v2 = await VideoQueue.findById(queueDocId);
                                if (v2) {
                                    v2.status = 'uploading';
                                    await v2.save();
                                }
                                io.emit('queue:uploading', { _id: queueDocId.toString() });
                            }
                        } catch (e) {
                            console.error('Emit on download_finished failed:', e.message);
                        }
                        console.log(`[QUEUE PROCESSOR] Download completed successfully!`);
                        terminateOthers(null);
                        resolveOnce(message.data);
                        break;
                    case 'fail':
                        if (activeWorker && worker !== activeWorker) {
                            return;
                        }
                        if (activeWorker && worker === activeWorker) {
                            console.log(`[QUEUE PROCESSOR] Active worker with proxy ${message.proxy} failed. Retrying...`);
                            activeWorker = null;
                            downloadStarted = false;
                        }
                        break;
                }
            });

            worker.on('error', (error) => {
                console.error(`[QUEUE PROCESSOR] Worker error for proxy ${proxy}:`, error.message);
            });

            worker.on('exit', (code) => {
                activeWorkers--;
                if (!downloadStarted) {
                    startWorker();
                }
            });
        }

        for (let i = 0; i < Math.min(CONCURRENT_WORKERS, workingProxies.length); i++) {
            startWorker();
        }
    });
}

async function processQueue() {
    // DISABLED: Old queue processing loop is replaced by orchestrator in server.js
    // This function is kept as a no-op for compatibility but does nothing
    console.log('[QUEUE PROCESSOR] Old processQueue called but disabled - using server.js orchestrator instead');
    return;
}

export async function processOneById(id) {
    const video = await VideoQueue.findById(id);
    if (!video) {
        return;
    }

    let filePath = null;
    try {
        const videoId = video.link.split('/').pop() || `video_${video._id.toString()}`;

        if (video.status !== 'processing') {
            video.status = 'processing';
            await video.save();
            io.emit('queue:processing', { _id: video._id.toString() });
        }

        const { filePath: downloadedPath, videoData } = await downloadVideoWithProxies(video.link, videoId, video._id);
        filePath = downloadedPath;
        const { title, tags, thumbnailUrl } = videoData;

        video.status = 'uploading';
        await video.save();
        io.emit('queue:uploading', { _id: video._id.toString() });

        if (video.destination === 'goonchan' || video.destination === 'both') {
            await uploadViaApiRoute(filePath, title, tags, thumbnailUrl, video.userToken);
        }

        video.status = 'completed';
        await video.save();
        io.emit('queue:completed', { _id: video._id.toString() });

        if (filePath) {
            fs.unlink(filePath, (err) => {
                if (err) console.error(`Failed to delete temporary file ${filePath}:`, err);
            });
        }
    } catch (error) {
        if (filePath) {
            fs.unlink(filePath, (err) => {
                if (err) console.error(`Failed to delete temporary file on error ${filePath}:`, err);
            });
        }
        try {
            if (video) {
                if (error.message && error.message.includes('No working proxies available')) {
                    video.status = 'queued';
                } else if (error.message && error.message.includes('All proxies failed')) {
                    video.status = 'failed';
                    video.errorMessage = error.message;
                    video.retries += 1;
                } else {
                    video.status = 'failed';
                    video.errorMessage = error.message;
                    video.retries += 1;
                }
                await video.save();
                io.emit(video.status === 'queued' ? 'queue:requeued' : 'queue:failed', { _id: video._id.toString() });
            }
        } catch {}
        throw error;
    }
}

export async function startQueueProcessor() {
    console.log('[QUEUE PROCESSOR] Old startQueueProcessor called but disabled - using server.js orchestrator instead');
    return;
} 