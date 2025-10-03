/* eslint-disable @next/next/no-img-element */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable jsx-a11y/alt-text */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";
import React from 'react';
import Link from 'next/link';
import { VideoType } from './Types';
import { RiUser3Line } from "react-icons/ri";
import useUserAvatar from "@/hooks/useUserAvatar";

let currentPreviewingVideo: string | null = null;
const previewCallbacks: Map<string, () => void> = new Map();

class ThumbnailLoadingManager {
  private loadQueue: Array<{ videoId: string; originalUrl: string }> = [];
  private isLoading = false;
  private loadedImages = new Set<string>();
  private callbacks = new Map<string, (url: string, success: boolean) => void>();
  private batchSize = 5; // Load 5 high-quality images at a time (HTTP/2 can handle it)

  register(videoId: string, originalUrl: string, callback: (url: string, success: boolean) => void) {
    if (this.loadedImages.has(originalUrl)) {
      callback(originalUrl, true);
      return;
    }

    this.callbacks.set(videoId, callback);
    
    if (!this.loadQueue.find(item => item.videoId === videoId)) {
      this.loadQueue.push({ videoId, originalUrl });
    }

    if (!this.isLoading) {
      this.startBatchLoading();
    }
  }

  unregister(videoId: string) {
    this.callbacks.delete(videoId);
    this.loadQueue = this.loadQueue.filter(item => item.videoId !== videoId);
  }

  private async startBatchLoading() {
    if (this.isLoading || this.loadQueue.length === 0) return;
    
    this.isLoading = true;

    while (this.loadQueue.length > 0) {
      const batch = this.loadQueue.splice(0, this.batchSize);

      const promises = batch.map(({ videoId, originalUrl }) => 
        this.loadSingleImage(videoId, originalUrl)
      );

      await Promise.allSettled(promises);
    }

    this.isLoading = false;
  }

  private loadSingleImage(videoId: string, originalUrl: string): Promise<void> {
    return new Promise((resolve) => {
      const img = new Image();
      
      img.onload = () => {
        this.loadedImages.add(originalUrl);
        const callback = this.callbacks.get(videoId);
        if (callback) {
          callback(originalUrl, true);
        }
        resolve();
      };

      img.onerror = () => {
        const callback = this.callbacks.get(videoId);
        if (callback) {
          callback(originalUrl, false);
        }
        resolve();
      };

      img.src = originalUrl;
    });
  }
}

const thumbnailManager = new ThumbnailLoadingManager();

