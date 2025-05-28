"use client";
import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import NavBar from "@/components/NavBar";
import "remixicon/fonts/remixicon.css";
import VideoGrid from "@/components/VideoGrid";
import {
  FaThumbsUp,
  FaThumbsDown,
  FaShare,
  FaBell,
  FaCommentAlt,
  FaList,
  FaFireAlt,
} from "react-icons/fa";
import { FaFlag } from "react-icons/fa6";
// import { Stream } from "@cloudflare/stream-react";
import config from "@/config.json";
import useUserAvatar from '@/hooks/useUserAvatar';
import AuthModel from "@/components/authModel";

interface VideoUploader {
  _id: string;
  username: string;
  avatar?: string;
  avatarColor?: string;
  subscriberCount: number;
}

interface VideoData {
  _id: string;
  id: string;
  title: string;
  description?: string;
  slug: string;
  videoUrl: string;
  thumbnail?: string;
  duration: string;
  views: number;
  likedBy: string[];
  dislikedBy: string[];
  tags?: string[];
  cloudflareStreamId: string;
  createdAt: string;
  uploader: VideoUploader;
  comments?: CommentData[];
  contentType?: string; // 'video' or 'image'
  imageUrls?: string[];
  thumbnailIndex?: number;
}

interface CommentData {
  id: string;
  username: string;
  avatar: string;
  content: string;
  timeAgo: string;
  likes: number;
  replies?: ReplyData[];
}

interface ReplyData {
  id: string;
  username: string;
  avatar: string;
  content: string;
  timeAgo: string;
  likes: number;
}

const getRelativeTimeFromDate = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();

  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffMonths / 12);

  if (diffSeconds < 60) {
    return "just now";
  } else if (diffMinutes < 60) {
    return diffMinutes === 1 ? "1 minute ago" : `${diffMinutes} minutes ago`;
  } else if (diffHours < 24) {
    return diffHours === 1 ? "1 hour ago" : `${diffHours} hours ago`;
  } else if (diffDays < 30) {
    return diffDays === 1 ? "1 day ago" : `${diffDays} days ago`;
  } else if (diffMonths < 12) {
    return diffMonths === 1 ? "1 month ago" : `${diffMonths} months ago`;
  } else {
    return diffYears === 1 ? "1 year ago" : `${diffYears} years ago`;
  }
};

