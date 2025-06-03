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
      setActiveCategory(categoryParam);
    } else if (!categoryParam && activeCategory !== 'discover') {
      setActiveCategory('discover');
    }
  }, [searchParams]);

  useEffect(() => {
    if (activeCategory === "images") {
      fetchDiscoverImages();
    } else {
      fetchVideosForCategory(activeCategory);
    }
  }, [activeCategory]);

  const fetchVideosForCategory = async (category: string) => {
    try {
      setLoading(true);
      setError(null);

      const sortMapping: { [key: string]: string } = {
        discover: 'hot',
        top: 'top', 
        recent: 'recent',
        liked: 'top',
        random: 'random',
        subscriptions: 'subscriptions'
      };

      const sortParam = sortMapping[category] || 'hot';
      const url = new URL(`${config.url}/api/discover`);
      
      url.searchParams.append('limit', '12');
      url.searchParams.append('page', '1');
      url.searchParams.append('sort', sortParam);

      if (category === 'subscriptions') {
        const token = localStorage.getItem('token');
        if (token) {
          url.searchParams.append('token', token);
        }
      }

      const response = await fetch(url.toString());
      const data = await response.json();

      if (data.success) {
        if (data.redirect && data.videoSlug) {
          router.push(`/watch?v=${data.videoSlug}`);
          return;
        }
        
        if (data.videos) {
          setVideoData(data.videos);
        } else {
          setVideoData([]);
        }
      } else {
        setError(data.message || 'Failed to fetch videos');
        setVideoData([]);
      }
    } catch (error) {
      console.error(`Error fetching ${category} videos:`, error);
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
    if (loading) {
      return (
        <div className="w-full">
          {activeCategory === "images" ? (
            <div className="flex gap-2.5 sm:gap-4">
              {Array.from({ length: window.innerWidth >= 1024 ? 4 : window.innerWidth >= 768 ? 3 : 2 }, (_, columnIndex) => (
                <div key={columnIndex} className="flex-1 space-y-3 sm:space-y-4">
                  {Array.from({ length: 3 }, (_, cardIndex) => (
                    <div key={cardIndex} className="break-inside-avoid">
                      <div className="bg-[#1a1a1a] rounded-xl overflow-hidden animate-pulse">
                        <div 
                          className="w-full bg-[#252525]"
                          style={{
                            height: `${200 + Math.random() * 100}px`
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
              {Array.from({ length: 12 }, (_, index) => (
                <div key={index} className="animate-pulse">
                  <div className="aspect-video bg-[#1a1a1a] rounded-lg mb-2">
                    <div className="w-full h-full bg-[#252525] rounded-lg"></div>
                  </div>

                  <div className="space-y-2">
                    <div className="h-4 bg-[#1a1a1a] rounded w-full"></div>
                    <div className="h-4 bg-[#1a1a1a] rounded w-3/4"></div>
                  </div>

                  <div className="flex items-center mt-2 space-x-2">
                    <div className="h-3 bg-[#1a1a1a] rounded w-20"></div>
                    <div className="h-3 bg-[#1a1a1a] rounded w-16"></div>
                    <div className="h-3 bg-[#1a1a1a] rounded w-12"></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }
    
    if (error) {
      return (
        <div className="flex flex-col justify-center items-center py-16 text-center">
          <div className="text-red-400 mb-4">⚠️ {error}</div>
          <button 
            onClick={() => activeCategory === "images" ? fetchDiscoverImages() : fetchVideosForCategory(activeCategory)}
            className="px-4 py-2 bg-[#ea4197] text-white rounded-lg hover:bg-[#d63384] transition-colors"
          >
            Try Again
          </button>
        </div>
      );
    }

    switch (activeCategory) {
      case "images":
        if (imageData.length === 0) {
          return (
            <div className="flex justify-center text-center items-center py-16 text-white/60">
              No images found
            </div>
          );
        }
        return <ImageGrid videos={imageData} />;
        
      case "discover":
      case "top":
      case "recent":
      case "liked":
      case "subscriptions":
        if (videoData.length === 0) {
          let emptyMessage = "No videos found";
          if (activeCategory === "subscriptions") {
            emptyMessage = "No videos from your subscriptions. Subscribe to creators to see their content here!";
          } else if (activeCategory === "liked") {
            emptyMessage = "No highly liked videos found";
          } else if (activeCategory === "recent") {
            emptyMessage = "No recent videos found";
          } else if (activeCategory === "top") {
            emptyMessage = "No top videos found";
          }
          
          return (
            <div className="flex justify-center text-center items-center py-16 text-white/60">
              {emptyMessage}
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
        
      case "random":
        return (
          <div className="flex justify-center items-center py-16 text-white/60">
            Redirecting to random video...
          </div>
        );
        
      default:
        return (
          <div className="flex justify-center items-center py-16 text-white/60">
            Category not found
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
