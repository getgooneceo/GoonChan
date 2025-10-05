"use client";
import React, { useState } from "react";
import Link from "next/link";
import { toast, Toaster } from "sonner";
import { FiTrash2 } from "react-icons/fi";
import config from "@/config.json";

let currentPreviewingVideo = null;
const previewCallbacks = new Map();

class ThumbnailLoadingManager {
  constructor() {
    this.loadQueue = [];
    this.isLoading = false;
    this.loadedImages = new Set();
    this.callbacks = new Map();
    this.batchSize = 5;
  }

  register(videoId, originalUrl, callback) {
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

  unregister(videoId) {
    this.callbacks.delete(videoId);
    this.loadQueue = this.loadQueue.filter(item => item.videoId !== videoId);
  }

  async startBatchLoading() {
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

  loadSingleImage(videoId, originalUrl) {
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

const formatCount = (count) => {
  if (count >= 1000000) {
    return (count / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
  } else if (count >= 1000) {
    return (count / 1000).toFixed(1).replace(/\.0$/, "") + "K";
  } else {
    return count.toString();
  }
};

const calculateLikePercentage = (likeCount = 0, dislikeCount = 0) => {
  if (likeCount === 0 && dislikeCount === 0) return 0;
  return Math.round((likeCount / (likeCount + dislikeCount)) * 100);
};

const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const formatDuration = (seconds) => {
  if (seconds === -1) return "Processing...";
  if (!seconds || seconds === 0) return "0:00";

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

const getReducedQualityUrl = (originalUrl) => {
  if (originalUrl.includes('/public')) {
    return originalUrl.replace('/public', '/reduced');
  }
  return originalUrl;
};

const getOriginalQualityUrl = (url) => {
  if (url.includes('/reduced')) {
    return url.replace('/reduced', '/public');
  }
  return url;
};

const ProfileVideoCard = ({ video, isOwnProfile, onDelete }) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const getInitialThumbnail = () => {
    const thumb = video.thumbnail || '';
    return thumb.includes('/public') ? getReducedQualityUrl(thumb) : thumb;
  };
  
  const [currentThumbnail, setCurrentThumbnail] = useState(getInitialThumbnail());
  const [isHovering, setIsHovering] = useState(false);
  const [isHighQualityLoaded, setIsHighQualityLoaded] = useState(false);
  const [thumbnailError, setThumbnailError] = useState(false);
  const isHoveringRef = React.useRef(false);
  const previewIntervalRef = React.useRef(null);
  const previewIndexRef = React.useRef(0);
  const preloadedImagesRef = React.useRef(new Set());
  const videoId = React.useRef(`${video.id || video._id}-${Math.random()}`).current;
  const originalThumbnailRef = React.useRef(video.thumbnail || '');
  const likePercentage = calculateLikePercentage(video.likeCount, video.dislikeCount);
  const isProcessing = video.isProcessing || false;

  // Preview time points (in seconds) - will cycle through these
  const previewTimes = [3, 6, 9, 12, 15, 18, 21, 24, 27, 30];

  const preloadImage = (url) => {
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
    if (!video.cloudflareStreamId || isProcessing || !isHoveringRef.current) return;

    const durationSeconds = typeof video.duration === 'string' ? parseFloat(video.duration) : video.duration;
    if (durationSeconds < 30) return;

    if (currentPreviewingVideo && currentPreviewingVideo !== videoId) {
      const otherStopCallback = previewCallbacks.get(currentPreviewingVideo);
      if (otherStopCallback) {
        otherStopCallback();
      }
    }

    currentPreviewingVideo = videoId;

    const preloadPromises = previewTimes.slice(0, 3).map(time => {
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
    if (isProcessing) return;
    isHoveringRef.current = true;
    setIsHovering(true);
    // Start preview immediately
    startPreview();
  };

  const handleMouseLeave = () => {
    isHoveringRef.current = false;
    setIsHovering(false);
    stopPreview();
  };

  const handleTouchStart = (e) => {
    if (!isHoveringRef.current && video.cloudflareStreamId && !isProcessing) {
      e.preventDefault();
      isHoveringRef.current = true;
      setIsHovering(true);
      startPreview();

      setTimeout(() => {
        if (isHoveringRef.current) {
          handleMouseLeave();
        }
      }, 10000);
    }
  };

  React.useEffect(() => {
    // Register stop callback for this video
    previewCallbacks.set(videoId, stopPreview);
    
    // Cleanup on unmount
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

      thumbnailManager.register(videoId, originalThumbnail, (url, success) => {
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
      setCurrentThumbnail(originalThumbnail);
      setIsHighQualityLoaded(true);
    }

    return () => {
      thumbnailManager.unregister(videoId);
    };
  }, [video.thumbnail]);

  const handleDelete = async () => {
    if (!isOwnProfile) return;

    setIsDeleting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${config.url}/api/delete/video/${video._id || video.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Video deleted successfully');
        onDelete && onDelete(video._id || video.id);
      } else {
        toast.error(data.message || 'Failed to delete video');
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete video');
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleProcessingClick = (e) => {
    e.preventDefault();
    toast.info(
      "Video is still processing. Refreshing page to check for updates...",
      {
        duration: 2000,
      }
    );

    setTimeout(() => {
      window.location.reload();
    }, 2000);
  };

  return (
    <>
      <div
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {isProcessing ? (
          <div className="block cursor-pointer" onClick={handleProcessingClick}>
            <div className="relative aspect-video overflow-hidden rounded-lg bg-[#101010]">
              <div className="w-full h-full bg-[#1a1a1a] animate-pulse flex items-center justify-center">
                <div className="text-white/80 font-roboto text-sm font-medium">Processing...</div>
              </div>
              <div className="absolute inset-0 bg-gradient-to-b from-black/0 via-black/0 to-[#00000059] opacity-95"></div>
              <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded">
                {formatDuration(video.duration)}
              </div>
            </div>
          </div>
        ) : (
          <Link 
            href={`/watch?v=${video.slug}`} 
            className="block group cursor-pointer"
            onTouchStart={handleTouchStart}
          >
            <div className="relative aspect-video overflow-hidden rounded-lg bg-[#101010]">
              <img
                src={currentThumbnail}
                // alt={video.title || ""}
                className={`object-contain w-full h-full transition-all duration-300 ease-in-out ${
                  isHovering ? 'scale-[1.02]' : 'scale-100'
                } ${
                  !isHighQualityLoaded && !thumbnailError ? 'blur-[0.5px] brightness-95' : ''
                }`}
                style={{ imageRendering: 'auto' }}
                onLoad={() => {
                  // Additional handling if needed
                }}
                onError={(e) => {
                  setThumbnailError(true);
                  console.warn('Video thumbnail failed to load:', video.thumbnail);
                  e.target.src = '/logo.webp'; // Fallback to logo
                }}
              />

              {!isHighQualityLoaded && !thumbnailError && !isHovering && (
                <div className="absolute inset-0 bg-black/5 animate-pulse" />
              )}

              <div className="absolute inset-0 bg-gradient-to-b from-black/0 via-black/0 to-[#00000059] opacity-95"></div>

              {isOwnProfile && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowDeleteConfirm(true);
                  }}
                  className={`absolute top-2 right-2 bg-red-600/80 hover:bg-red-600 text-white p-1.5 rounded-full transition-all duration-200 ease-in-out z-10 transform hover:scale-110 ${isHovering ? 'opacity-100' : 'opacity-100 md:opacity-0'}`}
                  title="Delete video"
                >
                  <FiTrash2 size={14} />
                </button>
              )}

              <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded">
                {formatDuration(video.duration)}
              </div>
            </div>
          </Link>
        )}

        <div className="mt-2">
          <Link 
            href={`/watch?v=${video.slug}`}
            className="block group cursor-pointer"
          >
            <h3 className="font-medium text-white text-sm font-pop leading-normal group-hover:text-[#ea4197] transition-colors duration-200 ease-in-out line-clamp-2">
              {video.title}
            </h3>
          </Link>

          <div className="flex items-center mt-1 text-[#b1b1b1] text-xs">
            <span>{formatDate(video.createdAt)}</span>
            <span className="mx-1.5">•</span>
            <span>{formatCount(video.views)} views</span>
            <span className="mx-1.5">•</span>
            <span className="text-[#ea4197]">{likePercentage}%</span>
          </div>
        </div>
      </div>

      {showDeleteConfirm && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200"
          onClick={(e) => e.target === e.currentTarget && setShowDeleteConfirm(false)}
        >
          <div className="bg-[#1a1a1a] rounded-xl p-6 max-w-sm w-full border border-[#333] shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
            <div className="flex items-center gap-3 mb-4">
              <div className=" flex items-center justify-center">
                <FiTrash2 className="text-red-400" size={18} />
              </div>
              <h3 className="text-lg font-semibold text-white">Delete Video</h3>
            </div>
            
            <p className="text-white/70 mb-6 leading-relaxed">
              Are you sure you want to delete <span className="text-white font-medium">"{video.title}"</span>? This action cannot be undone.
            </p>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2.5 px-4 cursor-pointer bg-[#333] hover:bg-[#444] text-white rounded-lg transition-all duration-200 font-medium"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 py-2.5 px-4 cursor-pointer bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Deleting...
                  </div>
                ) : (
                  'Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const ProfileVideoGrid = ({ videos, isOwnProfile, onVideoDelete }) => {
  const handleVideoDelete = (deletedVideoId) => {
    onVideoDelete && onVideoDelete(deletedVideoId);
  };

  if (!videos || videos.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-white/50">No videos found</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {videos.map((video) => (
          <ProfileVideoCard 
            key={video.id || video._id} 
            video={video} 
            isOwnProfile={isOwnProfile}
            onDelete={handleVideoDelete}
          />
        ))}
      </div>
    </>
  );
};

export default ProfileVideoGrid;