const formatCount = (count: number): string => {
  if (count >= 1000000) {
    return (count / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
  } else if (count >= 1000) {
    return (count / 1000).toFixed(1).replace(/\.0$/, "") + "K";
  } else {
    return count.toString();
  }
};

const WatchPageLoading = () => {
  return (
    <div className="bg-[#080808] min-h-screen w-full">
      <NavBar />
      <div className="max-w-[79rem] mx-auto px-4 pt-2 pb-8 text-white text-center py-20">
        <div className="inline-block w-10 h-10 border-4 border-t-[#ea4197] border-r-[#ea4197] border-b-transparent border-l-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-white font-medium">Loading video...</p>
      </div>
    </div>
  );
};

const WatchPageContent = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const videoSlug = searchParams.get("v") as string;
  const [video, setVideo] = useState<VideoData | null>(null);
  const [comments, setComments] = useState<CommentData[]>([]);
  const [relatedVideos, setRelatedVideos] = useState<VideoData[]>([]);
  const [activeTab, setActiveTab] = useState<"related" | "recommended">(
    "related"
  );
  const [isLiked, setIsLiked] = useState(false);
  const [isDisliked, setIsDisliked] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [dislikeCount, setDislikeCount] = useState(0);
  const [subscriberCount, setSubscriberCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [likeDislikeCooldown, setLikeDislikeCooldown] = useState(false);
  const [subscribeCooldown, setSubscribeCooldown] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const commentsRef = useRef<HTMLDivElement>(null);
  const [uploaderProfile, setUploaderProfile] = useState<any>(null);

  const streamContainerRef = useRef<HTMLDivElement>(null);
  const [loadingMessage, setLoadingMessage] = useState("Loading video...");
  const { avatarUrl: uploaderAvatarUrl } = useUserAvatar(uploaderProfile) as { avatarUrl: string; isLoading: boolean };

  const isCurrentUserUploader = user && video?.uploader?._id && user._id === video.uploader._id;

  useEffect(() => {
    const fetchVideo = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const token = localStorage.getItem('token');
        const url = token 
          ? `${config.url}/api/content/${videoSlug}?token=${token}`
          : `${config.url}/api/content/${videoSlug}`;
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.success && data.content) {
          const contentType = data.type;

          const mappedContent: VideoData = {
            ...data.content,
            id: data.content._id,
            uploader: data.content.uploader || {},
            comments: data.content.comments || [],
            videoUrl: contentType === 'image' ? '' : data.content.videoUrl,
            thumbnail: contentType === 'image' ? 
              (data.content.imageUrls && data.content.imageUrls[data.content.thumbnailIndex || 0]) : 
              data.content.thumbnail,
            duration: contentType === 'image' ? '0:00' : data.content.duration,
            cloudflareStreamId: contentType === 'image' ? '' : data.content.cloudflareStreamId,
            contentType: contentType,
            imageUrls: contentType === 'image' ? data.content.imageUrls : undefined,
            thumbnailIndex: contentType === 'image' ? data.content.thumbnailIndex : undefined
          };
          
          setVideo(mappedContent);
          setComments(data.content.comments || []);

          setLikeCount(data.content.likeCount || 0);
          setDislikeCount(data.content.dislikeCount || 0);
          
          if (data.content.userInteractionStatus) {
            setIsLiked(data.content.userInteractionStatus.isLiked);
            setIsDisliked(data.content.userInteractionStatus.isDisliked);
          }

          if (data.content.userSubscriptionStatus) {
            setIsSubscribed(data.content.userSubscriptionStatus.isSubscribed);
          }

          setSubscriberCount(data.content.uploader?.subscriberCount || 0);
          
          if (data.content.uploader?.username) {
            fetchUploaderProfile(data.content.uploader.username);
          }
        } else {
          setError(data.message || 'Content not found');
        }
      } catch (error) {
        console.error('Error fetching content:', error);
        setError('Failed to load content');
      } finally {
        setIsLoading(false);
      }
    };

    if (videoSlug) {
      fetchVideo();
    }
  }, [videoSlug]);

  const fetchUploaderProfile = async (username: string) => {
    try {
      const response = await fetch(`${config.url}/api/profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username }),
      });
      
      const data = await response.json();
      
      if (data.success && data.user) {
        setUploaderProfile(data.user);
      }
    } catch (error) {
      console.error('Error fetching uploader profile:', error);
    }
  };

  const handleUploaderClick = () => {
    if (video?.uploader?.username) {
      router.push(`/profile?user=${video.uploader.username}`);
    }
  };

  const handleLike = async () => {
    const token = localStorage.getItem('token');
    
    if (!token) {
      setShowAuthModal(true);
      return;
    }

    if (!video?._id || likeDislikeCooldown) return;

    setLikeDislikeCooldown(true);
    setTimeout(() => setLikeDislikeCooldown(false), 300);

    const wasLiked = isLiked;
    const wasDisliked = isDisliked;
    
    if (wasLiked) {
      setIsLiked(false);
      setLikeCount(prev => prev - 1);
    } else {
      setIsLiked(true);
      setLikeCount(prev => prev + 1);
      if (wasDisliked) {
        setIsDisliked(false);
        setDislikeCount(prev => prev - 1);
      }
    }

    fetch(`${config.url}/api/interactions/toggle-like`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token,
        contentId: video._id,
        contentType: 'video',
        action: 'like'
      }),
    }).catch(error => {
      console.error('Error liking video:', error);
    });
  };

  const handleDislike = async () => {
    const token = localStorage.getItem('token');
    
    if (!token) {
      setShowAuthModal(true);
      return;
    }

    if (!video?._id || likeDislikeCooldown) return;

    setLikeDislikeCooldown(true);
    setTimeout(() => setLikeDislikeCooldown(false), 300);

    const wasLiked = isLiked;
    const wasDisliked = isDisliked;
    
    if (wasDisliked) {
      setIsDisliked(false);
      setDislikeCount(prev => prev - 1);
    } else {
      setIsDisliked(true);
      setDislikeCount(prev => prev + 1);
      if (wasLiked) {
        setIsLiked(false);
        setLikeCount(prev => prev - 1);
      }
    }

    fetch(`${config.url}/api/interactions/toggle-like`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token,
        contentId: video._id,
        contentType: 'video',
        action: 'dislike'
      }),
    }).catch(error => {
      console.error('Error disliking video:', error);
    });
  };

  const handleSubscribe = async () => {
    const token = localStorage.getItem('token');
    
    if (!token) {
      setShowAuthModal(true);
      return;
    }

    if (!video?.uploader?._id || subscribeCooldown) return;

    setSubscribeCooldown(true);
    setTimeout(() => setSubscribeCooldown(false), 300);

    const wasSubscribed = isSubscribed;
    setIsSubscribed(!wasSubscribed);
    setSubscriberCount(prev => wasSubscribed ? prev - 1 : prev + 1);

    fetch(`${config.url}/api/interactions/subscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token,
        targetUserId: video.uploader._id
      }),
    }).catch(error => {
      console.error('Error updating subscription:', error);
    });
  };

  const scrollToComments = () => {
    setTimeout(() => {
      commentsRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const handleVideoLoad = () => {
    setIsLoading(false);
  };

  if (error) {
    return (
      <div className="bg-[#080808] min-h-screen w-full">
        <NavBar user={user} setUser={setUser} />
        <div className="max-w-[79rem] mx-auto px-4 pt-2 pb-8 text-white text-center py-20">
          <h1 className="text-2xl font-bold mb-4">Video Not Found</h1>
          <p className="text-white/70 mb-6">{error}</p>
          <a href="/" className="text-[#ea4197] hover:underline">
            Return to Home
          </a>
        </div>
      </div>
    );
  }

  if (!video && isLoading) {
    return <WatchPageLoading />;
  }

  if (!video) {
    return (
      <div className="bg-[#080808] min-h-screen w-full">
        <NavBar user={user} setUser={setUser} />
        <div className="max-w-[79rem] mx-auto px-4 pt-2 pb-8 text-white text-center py-20">
          Video not found
        </div>
      </div>
    );
  }

  // Use the Cloudflare Stream ID to construct the iframe URL
  const videoSource = video.cloudflareStreamId
    ? `https://customer-jolq13ybmuso6gvq.cloudflarestream.com/${video.cloudflareStreamId}/iframe`
    : "";

  return (
    <div className="bg-[#080808] min-h-screen w-full">
      <NavBar user={user} setUser={setUser} />
      {showAuthModal && <AuthModel setShowAuthModel={setShowAuthModal} setUser={setUser} />}
      <div className="max-w-[79rem] mx-auto px-0 pt-2 pb-8">
        <div className="w-full px-10 md:px-0 rounded-lg overflow-hidden mb-6 ">
          <div className="flex flex-wrap justify-center gap-4">
            {[
              {
                href: "https://t.mbslr2.com/324742/8780/0?bo=2779,2778,2777,2776,2775&file_id=610687&po=6533&aff_sub5=SF_006OG000004lmDN&aff_sub4=AT_0002",
                imgSrc:
                  "https://www.imglnkx.com/8780/010481D_JRKM_18_ALL_EN_64_L.gif",
              },
              {
                href: "https://t.mbslr2.com/324742/8780/0?bo=2779,2778,2777,2776,2775&file_id=612046&po=6533&aff_sub5=SF_006OG000004lmDN&aff_sub4=AT_0002",
                imgSrc:
                  "https://www.imglnkx.com/8780/JM-379_DESIGN-20876_v2_300100.gif",
              },
              {
                href: "https://t.mbslr2.com/324742/8780/0?bo=2779,2778,2777,2776,2775&file_id=604929&po=6533&aff_sub5=SF_006OG000004lmDN&aff_sub4=AT_0002",
                imgSrc:
                  "https://www.imglnkx.com/8780/DESIGN_20045_BANNNEON_300100.gif",
              },
            ].map((ad, index) => (
              <div
                key={index}
                className={`w-full ${index >= 1 ? "hidden sm:block" : ""} ${
                  index >= 2 ? "sm:hidden lg:block" : ""
                } sm:w-[calc(50%-8px)] lg:w-[calc(33.333%-11px)]`}
              >
                <a href={ad.href} className="block w-full">
                  <img
                    src={ad.imgSrc}
                    className="w-full h-auto max-h-32 object-contain mx-auto"
                    alt={`Advertisement ${index + 1}`}
                  />
                </a>
              </div>
            ))}
          </div>
        </div>

        <div
          ref={streamContainerRef}
          className="w-full relative aspect-video bg-black rounded-lg overflow-hidden mb-4"
        >
          {isLoading && (
            <div
              className="absolute inset-0 flex items-center justify-center bg-black"
              id="video-loading-overlay"
            >
              {video.thumbnail && (
                <img
                  src={video.thumbnail}
                  alt="Loading thumbnail"
                  className="absolute top-0 left-0 w-full h-full object-cover opacity-30"
                />
              )}
              <div className="flex flex-col items-center z-10">
                {loadingMessage == "Loading video..." && (
                  <div className="w-12 h-12 border-4 border-[#1a1a1a] border-t-[#ea4197] rounded-full animate-spin mb-3"></div>
                )}
                <p className="text-white text-base">{loadingMessage}</p>
              </div>
            </div>
          )}
{/* <Stream
              controls
              src={video.videoUrl || ""}
              primaryColor="#cfcfcf"
              poster={video.thumbnail || ""}
              preload="metadata"
              onLoadedMetaData={() => handleVideoLoad()}
              // responsive={false}
              onError={() => setLoadingMessage("Error 404 - Video not found")}
              className={`w-full h-full ${isLoading ? "hidden" : ""}`}
              autoplay={false}
              muted={false}
            /> */}
          <iframe
            src={videoSource}
            className={`w-full h-full border-none ${isLoading ? "hidden" : ""}`}
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
            allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
            allowFullScreen={true}
            onLoad={() => handleVideoLoad()}
          ></iframe>
        </div>

        <div className="mb-4 bg-[#121212] rounded-lg p-4 md:p-6">
          <h1 className="text-[#ebebeb] font-roboto mb-1 md:mb-0 text-xl leading-tight md:leading-normal  md:text-2xl font-bold">
            {video.title}
          </h1>

          <div className="text-[#a0a0a0] md:text-sm text-xs flex items-center md:mb-2 mb-3">
            <span className="font-roboto">
              {formatCount(video.views || 0)} views
            </span>
            <span className="mx-2 opacity-70">|</span>
            <span className="font-roboto">
              {getRelativeTimeFromDate(video.createdAt || "")}
            </span>
          </div>

          <div className="md:hidden flex flex-wrap gap-[5px] mb-5">
            <button
              onClick={handleLike}
              className={`flex items-center justify-center gap-[0.4rem] px-3 py-[0.45rem] text-[#c0c0c0] border-[#3a3a3a] bg-[#1f1f1f] rounded-full ${
                isLiked
                  ? "border-[#ea2189] text-[#f453a6] bg-[#f453a615]"
                  : "hover:border-[#525252]"
              } transition-all text-xs font-medium`}
            >
              <i className="ri-thumb-up-fill text-[0.95rem]"></i>
              <span className="font-inter">
                {formatCount(likeCount)}
              </span>
            </button>

            <button
              onClick={handleDislike}
              className={`flex items-center justify-center gap-[0.4rem] px-3 py-[0.45rem] text-[#c0c0c0] border-[#3a3a3a] bg-[#1f1f1f] rounded-full ${
                isDisliked
                  ? "border-[#ea2189] text-[#f453a6] bg-[#f453a615]"
                  : "hover:border-[#525252]"
              } transition-all text-xs font-medium`}
            >
              <i className="ri-thumb-down-fill text-[0.95rem] translate-y-[1px]"></i>
              <span className="font-inter">
                {formatCount(dislikeCount)}
              </span>
            </button>

            <button className="flex items-center border-[#3a3a3a] justify-center gap-2 px-3 py-[0.45rem] rounded-full bg-[#1f1f1f] text-[#c0c0c0] hover:border-[#525252] transition-all text-xs font-medium">
              <FaShare size={13} />
              <span className="sm:inline font-inter">Share</span>
            </button>

            <button className="flex items-center border-[#3a3a3a] justify-center gap-2 px-3 py-[0.45rem] rounded-full bg-[#1f1f1f] text-[#c0c0c0] hover:border-[#525252] transition-all text-xs font-medium">
              <FaFlag size={11} />
              <span className="sm:inline hidden font-inter">Report</span>
            </button>
          </div>

          <div className="hidden md:flex flex-wrap gap-y-5 mt-2 justify-between items-center">
            <div className="flex items-center gap-3 py-1">
              <div 
                className="relative w-9 h-9 md:w-11.5 md:h-11.5 bg-[#2d2d2d] rounded-full overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                onClick={handleUploaderClick}
              >
                <Image
                  src={uploaderAvatarUrl || video.uploader?.avatar || "/logo.webp"}
                  alt={video.uploader?.username || "User"}
                  fill
                  className="object-cover opacity-[97%]"
                />
              </div>
              <div className="cursor-pointer" onClick={handleUploaderClick}>
                <div className="text-[#e6e6e6] font-medium font-pop text-base tracking-wide hover:text-[#ea4197] transition-colors">
                  {video.uploader?.username || "Unknown User"}
                </div>
                <div className="text-[#a0a0a0] font-roboto text-xs">
                  {formatCount(subscriberCount || uploaderProfile?.subscriberCount || video.uploader?.subscriberCount || 0)} subscribers
                </div>
              </div>

              <div className="relative h-9 w-[0.8px] bg-[#323232]"></div>
              <button 
                onClick={isCurrentUserUploader ? undefined : handleSubscribe}
                className={`flex items-center gap-1.5 ml-0.5 px-5 py-1.5 rounded-lg border text-sm transition-colors ${
                  isCurrentUserUploader
                    ? "border-[#525252] bg-[#2a2a2a] text-[#c0c0c0] cursor-default opacity-70"
                    : isSubscribed 
                      ? "border-[#525252] bg-[#2a2a2a] text-[#c0c0c0] cursor-pointer" 
                      : "border-[#999999] bg-[#1e1e1e] text-white hover:border-[#c2c2c2] hover:bg-[#242424] cursor-pointer"
                }`}
              >
                <FaBell className="text-sm" />
                <span className="font-inter">
                  {isCurrentUserUploader ? 'Subscribed' : (isSubscribed ? 'Subscribed' : 'Subscribe')}
                </span>
              </button>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={handleLike}
                className={`flex items-center border text-[#c0c0c0] border-[#3a3a3a] bg-[#1f1f1f] gap-2 px-3.5 py-2 rounded-lg ${
                  isLiked
                    ? "border-[#ea2189] text-[#f453a6] bg-[#f453a615]"
                    : "hover:border-[#525252]"
                } transition-all text-sm font-medium cursor-pointer`}
              >
                <FaThumbsUp size={14} />
                <span className="font-inter">
                  {formatCount(likeCount)}
                </span>
              </button>

              <button
                onClick={handleDislike}
                className={`flex items-center border text-[#c0c0c0] border-[#3a3a3a] bg-[#1f1f1f] gap-2 px-3.5 py-2 rounded-lg ${
                  isDisliked
                    ? "border-[#ea2189] text-[#f453a6] bg-[#f453a615]"
                    : "hover:border-[#525252]"
                } transition-all text-sm font-medium cursor-pointer`}
              >
                <FaThumbsDown size={14} />
                <span className="font-inter">
                  {formatCount(dislikeCount)}
                </span>
              </button>

              <button className="flex items-center border border-[#3a3a3a] gap-2 px-3.5 py-2 rounded-lg bg-[#1f1f1f] text-[#c0c0c0] hover:border-[#525252] transition-all text-sm font-medium cursor-pointer">
                <FaShare size={14} />
                <span className="font-inter">Share</span>
              </button>

              <button className="flex items-center border border-[#3a3a3a] gap-2 px-3.5 py-2 rounded-lg bg-[#1f1f1f] text-[#c0c0c0] hover:border-[#525252] transition-all text-sm font-medium cursor-pointer">
                <FaFlag size={13} />
                <span className="font-inter">Report</span>
              </button>
            </div>
          </div>

          <div className="md:hidden flex items-center gap-3 bg-[#1a1a1a] p-3 rounded-lg mb-5">
            <div 
              className="relative w-10 h-10 bg-[#2d2d2d] rounded-full overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
              onClick={handleUploaderClick}
            >
              <Image
                src={uploaderAvatarUrl || video.uploader?.avatar || "/logo.webp"}
                alt={video.uploader?.username || "User"}
                fill
                className="object-cover opacity-[97%]"
              />
            </div>
            <div className="flex-1 cursor-pointer" onClick={handleUploaderClick}>
              <div className="text-white font-medium font-inter text-sm hover:text-[#ea4197] transition-colors">
                {video.uploader?.username || "Unknown User"}
              </div>
              <div className="text-[#a0a0a0] font-roboto text-xs">
                {formatCount(subscriberCount || uploaderProfile?.subscriberCount || video.uploader?.subscriberCount || 0)} subscribers
              </div>
            </div>
            <button 
              onClick={isCurrentUserUploader ? undefined : handleSubscribe}
              className={`flex items-center gap-1.5 px-2.5 py-[0.34rem] rounded-lg text-sm transition-colors ${
                isCurrentUserUploader
                  ? "bg-[#525252] text-[#c0c0c0] cursor-default opacity-70"
                  : isSubscribed
                    ? "bg-[#525252] text-[#c0c0c0] hover:bg-[#616161] cursor-pointer"
                    : "bg-[#ea4197] text-white hover:bg-[#d23884] cursor-pointer"
              }`}
            >
              <FaBell className="text-sm" />
              <span className="font-inter">
                {isCurrentUserUploader ? 'Subscribed' : (isSubscribed ? 'Subscribed' : 'Subscribe')}
              </span>
            </button>
          </div>

          {(video.description || (video.tags && video.tags.length > 0)) && (
            <div className="mt-5 pt-5 border-t border-[#2a2a2a]">
              {video.tags && video.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {video.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="bg-[#1a1a1a] text-[#ea4197] text-xs px-2 py-0.5 rounded-full hover:bg-[#2a2a2a] transition-colors cursor-pointer"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              {video.description && (
                <p className="text-[#d0d0d0] text-sm md:text-base whitespace-pre-line leading-relaxed">
                  {video.description}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="flex px-10 flex-wrap opacity-90 justify-center mb-4 borderb-b border-[#FFFFFF] gap-4">
          {[
            {
              href: "https://t.mbslr2.com/324742/8780/0?bo=2779,2778,2777,2776,2775&file_id=610687&po=6533&aff_sub5=SF_006OG000004lmDN&aff_sub4=AT_0002",
              imgSrc:
                "https://www.imglnkx.com/8780/010481D_JRKM_18_ALL_EN_64_L.gif",
            },
            {
              href: "https://t.mbslr2.com/324742/8780/0?bo=2779,2778,2777,2776,2775&file_id=612046&po=6533&aff_sub5=SF_006OG000004lmDN&aff_sub4=AT_0002",
              imgSrc:
                "https://www.imglnkx.com/8780/JM-379_DESIGN-20876_v2_300100.gif",
            },
            {
              href: "https://t.mbslr2.com/324742/8780/0?bo=2779,2778,2777,2776,2775&file_id=604929&po=6533&aff_sub5=SF_006OG000004lmDN&aff_sub4=AT_0002",
              imgSrc:
                "https://www.imglnkx.com/8780/DESIGN_20045_BANNNEON_300100.gif",
            },
          ].map((ad, index) => (
            <div
              key={index}
              className={`w-full ${index >= 1 ? "hidden sm:block" : ""} ${
                index >= 2 ? "sm:hidden lg:block" : ""
              } sm:w-[calc(50%-8px)] lg:w-[calc(33.333%-11px)]`}
            >
              <a href={ad.href} className="block w-full">
                <img
                  src={ad.imgSrc}
                  className="w-full h-auto max-h-32 object-contain mx-auto"
                  alt={`Advertisement ${index + 1}`}
                />
              </a>
            </div>
          ))}
        </div>

        <div className="px-4 lg:px-0">

          <div className="mb-4 border-b border-[#2a2a2a]">
            <div className="flex gap-1 md:gap-4">
              <button
                onClick={() => setActiveTab("related")}
                className={`px-4 py-2 cursor-pointer transition-colors duration-300 ease-in flex items-center gap-2 ${
                  activeTab === "related"
                    ? "text-[#ea4197] border-b-2 border-[#ea4197]"
                    : "text-[#b0b0b0]"
                }`}
              >
                <FaList className="" />
                <span>Related Videos</span>
              </button>
              <button
                onClick={() => setActiveTab("recommended")}
                className={`px-4 py-2 cursor-pointer transition-colors duration-300 ease-in flex items-center gap-2 ${
                  activeTab === "recommended"
                    ? "text-[#ea4197] border-b-2 border-[#ea4197]"
                    : "text-[#b0b0b0]"
                }`}
              >
                <FaFireAlt className="" />
                <span>Recommended</span>
              </button>
              <button
                onClick={scrollToComments}
                className={`px-4 hidden py-2 cursor-pointer transition-colors duration-300 ease-in md:flex items-center text-[#b0b0b0] gap-2`}
              >
                <FaCommentAlt className="hidden md:block" />
                <span>Comments ({video.comments?.length || 0})</span>
              </button>
            </div>
          </div>

          {/* {(activeTab === "related" || activeTab === "recommended") && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {relatedVideos.map((relatedVideo) => {
                // Map the video data to match VideoType interface
                const mappedVideo = {
                  ...relatedVideo,
                  uploader: relatedVideo.uploader?.username || "Unknown User"
                };
                return (
                  <VideoGrid key={relatedVideo.id} video={mappedVideo} />
                );
              })}
            </div>
          )} */}

          <div ref={commentsRef} className="mt-8">
            <h3 className="text-white text-lg font-roboto font-medium mb-4">
              Comments ({video.comments?.length || 0})
            </h3>

            <div className="mb-6 flex gap-3">
              <div className="relative w-8 h-8 rounded-full flex-shrink-0 overflow-hidden">
                <Image
                  src="/logo.webp"
                  alt={video.uploader?.username || "User"}
                  fill
                  className="object-cover opacity-[97%]"
                />
              </div>
              <div className="flex-grow">
                <input
                  type="text"
                  placeholder="Add a comment..."
                  className="w-full bg-transparent border-b border-[#3a3a3a] text-[#d0d0d0] py-2 focus:outline-none focus:border-[#ea4197]"
                />
              </div>
            </div>

            {video.comments?.map((comment) => (
              <div key={comment.id} className="mb-6">
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full flex-shrink-0 overflow-hidden">
                    <Image
                      src={comment.avatar}
                      alt={comment.username}
                      width={32}
                      height={32}
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-grow">
                    <div className="flex items-center gap-2 mb-[3px]">
                      <span className="text-[#f1f1f1] font-pop font-medium text-sm">
                        {comment.username}
                      </span>
                      <span className="text-[#909090] font-pop text-xs">
                        {comment.timeAgo}
                      </span>
                    </div>
                    <p className="text-[#d0d0d0] font-inter text-sm mb-2">
                      {comment.content}
                    </p>
                    <div className="flex items-center gap-4 text-[#909090] text-xs">
                      <button className="flex items-center gap-1 cursor-pointer hover:text-[#ea4198ea]">
                        <i className="ri-thumb-up-fill text-[1rem]"></i>
                        <span className="font-inter">{comment.likes}</span>
                      </button>
                      <button className="flex items-center gap-1 cursor-pointer hover:text-[#ea4198ea]">
                        <i className="ri-thumb-down-fill text-[1rem]"></i>
                      </button>
                      <button className="hover:text-[#ea4198ea] font-inter cursor-pointer">
                        Reply
                      </button>
                    </div>

                    {comment.replies && comment.replies.length > 0 && (
                      <div className="mt-4 pl-4 border-l border-[#2a2a2a]">
                        {comment.replies.map((reply) => (
                          <div key={reply.id} className="mb-4">
                            <div className="flex gap-2">
                              <div className="w-6 h-6 rounded-full flex-shrink-0 overflow-hidden">
                                <Image
                                  src={reply.avatar}
                                  alt={reply.username}
                                  width={24}
                                  height={24}
                                  className="object-cover"
                                />
                              </div>
                              <div className="flex-grow">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-[#f1f1f1] font-pop font-medium text-sm">
                                    {reply.username}
                                  </span>
                                  <span className="text-[#909090] font-pop text-xs">
                                    {reply.timeAgo}
                                  </span>
                                </div>
                                <p className="text-[#d0d0d0] font-inter text-sm mb-2">
                                  {reply.content}
                                </p>
                                <div className="flex items-center gap-4 text-[#909090] text-xs">
                                  <button className="flex items-center gap-1 hover:text-[#ea4197]">
                                    <i className="ri-thumb-up-fill text-[1rem]"></i>
                                    <span className="font-inter">
                                      {reply.likes}
                                    </span>
                                  </button>
                                  <button className="flex items-center gap-1 hover:text-[#ea4197]">
                                    <i className="ri-thumb-down-fill text-[1rem]"></i>
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

// Main component that wraps the content in a Suspense boundary
const WatchPage = () => {
  return (
    <Suspense fallback={<WatchPageLoading />}>
      <WatchPageContent />
    </Suspense>
  );
};

export default WatchPage;
