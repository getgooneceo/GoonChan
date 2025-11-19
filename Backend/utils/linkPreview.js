import axios from 'axios';
import * as cheerio from 'cheerio';
import { URL } from 'url';

// Simple in-memory cache (url -> { data, expires })
const CACHE = new Map();
const TTL_MS = 5 * 60 * 1000; // 5 minutes

function getFromCache(url) {
  const entry = CACHE.get(url);
  if (!entry) return null;
  if (Date.now() > entry.expires) {
    CACHE.delete(url);
    return null;
  }
  return entry.data;
}

function setCache(url, data) {
  CACHE.set(url, { data, expires: Date.now() + TTL_MS });
}

function isLikelyImageUrl(url) {
  return /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(url);
}

function absolute(base, maybe) {
  try {
    if (!maybe) return null;
    const u = new URL(maybe, base);
    return u.href;
  } catch {
    return null;
  }
}

export async function fetchLinkPreview(rawUrl) {
  if (!/^https?:\/\//i.test(rawUrl)) return null;
  const cached = getFromCache(rawUrl);
  if (cached) return cached;

  const previewBase = { url: rawUrl };
  try {
    const u = new URL(rawUrl);
    previewBase.domain = u.hostname;
    // Direct image shortcut
    if (isLikelyImageUrl(u.pathname)) {
      const directImg = { ...previewBase, title: 'Image', description: u.hostname, image: rawUrl };
      setCache(rawUrl, directImg);
      return directImg;
    }
  } catch {}

  let html = '';
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);
    const res = await axios.get(rawUrl, {
      responseType: 'text',
      maxContentLength: 300_000, // 300KB cap
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      signal: controller.signal,
      validateStatus: s => s >= 200 && s < 400
    });
    clearTimeout(timeout);
    const ctype = res.headers['content-type'] || '';
    if (!/^text\/(html|xml)/i.test(ctype)) {
      // Non-HTML: treat as file
      const fileLike = { ...previewBase, title: previewBase.domain || rawUrl, description: null };
      setCache(rawUrl, fileLike);
      return fileLike;
    }
    html = res.data || '';
  } catch (e) {
    const fallback = { ...previewBase, title: previewBase.domain || rawUrl };
    setCache(rawUrl, fallback);
    return fallback;
  }

  if (!html) return null;
  const $ = cheerio.load(html);

  const pick = (...candidates) => {
    for (const c of candidates) {
      if (c) {
        const trimmed = String(c).trim();
        if (trimmed) return trimmed;
      }
    }
    return null;
  };

  const og = (prop) => $(`meta[property="og:${prop}"]`).attr('content') || $(`meta[name="og:${prop}"]`).attr('content');
  const twitter = (name) => $(`meta[name="twitter:${name}"]`).attr('content');

  const title = pick(
    og('title'),
    twitter('title'),
    $('title').first().text(),
  );
  const description = pick(
    og('description'),
    twitter('description'),
    $('meta[name="description"]').attr('content')
  );
  const siteName = pick(og('site_name'));
  const image = pick(og('image'), twitter('image'), $('link[rel="image_src"]').attr('href'));
  const icon = pick(
    $('link[rel="icon"]').attr('href'),
    $('link[rel="shortcut icon"]').attr('href'),
    $('link[rel="apple-touch-icon"]').attr('href')
  );

  const final = {
    ...previewBase,
    title: title || previewBase.domain || rawUrl,
    description: description || null,
    siteName: siteName || null,
    image: absolute(rawUrl, image),
    icon: absolute(rawUrl, icon)
  };
  setCache(rawUrl, final);
  return final;
}

export function extractPreviewCandidateUrls(content, limit = 2) {
  if (!content || typeof content !== 'string') return [];
  const regex = /https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b[-a-zA-Z0-9()@:%_+.~#?&//=]*/g;
  const matches = content.match(regex) || [];
  const picked = [];
  for (const m of matches) {
    if (picked.length >= limit) break;
    // Skip markdown formatted link [text](url)
    const esc = m.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const mdPattern = new RegExp(`\\[[^\\]]+\\]\\(${esc}\\)`);
    if (mdPattern.test(content)) continue;
    picked.push(m);
  }
  return picked;
}
