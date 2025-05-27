"use client";
import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { FaEye, FaUser } from "react-icons/fa";
import { FaRegImage } from "react-icons/fa6";
import { VideoType } from "./Types";

interface ImageGridProps {
  videos: VideoType[];
}

const ImageCard = ({ 
  video, 
  totalImages, 
  columnIndex 
}: { 
  video: VideoType; 
  totalImages: number; 
  columnIndex: number; 
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollSpeed = 0.85 + (columnIndex * 0.08);
  const parallaxOffset = scrollY * (1 - scrollSpeed) * 0.3;

  const formatViews = (views: number) => {
    if (views >= 1000000) {
      return `${(views / 1000000).toFixed(1)}M`;
    } else if (views >= 1000) {
      return `${(views / 1000).toFixed(1)}K`;
    }
    return views.toString();
  };

  const trimText = (text: string, maxLength: number) => {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  const trimUsername = (username: string) => {
    return trimText(username, 12);
  };

  const trimTitle = (title: string) => {
    return trimText(title, 40);
  };

  return (
    <div 
      ref={cardRef}
      className="group relative cursor-pointer rounded-xl overflow-hidden bg-[#111111] break-inside-avoid mb-3 sm:mb-4 hover:scale-[1.02] active:opacity-80 transition-all duration-300 ease-out"
      style={{
        transform: `translateY(${parallaxOffset}px)`,
      }}
    >
      {/* Image Container */}
      <div className="relative">
        {!imageLoaded && (
          <div className="absolute inset-0 bg-[#1a1a1a] animate-pulse rounded-xl" />
        )}
        <Image
          src={video.thumbnail || 'logo.png'}
          alt={video.title}
          width={400}
          height={600}
          className={`w-full h-auto object-cover transition-opacity duration-300 ${
            imageLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          onLoad={() => setImageLoaded(true)}
          style={{
            aspectRatio: `auto ${1 + Math.random() * 0.1}`,
          }}
        />
        
        {/* Overlay that appears on hover - hidden on mobile */}
        <div className="absolute inset-0 bg-black/0 md:group-hover:bg-black/40 transition-all duration-300 ease-out">
          <div className="absolute inset-0 opacity-0 md:group-hover:opacity-100 transition-opacity duration-300 p-2 flex-col justify-between hidden md:flex">
            {/* Top overlay - View count and total images */}
            <div className="flex justify-between items-start">
              <div className="flex items-center space-x-1.5 bg-black/60 backdrop-blur-sm rounded-full px-2 py-1">
                <FaEye className="text-white text-xs" />
                <span className="text-white text-xs font-medium">{formatViews(video.views)}</span>
              </div>
              <div className="flex items-center space-x-1.5 bg-black/60 backdrop-blur-sm rounded-full px-2 py-1">
                <FaRegImage className="text-white text-xs" />
                <span className="text-white text-xs font-medium">{totalImages}</span>
              </div>
            </div>

            {/* Bottom overlay - Info */}
            <div className="bg-black/60 backdrop-blur-sm rounded-lg p-2">
              <h3 className="text-white font-semibold text-xs mb-1.5 line-clamp-2 leading-relaxed">
                {trimTitle(video.title)}
              </h3>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1.5">
                  <FaUser className="text-[#c2c2c2] text-xs" />
                  <span className="text-[#c2c2c2] text-xs font-medium">{trimUsername(video.uploader)}</span>
                </div>
                <span className="text-[#c2c2c2] text-xs">{video.uploadDate}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ImageGrid = ({ videos }: ImageGridProps) => {
  const [columnCount, setColumnCount] = useState(2);

  useEffect(() => {
    const updateColumnCount = () => {
      const width = window.innerWidth;
      if (width >= 1280) setColumnCount(5);
      else if (width >= 1024) setColumnCount(4); // lg
      else if (width >= 768) setColumnCount(3); // md
      else setColumnCount(2); // mobile
    };

    updateColumnCount();
    window.addEventListener('resize', updateColumnCount);
    return () => window.removeEventListener('resize', updateColumnCount);
  }, []);

  if (!videos || videos.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-white/50 text-lg">No images found</p>
      </div>
    );
  }

  const totalImages = videos.length;

  // Distribute videos across columns
  const columns: VideoType[][] = Array.from({ length: columnCount }, () => []);
  videos.forEach((video, index) => {
    columns[index % columnCount].push(video);
  });

  return (
    <div className="w-full">
      {/* Flexbox Grid for individual column control */}
      <div className="flex gap-2.5 sm:gap-4">
        {columns.map((columnVideos, columnIndex) => (
          <div key={columnIndex} className="flex-1 space-y-3 sm:space-y-4">
            {columnVideos.map((video) => (
              <ImageCard 
                key={video.id} 
                video={video} 
                totalImages={totalImages} 
                columnIndex={columnIndex}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ImageGrid;