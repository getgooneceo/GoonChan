'use client'
import React, { useState, useEffect } from "react";
import NavBar from "@/components/NavBar";
import VideoCard from "@/components/VideoGrid";
import ImageGrid from "@/components/ImageGrid";
import { videoData } from "@/app/data";
import { imageData } from "@/app/imageData";
import { useRouter, useSearchParams } from "next/navigation";

export default function Home() {
  const [user, setUser] = useState(null);
  const [activeCategory, setActiveCategory] = useState("discover");
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [contentKey, setContentKey] = useState(0);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const categoryParam = searchParams.get('category');
    if (categoryParam && categoryParam !== activeCategory) {
      handleCategoryChange(categoryParam);
    }
  }, [searchParams]);

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
        return <ImageGrid videos={imageData} />;
      case "discover":
      case "top":
      case "recent":
      case "liked":
      case "random":
      case "subscriptions":
      default:
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
            {videoData.map((video) => (
              <VideoCard key={video.id} video={video} />
            ))}
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
