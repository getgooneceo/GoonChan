"use client";
import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { VideoType } from './Types';

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

interface VideoCardProps {
  video: VideoType;
}

const VideoCard: React.FC<VideoCardProps> = ({ video }) => {
  const likePercentage = calculateLikePercentage(video.likeCount, video.dislikeCount);
  
  return (
    <div className="">
      <Link 
        href={`/watch?v=${video.id}`}
        className="block group cursor-pointer"
      >
        <div className="relative aspect-video overflow-hidden rounded-lg bg-[#101010]">
          <Image 
            src={video.thumbnail || ''} 
            alt={video.title || ''}
            width={640}
            height={360}
            className="object-cover w-full h-full group-hover:scale-[1.03] transition-transform duration-300 ease-in-out"
          />
          
          <div className="absolute inset-0 bg-gradient-to-b from-black/0 via-black/0 to-[#00000059] opacity-95"></div>
          
          <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded">
            {video.duration}
          </div>
        </div>

        <div className="mt-2">
          <h3 className="font-medium text-white text-sm font-pop leading-normal group-hover:text-[#ea4197] transition-colors duration-200">
            {video.title}
          </h3>
        </div>
      </Link>

      <div className="flex items-center mt-1 text-[#b1b1b1] text-xs">
        <Link 
          href={`/profile?user=${encodeURIComponent(video.uploader)}`} 
          className="hover:text-[#ea4197] transition-colors duration-200"
        >
          {video.uploader}
        </Link>
        <span className="mx-1.5">•</span>
        <span>{formatCount(video.views)} views</span>
        <span className="mx-1.5">•</span>
        <span className="text-[#ea4197]">{likePercentage}%</span>
      </div>
    </div>
  );
};

export default VideoCard;