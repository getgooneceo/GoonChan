"use client";
import React from 'react';
import Image from 'next/image';
import { FaClock } from 'react-icons/fa';

export type VideoType = {
  id: number;
  title: string;
  thumbnail: string;
  duration: string;
  views: string;
  likes: string;
  uploader: string;
};

interface VideoGridProps {
  videos?: VideoType[];
}

const VideoGrid: React.FC<VideoGridProps> = ({ videos }) => {
  const videoItems = videos || [];

  return (
    <div className="max-w-[77rem] mx-auto px-4 pt-2 pb-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
        {videoItems.map((video) => (
          <div 
            key={video.id} 
            className="group relative cursor-pointer"
            onClick={() => console.log(`Playing video: ${video.title}`)}
          >

            <div className="relative aspect-video overflow-hidden rounded-lg bg-[#101010]">
              <Image 
                src={video.thumbnail} 
                alt={video.title}
                width={640}
                height={360}
                className="object-cover w-full h-full group-hover:scale-[1.03] transition-transform duration-300 ease-in-out"
              />
              
              <div className="absolute inset-0 bg-gradient-to-b from-black/0 via-black/0 to-[#00000059] opacity-95"></div>
              
              <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded">
                {video.duration}
              </div>
{/* 
              {video.hd && (
                <div className="absolute top-2 right-2 bg-[#d3d3d3] text-[#121212] text-xs px-1.5 py-[0.7px] rounded font-medium">
                  HD
                </div>
              )} */}
            </div>

            <div className="mt-2">
              <h3 className="font-medium text-white text-sm group-hover:text-[#ea4197] transition-colors duration-200">
                {video.title}
              </h3>
              
              <div className="flex items-center mt-1 text-[#b1b1b1] text-xs">
                <span>{video.uploader}</span>
                <span className="mx-1.5">•</span>
                <span>{video.views} views</span>
                <span className="mx-1.5">•</span>
                <span className="text-[#ea4197]">{video.likes}</span>
              </div>

              {/* <div className="flex items-center mt-1 text-[#a0a0a0] text-xs">
                <FaClock size={10} className="mr-1" />
                <span>{video.uploaded}</span>
              </div> */}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default VideoGrid;