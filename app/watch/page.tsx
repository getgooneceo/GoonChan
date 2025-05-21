"use client";
import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import NavBar from "@/components/NavBar";
import "remixicon/fonts/remixicon.css";
import VideoGrid from "@/components/VideoGrid";
import { VideoType } from "@/components/Types";
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
import { Stream } from "@cloudflare/stream-react";

import { videoData } from "../data"; // Adjust path if necessary

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

// Utility function to format numbers as K/M (e.g., 1K, 1.2M)
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

// Main content component that uses useSearchParams
const WatchPageContent = () => {
  const searchParams = useSearchParams();
  const [user, setUser] = useState(null);
  const videoId = searchParams.get("v")
    ? parseInt(searchParams.get("v") as string)
    : 1;
  const [video, setVideo] = useState<VideoType | null>(null);
  const [relatedVideos, setRelatedVideos] = useState<VideoType[]>([]);
  const [activeTab, setActiveTab] = useState<"related" | "recommended">(
    "related"
  );
  const [isLiked, setIsLiked] = useState(false);
  const [isDisliked, setIsDisliked] = useState(false);
  const commentsRef = useRef<HTMLDivElement>(null);

  // Add container ref and state for dynamic 16:9 sizing
  const streamContainerRef = useRef<HTMLDivElement>(null);
  const [loadingMessage, setLoadingMessage] = useState("Loading video...");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const foundVideo = videoData.find((v: VideoType) => v.id === videoId);
    if (foundVideo) {
      setVideo(foundVideo);
      setRelatedVideos(videoData.filter((v) => v.id !== videoId).slice(0, 6));
    }
  }, [videoId]);

  const handleLike = () => {
    if (isLiked) {
      setIsLiked(false);
    } else {
      setIsLiked(true);
      setIsDisliked(false);
    }
  };

  const handleDislike = () => {
    if (isDisliked) {
      setIsDisliked(false);
    } else {
      setIsDisliked(true);
      setIsLiked(false);
    }
  };

  const scrollToComments = () => {
    setTimeout(() => {
      commentsRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const handleVideoLoad = () => {
    setIsLoading(false);
  };

  if (!video) {
    return (
      <div className="bg-[#080808] min-h-screen w-full">
        <NavBar />
        <div className="max-w-[79rem] mx-auto px-4 pt-2 pb-8 text-white text-center py-20">
          Loading video...
        </div>
      </div>
    );
  }

  // const videoSource = video.videoUrl
  //  ? `https://customer-jolq13ybmuso6gvq.cloudflarestream.com/${video.videoUrl}/iframe`
  //  : "";

  return (
    <div className="bg-[#080808] min-h-screen w-full">
      <NavBar user={user} setUser={setUser} />
      <div className="max-w-[79rem] mx-auto px-4 pt-2 pb-8">
        <div className="w-full  rounded-lg overflow-hidden mb-6 ">
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
          className="w-full bg-black rounded-lg overflow-hidden mb-4"
        >
          <div className="">
            {isLoading && (
              <div
                className="aspect-video w-full h-full flex items-center justify-center bg-black relative"
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
            <Stream
              controls
              src={video.videoUrl || ""}
              primaryColor="#cfcfcf"
              poster={video.thumbnail || ""}
              preload="metadata"
              onLoadedMetaData={() => handleVideoLoad()}
              onError={() => setLoadingMessage("Error 404 - Video not found")}
              className={`w-full h-full ${isLoading ? "hidden" : ""}`}
              autoplay={false}
              muted={false}
            />
{/* <iframe
              src={videoSource}
              // style={"border: none"}
              className="absolute top-0 left-0 w-full h-full border-none"
              allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
              allowFullScreen={true}
              onLoad={() => {
                const overlay = document.getElementById(
                  "video-loading-overlay"
                );
                if (overlay) overlay.style.display = "none";
              }}
            ></iframe> */}
          </div>
        </div>

        <div className="mb-4 bg-[#121212] rounded-lg p-4 md:p-6">
          <h1 className="text-[#ebebeb] font-roboto mb-1 md:mb-0 text-xl leading-tight md:leading-normal  md:text-2xl font-bold">
            {video.title}
          </h1>

          <div className="text-[#a0a0a0] md:text-sm text-xs flex items-center md:mb-2 mb-3">
            <span className="font-roboto">
              {formatCount(video.views)} views
            </span>
            <span className="mx-2 opacity-70">|</span>
            <span className="font-roboto">
              {getRelativeTimeFromDate(video.uploadDate || "")}
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
                {formatCount(video.likeCount || 0)}
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
                {formatCount(video.dislikeCount || 0)}
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
            <div className="flex items-center gap-3 py-2">
              <div className="relative w-9 h-9 md:w-11 md:h-11 bg-[#2d2d2d] rounded-full overflow-hidden">
                <Image
                  src="/logo.webp"
                  alt={video.uploader}
                  fill
                  className="object-cover opacity-[97%]"
                />
              </div>
              <div>
                <div className="text-[#e6e6e6] font-medium font-inter text-base">
                  {video.uploader}
                </div>
                <div className="text-[#a0a0a0] font-roboto text-xs">
                  {formatCount(video.subscriberCount || 0)} subscribers
                </div>
              </div>

              <div className="relative h-9 w-[0.8px] bg-[#323232]"></div>
              <button className="flex items-center gap-1.5 ml-0.5 px-5 py-1.5 rounded-lg border border-[#999999] bg-[#1e1e1e] cursor-pointer text-white text-sm hover:border-[#c2c2c2] hover:bg-[#242424] transition-colors">
                <FaBell className="text-sm" />
                <span className="font-inter">Subscribe</span>
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
                  {formatCount(video.likeCount || 0)}
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
                  {formatCount(video.dislikeCount || 0)}
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
            <div className="relative w-10 h-10 bg-[#2d2d2d] rounded-full overflow-hidden">
              <Image
                src="/logo.webp"
                alt={video.uploader}
                fill
                className="object-cover opacity-[97%]"
              />
            </div>
            <div className="flex-1">
              <div className="text-white font-medium font-inter text-sm">
                {video.uploader}
              </div>
              <div className="text-[#a0a0a0] font-roboto text-xs">
                {formatCount(video.subscriberCount || 0)} subscribers
              </div>
            </div>
            <button className="flex items-center gap-1.5 px-2.5 py-[0.34rem] rounded-lg bg-[#ea4197] text-white text-sm hover:bg-[#d23884] transition-colors">
              <FaBell className="text-sm" />
              <span className="font-inter">Subscribe</span>
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

        <div className="flex flex-wrap opacity-90 justify-center mb-4 borderb-b border-[#FFFFFF] gap-4">
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

        {(activeTab === "related" || activeTab === "recommended") && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {relatedVideos.map((relatedVideo) => (
              <VideoGrid key={relatedVideo.id} video={relatedVideo} />
            ))}
          </div>
        )}

        <div ref={commentsRef} className="mt-8">
          <h3 className="text-white text-lg font-roboto font-medium mb-4">
            Comments ({video.comments?.length || 0})
          </h3>

          <div className="mb-6 flex gap-3">
            <div className="relative w-8 h-8 rounded-full flex-shrink-0 overflow-hidden">
              <Image
                src="/logo.webp"
                alt={video.uploader}
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
