'use client'
import React, { useState, useEffect } from "react";
import NavBar from "@/components/NavBar";
import VideoCard from "@/components/VideoGrid";
import ImageGrid from "@/components/ImageGrid";
import { useRouter, useSearchParams } from "next/navigation";
import config from "../config.json"

export default function Home() {
  const [user, setUser] = useState(null);
  const [activeCategory, setActiveCategory] = useState("discover");
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [contentKey, setContentKey] = useState(0);
  const [videoData, setVideoData] = useState<any[]>([]);
  const [imageData, setImageData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const categoryParam = searchParams.get('category');
    if (categoryParam && categoryParam !== activeCategory) {
      handleCategoryChange(categoryParam);
    }
  }, [searchParams]);

  useEffect(() => {
    if (activeCategory === "discover") {
      fetchDiscoverVideos();
    } else if (activeCategory === "images") {
      fetchDiscoverImages();
    }
  }, [activeCategory]);

  const fetchDiscoverVideos = async () => {
    try {
      setLoading(true);
      setError(null);

      const url = new URL(`${config.url}/api/discover`);
      
      url.searchParams.append('limit', '12');
      url.searchParams.append('page', '1');

      const response = await fetch(url.toString());
      const data = await response.json();

      if (data.success && data.videos) {
        setVideoData(data.videos);
      } else {
        setError(data.message || 'Failed to fetch videos');
        setVideoData([]);
      }
    } catch (error) {
      console.error('Error fetching discover videos:', error);
      setVideoData([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchDiscoverImages = async () => {
    try {
      setLoading(true);
      setError(null);

      const url = new URL(`${config.url}/api/discoverImages`);
      
      url.searchParams.append('limit', '12');
      url.searchParams.append('page', '1');

      const response = await fetch(url.toString());
      const data = await response.json();

      if (data.success && data.images) {
        setImageData(data.images);
      } else {
        setError(data.message || 'Failed to fetch images');
        setImageData([]);
      }
    } catch (error) {
      console.error('Error fetching discover images:', error);
      setImageData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryChange = (newCategory: string) => {
    if (newCategory === activeCategory) return;
    
    setIsTransitioning(true);

    setTimeout(() => {
      setActiveCategory(newCategory);
      setContentKey(prev => prev + 1);
      setTimeout(() => {
        setIsTransitioning(false);
      }, 50);
    }, 150);
  };

  const renderContent = () => {
    switch (activeCategory) {
      case "images":
        if (loading) {
          return (
            <div className="flex justify-center items-center py-16">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ea4197]"></div>
            </div>
          );
        }
        
        if (error) {
          return (
            <div className="flex flex-col justify-center items-center py-16 text-center">
              <div className="text-red-400 mb-4">⚠️ {error}</div>
              <button 
                onClick={fetchDiscoverImages}
                className="px-4 py-2 bg-[#ea4197] text-white rounded-lg hover:bg-[#d63384] transition-colors"
              >
                Try Again
              </button>
            </div>
          );
        }

        if (imageData.length === 0) {
          return (
            <div className="flex justify-center items-center py-16 text-white/60">
              No images found
            </div>
          );
        }

        return <ImageGrid videos={imageData} />;
      case "discover":
        if (loading) {
          return (
            <div className="flex justify-center items-center py-16">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ea4197]"></div>
            </div>
          );
        }
        
        if (error) {
          return (
            <div className="flex flex-col justify-center items-center py-16 text-center">
              <div className="text-red-400 mb-4">⚠️ {error}</div>
              <button 
                onClick={fetchDiscoverVideos}
                className="px-4 py-2 bg-[#ea4197] text-white rounded-lg hover:bg-[#d63384] transition-colors"
              >
                Try Again
              </button>
            </div>
          );
        }

        if (videoData.length === 0) {
          return (
            <div className="flex justify-center items-center py-16 text-white/60">
              No videos found
            </div>
          );
        }

        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
            {videoData.map((video) => (
              <VideoCard key={video._id} video={video} />
            ))}
          </div>
        );
      case "top":
      case "recent":
      case "liked":
      case "random":
      case "subscriptions":
      default:
        // For other categories, you can implement similar API calls or use static data for now
        return (
          <div className="flex justify-center items-center py-16 text-white/60">
            Coming soon...
          </div>
        );
    }
  };

  return (
    <>
      <div className="bg-[#080808] min-h-screen w-full">
        <NavBar 
          user={user} 
          setUser={setUser} 
          showCategories={true}
          activeCategory={activeCategory}
          setActiveCategory={handleCategoryChange}
        />
        <div className="max-w-[79rem] mx-auto px-4 lg:px-2 pt-2 pb-8 relative overflow-hidden">
          <div
            key={contentKey}
            className={`transition-all duration-250 ease-in-out transform ${
              isTransitioning 
                ? 'opacity-0 translate-y-1 scale-[0.98]' 
                : 'opacity-100 translate-y-0 scale-100'
            }`}
          >
            {renderContent()}
          </div>
        </div>
      </div>
    </>
  );
}
