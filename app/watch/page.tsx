"use client";
import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import NavBar from '@/components/NavBar';
import 'remixicon/fonts/remixicon.css'
import { VideoType, CommentType } from '@/components/Types';
import { MdReportProblem } from "react-icons/md";
import { 
  FaThumbsUp, 
  FaThumbsDown, 
  FaShare, 
  FaBell, 
  FaRegClock,
  FaCommentAlt,
  FaList,
  FaFireAlt
} from 'react-icons/fa';
import { FaFlag } from "react-icons/fa6";

import { videoData } from '@/app/data';

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
    return 'just now';
  } else if (diffMinutes < 60) {
    return diffMinutes === 1 ? '1 minute ago' : `${diffMinutes} minutes ago`;
  } else if (diffHours < 24) {
    return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
  } else if (diffDays < 30) {
    return diffDays === 1 ? '1 day ago' : `${diffDays} days ago`;
  } else if (diffMonths < 12) {
    return diffMonths === 1 ? '1 month ago' : `${diffMonths} months ago`;
  } else {
    return diffYears === 1 ? '1 year ago' : `${diffYears} years ago`;
  }
};

// Utility function to format numbers as K/M (e.g., 1K, 1.2M)
const formatCount = (count: number): string => {
  if (count >= 1000000) {
    return (count / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  } else if (count >= 1000) {
    return (count / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  } else {
    return count.toString();
  }
};

const WatchPage = () => {
  const searchParams = useSearchParams();
  const videoId = searchParams.get('v') ? parseInt(searchParams.get('v') as string) : 1;
  const [video, setVideo] = useState<VideoType | null>(null);
  const [relatedVideos, setRelatedVideos] = useState<VideoType[]>([]);
  const [activeTab, setActiveTab] = useState<'related' | 'recommended' | 'comments'>('related');
  const [isLiked, setIsLiked] = useState(false);
  const [isDisliked, setIsDisliked] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const commentsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const foundVideo = videoData.find((v: VideoType) => v.id === videoId);
    if (foundVideo) {
      setVideo(foundVideo);
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
    setActiveTab('comments');
    setTimeout(() => {
      commentsRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  if (!video) {
    return (
      <div className='bg-[#080808] min-h-screen w-full'>
        <NavBar />
        <div className='max-w-[79rem] mx-auto px-4 pt-2 pb-8 text-white text-center py-20'>
          Loading video...
        </div>
      </div>
    );
  }

  return (
    <div className='bg-[#080808] min-h-screen w-full'>
      <NavBar />
      <div className='max-w-[79rem] mx-auto px-4 pt-2 pb-8'>

        <div className='w-full aspect-video bg-black rounded-lg overflow-hidden mb-4'>
          <video 
            ref={videoRef}
            controls
            poster={video.thumbnail}
            className="w-full h-full"
            src={video.videoUrl || "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"}
          />
        </div>

        {/* Consolidated Video Info Section */}
        <div className='mb-6 bg-[#121212] rounded-lg p-4 md:p-6'>
          <h1 className='text-[#ebebeb] font-roboto mb-1 md:mb-0 text-xl leading-tight md:leading-normal  md:text-2xl font-bold'>{video.title}</h1>
          
          {/* Views and Date - Always at top */}
          <div className='text-[#a0a0a0] md:text-sm text-xs flex items-center md:mb-2 mb-3'>
            <span className='font-roboto'>{formatCount(video.views)} views</span>
            <span className='mx-2 opacity-70'>|</span>
            <span className='font-roboto'>{getRelativeTimeFromDate(video.uploadDate || "")}</span>
          </div>

          {/* Mobile: Action Buttons (flex grid) */}
          <div className='md:hidden flex flex-wrap gap-[5px] mb-5'>
            <button 
              onClick={handleLike}
              className={`flex items-center justify-center gap-[0.4rem] px-3 py-[0.45rem] text-[#c0c0c0] border-[#3a3a3a] bg-[#1f1f1f] rounded-full ${
                isLiked ? 'border-[#ea2189] text-[#f453a6] bg-[#f453a615]' : 'hover:border-[#525252]'
              } transition-all text-xs font-medium`}
            >
              <i className='ri-thumb-up-fill text-[0.95rem]' ></i>
              <span className='font-inter'>{formatCount(video.likeCount || 0)}</span>
            </button>

            <button 
              onClick={handleDislike}
              className={`flex items-center justify-center gap-[0.4rem] px-3 py-[0.45rem] text-[#c0c0c0] border-[#3a3a3a] bg-[#1f1f1f] rounded-full ${
                isDisliked ? 'border-[#ea2189] text-[#f453a6] bg-[#f453a615]' : 'hover:border-[#525252]'
              } transition-all text-xs font-medium`}
            >
              <i className='ri-thumb-down-fill text-[0.95rem] translate-y-[1px]' ></i>
              <span className='font-inter'>{formatCount(video.dislikeCount || 0)}</span>
            </button>

            <button className='flex items-center border-[#3a3a3a] justify-center gap-2 px-3 py-[0.45rem] rounded-full bg-[#1f1f1f] text-[#c0c0c0] hover:border-[#525252] transition-all text-xs font-medium'>
              <FaShare size={13} />
              <span className='sm:inline hidden font-inter'>Share</span>
            </button>

            <button className='flex items-center border-[#3a3a3a] justify-center gap-2 px-3 py-[0.45rem] rounded-full bg-[#1f1f1f] text-[#c0c0c0] hover:border-[#525252] transition-all text-xs font-medium'>
              <FaFlag size={11} />
              <span className='sm:inline hidden font-inter'>Report</span>
            </button>
          </div>

          <div className='hidden md:flex flex-wrap gap-y-5 mt-2 justify-between items-center'>
            <div className='flex items-center gap-3 py-2'>
              <div className='relative w-9 h-9 md:w-11 md:h-11 bg-[#2d2d2d] rounded-full overflow-hidden'>
                <Image 
                  src="/logo.webp"
                  alt={video.uploader}
                  fill
                  className='object-cover opacity-[97%]'
                />
              </div>
              <div>
                <div className='text-[#e6e6e6] font-medium font-inter text-base'>{video.uploader}</div>
                <div className='text-[#a0a0a0] font-roboto text-xs'>{formatCount(video.subscriberCount || 0)} subscribers</div>
              </div>

              <div className='relative h-9 w-[0.8px] bg-[#323232]'></div>
              <button className='flex items-center gap-1.5 ml-0.5 px-5 py-1.5 rounded-lg border border-[#999999] bg-[#1e1e1e] cursor-pointer text-white text-sm hover:border-[#c2c2c2] hover:bg-[#242424] transition-colors'>
                <FaBell className='text-sm' />
                <span className='font-inter'>Subscribe</span>
              </button>
            </div>

            <div className='flex items-center gap-2.5'>
              <button 
                onClick={handleLike}
                className={`flex items-center border text-[#c0c0c0] border-[#3a3a3a] bg-[#1f1f1f] gap-2 px-3.5 py-2 rounded-lg ${
                  isLiked ? 'border-[#ea2189] text-[#f453a6] bg-[#f453a615]' : 'hover:border-[#525252]'
                } transition-all text-sm font-medium cursor-pointer`}
              >
                <FaThumbsUp size={14} />
                <span className='font-inter'>{formatCount(video.likeCount || 0)}</span>
              </button>

              <button 
                onClick={handleDislike}
                className={`flex items-center border text-[#c0c0c0] border-[#3a3a3a] bg-[#1f1f1f] gap-2 px-3.5 py-2 rounded-lg ${
                  isDisliked ? 'border-[#ea2189] text-[#f453a6] bg-[#f453a615]' : 'hover:border-[#525252]'
                } transition-all text-sm font-medium cursor-pointer`}
              >
                <FaThumbsDown size={14} />
                <span className='font-inter'>{formatCount(video.dislikeCount || 0)}</span>
              </button>

              <button className='flex items-center border border-[#3a3a3a] gap-2 px-3.5 py-2 rounded-lg bg-[#1f1f1f] text-[#c0c0c0] hover:border-[#525252] transition-all text-sm font-medium cursor-pointer'>
                <FaShare size={14} />
                <span className='font-inter'>Share</span>
              </button>

              <button className='flex items-center border border-[#3a3a3a] gap-2 px-3.5 py-2 rounded-lg bg-[#1f1f1f] text-[#c0c0c0] hover:border-[#525252] transition-all text-sm font-medium cursor-pointer'>
                <FaFlag size={13} />
                <span className='font-inter'>Report</span>
              </button>
            </div>
          </div>
          
          {/* Mobile: Author Section (full width) */}
          <div className='md:hidden flex items-center gap-3 bg-[#1a1a1a] p-3 rounded-lg mb-5'>
            <div className='relative w-10 h-10 bg-[#2d2d2d] rounded-full overflow-hidden'>
              <Image 
                src="/logo.webp"
                alt={video.uploader}
                fill
                className='object-cover opacity-[97%]'
              />
            </div>
            <div className='flex-1'>
              <div className='text-white font-medium font-inter text-sm'>{video.uploader}</div>
              <div className='text-[#a0a0a0] font-roboto text-xs'>{formatCount(video.subscriberCount || 0)} subscribers</div>
            </div>
            <button className='flex items-center gap-1.5 px-2.5 py-[0.34rem] rounded-lg bg-[#ea4197] text-white text-sm hover:bg-[#d23884] transition-colors'>
              <FaBell className='text-sm' />
              <span className='font-inter'>Subscribe</span>
            </button>
          </div>
          
          {(video.description || (video.tags && video.tags.length > 0)) && (
            <div className='mt-5 pt-5 border-t border-[#2a2a2a]'>
              {video.tags && video.tags.length > 0 && (
                <div className='flex flex-wrap gap-1.5 mb-2'>
                  {video.tags.map((tag, index) => (
                    <span 
                      key={index} 
                      className='bg-[#1a1a1a] text-[#ea4197] text-xs px-2 py-0.5 rounded-full hover:bg-[#2a2a2a] transition-colors cursor-pointer'
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
              
              {/* Description */}
              {video.description && (
                <p className='text-[#d0d0d0] text-sm md:text-base whitespace-pre-line leading-relaxed'>{video.description}</p>
              )}
            </div>
          )}
        </div>

        {/* Tabs Section */}
        <div className='mb-4 border-b border-[#2a2a2a]'>
          <div className='flex gap-1 md:gap-4'>
            <button 
              onClick={() => setActiveTab('related')}
              className={`px-4 py-2 flex items-center gap-2 ${activeTab === 'related' ? 'text-[#ea4197] border-b-2 border-[#ea4197]' : 'text-[#b0b0b0]'}`}
            >
              <FaList className='hidden md:block' />
              <span>Related Videos</span>
            </button>
            <button 
              onClick={() => setActiveTab('recommended')}
              className={`px-4 py-2 flex items-center gap-2 ${activeTab === 'recommended' ? 'text-[#ea4197] border-b-2 border-[#ea4197]' : 'text-[#b0b0b0]'}`}
            >
              <FaFireAlt className='hidden md:block' />
              <span>Recommended</span>
            </button>
            <button 
              onClick={scrollToComments}
              className={`px-4 py-2 flex items-center gap-2 ${activeTab === 'comments' ? 'text-[#ea4197] border-b-2 border-[#ea4197]' : 'text-[#b0b0b0]'}`}
            >
              <FaCommentAlt className='hidden md:block' />
              <span>Comments ({video.comments?.length || 0})</span>
            </button>
          </div>
        </div>

        {/* Content based on active tab */}
        {(activeTab === 'related' || activeTab === 'recommended') && (
          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'>
            {videoData.filter(v => v.id !== video.id).slice(0, 6).map((relatedVideo) => (
              <Link 
                key={relatedVideo.id}
                href={`/watch?v=${relatedVideo.id}`}
                className='flex gap-3 group hover:bg-[#121212] p-2 rounded-lg transition-colors'
              >
                <div className='relative w-36 h-20 flex-shrink-0 rounded-md overflow-hidden'>
                  <Image 
                    src={relatedVideo.thumbnail}
                    alt={relatedVideo.title}
                    fill
                    className='object-cover group-hover:scale-105 transition-transform duration-300'
                  />
                  <div className='absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1 py-0.5 rounded'>
                    {relatedVideo.duration}
                  </div>
                </div>
                
                <div className='flex-1 flex flex-col'>
                  <h3 className='text-white text-sm font-medium line-clamp-2 group-hover:text-[#ea4197] transition-colors'>
                    {relatedVideo.title}
                  </h3>
                  
                  <div className='mt-auto'>
                    <div className='flex items-center mt-1'>
                      <span className='text-[#909090] text-xs truncate'>{relatedVideo.uploader} • {formatCount(relatedVideo.views)} views</span>
                    </div>
                    
                    <div className='flex flex-wrap gap-1 mt-1.5'>
                      {relatedVideo.tags && relatedVideo.tags.slice(0, 2).map((tag, idx) => (
                        <span key={idx} className='text-[#909090] text-[10px] bg-[#1a1a1a] px-1.5 py-0.5 rounded-full'>
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Comments Section */}
        <div ref={commentsRef} className='mt-8'>
          <h3 className='text-white text-lg font-medium mb-4'>Comments ({video.comments?.length || 0})</h3>
          
          <div className='mb-6 flex gap-3'>
            <div className='w-8 h-8 bg-[#2d2d2d] rounded-full flex-shrink-0 overflow-hidden'>
              <div className='w-full h-full flex items-center justify-center text-[#ea4197] text-sm font-bold'>
                Y
              </div>
            </div>
            <div className='flex-grow'>
              <input 
                type="text" 
                placeholder="Add a comment..." 
                className='w-full bg-transparent border-b border-[#3a3a3a] text-[#d0d0d0] py-2 focus:outline-none focus:border-[#ea4197]'
              />
            </div>
          </div>
          
          {video.comments?.map((comment) => (
            <div key={comment.id} className='mb-6'>
              <div className='flex gap-3'>
                <div className='w-8 h-8 rounded-full flex-shrink-0 overflow-hidden'>
                  <Image 
                    src={comment.avatar}
                    alt={comment.username}
                    width={32}
                    height={32}
                    className='object-cover'
                  />
                </div>
                <div className='flex-grow'>
                  <div className='flex items-center gap-2 mb-1'>
                    <span className='text-white font-medium text-sm'>{comment.username}</span>
                    <span className='text-[#909090] text-xs'>{comment.timeAgo}</span>
                  </div>
                  <p className='text-[#d0d0d0] text-sm mb-2'>{comment.content}</p>
                  <div className='flex items-center gap-4 text-[#909090] text-xs'>
                    <button className='flex items-center gap-1 hover:text-[#ea4197]'>
                      <FaThumbsUp size={12} />
                      <span>{comment.likes}</span>
                    </button>
                    <button className='flex items-center gap-1 hover:text-[#ea4197]'>
                      <FaThumbsDown size={12} />
                    </button>
                    <button className='hover:text-[#ea4197]'>Reply</button>
                  </div>
                  
                  {/* Comment Replies */}
                  {comment.replies && comment.replies.length > 0 && (
                    <div className='mt-4 pl-4 border-l border-[#2a2a2a]'>
                      {comment.replies.map((reply) => (
                        <div key={reply.id} className='mb-4'>
                          <div className='flex gap-2'>
                            <div className='w-6 h-6 rounded-full flex-shrink-0 overflow-hidden'>
                              <Image 
                                src={reply.avatar}
                                alt={reply.username}
                                width={24}
                                height={24}
                                className='object-cover'
                              />
                            </div>
                            <div className='flex-grow'>
                              <div className='flex items-center gap-2 mb-1'>
                                <span className='text-white font-medium text-xs'>{reply.username}</span>
                                <span className='text-[#909090] text-xs'>{reply.timeAgo}</span>
                              </div>
                              <p className='text-[#d0d0d0] text-xs mb-2'>{reply.content}</p>
                              <div className='flex items-center gap-4 text-[#909090] text-xs'>
                                <button className='flex items-center gap-1 hover:text-[#ea4197]'>
                                  <FaThumbsUp size={10} />
                                  <span>{reply.likes}</span>
                                </button>
                                <button className='flex items-center gap-1 hover:text-[#ea4197]'>
                                  <FaThumbsDown size={10} />
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

export default WatchPage;
