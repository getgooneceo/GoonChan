'use client'
import React, {useState} from "react";
import NavBar from "@/components/NavBar";
import VideoCard from "@/components/VideoGrid";
import { videoData } from "@/app/data";

export default function Home() {
  const [user, setUser] = useState(null);
  return (
    <>
      <div className="bg-[#080808] min-h-screen w-full">
        <NavBar user={user} setUser={setUser} />
        <div className="max-w-[79rem] mx-auto px-4 lg:px-2 pt-2 pb-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
            {videoData.map((video) => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
