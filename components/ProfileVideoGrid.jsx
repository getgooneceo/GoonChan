"use client";
import React from 'react';
import Image from 'next/image';
import Link from 'next/link';

const formatCount = (count) => {
  if (count >= 1000000) {
    return (count / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  } else if (count >= 1000) {
    return (count / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
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
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
};

const ProfileVideoCard = ({ video }) => {
  const likePercentage = calculateLikePercentage(video.likeCount, video.dislikeCount);
  
  return (
    <Link 
      href={`/watch?v=${video.slug}`}
      className="group relative cursor-pointer"
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
        <h3 className="font-medium text-white text-sm font-pop leading-normal group-hover:text-[#ea4197] transition-colors duration-200 line-clamp-2">
          {video.title}
        </h3>
        
        <div className="flex items-center mt-1 text-[#b1b1b1] text-xs">
          <span>{formatDate(video.createdAt)}</span>
          <span className="mx-1.5">•</span>
          <span>{formatCount(video.views)} views</span>
          <span className="mx-1.5">•</span>
          <span className="text-[#ea4197]">{likePercentage}%</span>
        </div>
      </div>
    </Link>
  );
};

const ProfileVideoGrid = ({ videos }) => {
  if (!videos || videos.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-white/50">No videos found</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {videos.map((video) => (
        <ProfileVideoCard key={video.id} video={video} />
      ))}
    </div>
  );
};

export default ProfileVideoGrid;