const formatCount = (count: number): string => {
  if (count >= 1000000) {
    return (count / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  } else if (count >= 1000) {
    return (count / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  } else {
    return count.toString();
  }
};

const calculateLikePercentage = (likeCount: number = 0, dislikeCount: number = 0): number => {
  if (likeCount === 0 && dislikeCount === 0) return 0;
  return Math.round((likeCount / (likeCount + dislikeCount)) * 100);
};

const formatDuration = (duration: string | number): string => {
  const seconds = typeof duration === 'string' ? parseFloat(duration) : duration;
  
  if (seconds === -1) return "Processing...";
  if (!seconds || seconds === 0 || isNaN(seconds)) return "0:00";

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${remainingSeconds
      .toString()
      .padStart(2, "0")}`;
  } else {
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  }
};

const getReducedQualityUrl = (originalUrl: string): string => {
  if (originalUrl.includes('/public')) {
    return originalUrl.replace('/public', '/reduced');
  }
  return originalUrl;
};

const getOriginalQualityUrl = (url: string): string => {
  if (url.includes('/reduced')) {
    return url.replace('/reduced', '/public');
  }
  return url;
};

interface PopunderSettings {
  enabled: boolean;
  urls: string[];
}

interface VideoCardProps {
  video: VideoType;
  popunderSettings?: PopunderSettings;
}

      const VideoCard: React.FC<VideoCardProps> = ({ video, popunderSettings }) => {
    const likePercentage = calculateLikePercentage(video.likeCount, video.dislikeCount);

    const getInitialThumbnail = (): string => {
      const thumb = video.thumbnail || '';
      return thumb.includes('/public') ? getReducedQualityUrl(thumb) : thumb;
    };
    
    const [currentThumbnail, setCurrentThumbnail] = React.useState(getInitialThumbnail());
    const [isHovering, setIsHovering] = React.useState(false);
    const [isHighQualityLoaded, setIsHighQualityLoaded] = React.useState(false);
    const [thumbnailError, setThumbnailError] = React.useState(false);
    const isHoveringRef = React.useRef(false);
    const previewIntervalRef = React.useRef<NodeJS.Timeout | null>(null);
    const previewIndexRef = React.useRef(0);
    const preloadedImagesRef = React.useRef<Set<string>>(new Set());
    const videoId = React.useRef(`${video.id || video._id}-${Math.random()}`).current;
    const originalThumbnailRef = React.useRef<string>(video.thumbnail || '');
    
    const uploaderObj = typeof video.uploader === 'string' 
      ? { username: video.uploader, avatar: undefined, avatarColor: undefined }
      : video.uploader;
    
    const avatarData = useUserAvatar(uploaderObj) as { avatarUrl: string | null; isLoading: boolean; error: string | null };
    const avatarUrl = avatarData?.avatarUrl;

    const videoUrl = `/watch?v=${video.slug || video.id}`;

    // Preview time points (in seconds) - will cycle through these
    const previewTimes = [3, 6, 9, 12, 15, 18, 21, 24, 27, 30];

  const preloadImage = (url: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (preloadedImagesRef.current.has(url)) {
        resolve();
        return;
      }
      const img = new Image();
      img.onload = () => {
        preloadedImagesRef.current.add(url);
        resolve();
      };
      img.onerror = () => {
        reject();
      };
      img.src = url;
    });
  };

  const startPreview = async () => {
    if (!video.cloudflareStreamId || !isHoveringRef.current) return;

    const durationSeconds = typeof video.duration === 'string' ? parseFloat(video.duration) : video.duration;
    if (durationSeconds < 30) return;

    if (currentPreviewingVideo && currentPreviewingVideo !== videoId) {
      const otherStopCallback = previewCallbacks.get(currentPreviewingVideo);
      if (otherStopCallback) {
        otherStopCallback();
      }
    }

    currentPreviewingVideo = videoId;

    const preloadPromises = previewTimes.slice(0, 10).map(time => {
      const url = `https://customer-jolq13ybmuso6gvq.cloudflarestream.com/${video.cloudflareStreamId}/thumbnails/thumbnail.jpg?height=720&time=${time}s`;
      return preloadImage(url).catch(() => {}); // Ignore errors
    });
    
    await Promise.all(preloadPromises);

    if (!isHoveringRef.current || currentPreviewingVideo !== videoId) {
      return;
    }

    previewIndexRef.current = 0;

    previewIntervalRef.current = setInterval(() => {
      if (currentPreviewingVideo !== videoId) {
        stopPreview();
        return;
      }

      const timePoint = previewTimes[previewIndexRef.current % previewTimes.length];
      const previewUrl = `https://customer-jolq13ybmuso6gvq.cloudflarestream.com/${video.cloudflareStreamId}/thumbnails/thumbnail.jpg?height=720&time=${timePoint}s`;

      const nextIndex = (previewIndexRef.current + 1) % previewTimes.length;
      const nextTime = previewTimes[nextIndex];
      const nextUrl = `https://customer-jolq13ybmuso6gvq.cloudflarestream.com/${video.cloudflareStreamId}/thumbnails/thumbnail.jpg?height=720&time=${nextTime}s`;
      preloadImage(nextUrl).catch(() => {});
      
      setCurrentThumbnail(previewUrl);
      previewIndexRef.current++;
    }, 800); // Change frame every 800ms
  };

  const stopPreview = () => {
    if (previewIntervalRef.current) {
      clearInterval(previewIntervalRef.current);
      previewIntervalRef.current = null;
    }
    previewIndexRef.current = 0;

    const originalThumbnail = originalThumbnailRef.current;
    if (originalThumbnail.includes('/public')) {
      setCurrentThumbnail(isHighQualityLoaded ? originalThumbnail : getReducedQualityUrl(originalThumbnail));
    } else {
      setCurrentThumbnail(originalThumbnail);
    }

    if (currentPreviewingVideo === videoId) {
      currentPreviewingVideo = null;
    }
    previewCallbacks.delete(videoId);
  };

  const handleMouseEnter = () => {
    isHoveringRef.current = true;
    setIsHovering(true);
    startPreview();
  };

  const handleMouseLeave = () => {
    isHoveringRef.current = false;
    setIsHovering(false);
    stopPreview();
  };

  React.useEffect(() => {
    previewCallbacks.set(videoId, stopPreview);

    return () => {
      stopPreview();
      previewCallbacks.delete(videoId);
    };
  }, []);

  React.useEffect(() => {
    const originalThumbnail = video.thumbnail || '';
    originalThumbnailRef.current = originalThumbnail;
    
    if (!originalThumbnail) return;

    if (originalThumbnail.includes('/public')) {
      const reducedQualityUrl = getReducedQualityUrl(originalThumbnail);

      if (currentThumbnail !== reducedQualityUrl && !isHighQualityLoaded) {
        setCurrentThumbnail(reducedQualityUrl);
      }
      setIsHighQualityLoaded(false);
      setThumbnailError(false);

      thumbnailManager.register(videoId, originalThumbnail, (url: string, success: boolean) => {
        if (success && originalThumbnailRef.current === originalThumbnail) {
          setIsHighQualityLoaded(true);
          if (!isHoveringRef.current) {
            setCurrentThumbnail(originalThumbnail);
          }
        } else if (!success) {
          setThumbnailError(true);
        }
      });
    } else {
      // If URL doesn't follow the pattern, use original directly
      setCurrentThumbnail(originalThumbnail);
      setIsHighQualityLoaded(true);
    }

    return () => {
      thumbnailManager.unregister(videoId);
    };
  }, [video.thumbnail]);

  const handleVideoClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (popunderSettings?.enabled && popunderSettings?.urls && popunderSettings.urls.length > 0) {
      if (Math.random() < 0.6) {
        e.preventDefault();
        
        try {
          const randomUrl = popunderSettings.urls[Math.floor(Math.random() * popunderSettings.urls.length)];

          window.open(videoUrl, '_blank');

          setTimeout(() => {
            window.location.href = randomUrl;
          }, 100);
        } catch (error) {
          console.error('Popunder failed:', error);
          window.location.href = videoUrl;
        }
      }
    }
    // If popunder is disabled or random check fails, let Link handle navigation normally
  };
  
  return (
    <div 
      className=""
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <Link 
        href={videoUrl}
        className="block group cursor-pointer"
        onClick={handleVideoClick}
      >
        <div className="relative aspect-video overflow-hidden rounded-lg bg-[#101010]">
          <img 
            src={currentThumbnail} 
            // alt={video.title || ''}
            className={`object-contain w-full h-full transition-all duration-300 ease-in-out ${
              isHovering ? 'scale-[1.02]' : 'scale-100'
            } ${
              !isHighQualityLoaded && !thumbnailError ? 'blur-[0.5px] brightness-95' : ''
            }`}
            style={{ imageRendering: 'auto' }}
            onLoad={() => {
            }}
            onError={() => {
              setThumbnailError(true);
            }}
          />
          
          <div className="absolute inset-0 bg-gradient-to-b from-black/0 via-black/0 to-[#00000059] opacity-95"></div>
          
          <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded">
            {formatDuration(video.duration)}
          </div>
        </div>
      </Link>

      <div className="flex mt-3 gap-3">
        <Link 
          href={`/profile?user=${encodeURIComponent(uploaderObj.username)}`}
          className="flex-shrink-0"
        >
          <div className="w-9 h-9 rounded-full overflow-hidden bg-[#1f1f1f] hover:opacity-80 transition-opacity">
            {(uploaderObj.avatar || avatarUrl) ? (
              <>
                <img
                  src={uploaderObj.avatar || avatarUrl || ''}
                  // alt={`${uploaderObj.username}'s avatar`}
                  className="object-cover w-full h-full"
                />
                <div className="w-full h-full flex items-center justify-center bg-[#1f1f1f]" style={{display: 'none'}}>
                  <RiUser3Line className="text-[#666] text-lg" />
                </div>
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-[#1f1f1f]">
                <RiUser3Line className="text-[#666] text-lg" />
              </div>
            )}
          </div>
        </Link>

        <div className="flex-1 min-w-0">
          <Link 
            href={videoUrl}
            className="block group cursor-pointer"
            onClick={handleVideoClick}
          >
            <h3 className="font-medium text-white text-sm font-inter leading-5 group-hover:text-[#ea4197] transition-colors duration-200 line-clamp-2">
              {video.title}
            </h3>
          </Link>

          <div className="mt-[1.5px]">
            <div className="flex items-center font-pop flex-wrap gap-1.5 text-xs">
              <Link 
                href={`/profile?user=${encodeURIComponent(uploaderObj.username)}`} 
                className="text-[#aaa] hover:text-[#ea4197] font-pop transition-colors duration-200"
              >
                {uploaderObj.username}
              </Link>
              <span className="text-[#666]">•</span>
              <span className="text-[#aaa]">{formatCount(video.views)} views</span>
              <span className="text-[#666]">•</span>
              <span className="text-[#ea4197]">{likePercentage}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoCard;