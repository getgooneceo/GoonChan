"use client";
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from "next/navigation";
import config from "@/config.json";
import { Toaster, toast } from "sonner";
import { FaLink, FaPlus, FaClock, FaCheckCircle, FaExclamationTriangle, FaTrash, FaCog, FaDownload, FaUpload } from "react-icons/fa";
import "remixicon/fonts/remixicon.css";
import io from 'socket.io-client';

const page = () => {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [link, setLink] = useState('');
  const [queue, setQueue] = useState([]);
  const [uploadDestination, setUploadDestination] = useState('goonchan');
  const socketRef = useRef(null);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/');
        return;
      }

      try {
        const response = await fetch(`${config.url}/api/check`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });

        const data = await response.json();
        
        if (data.success && data.user?.isAdmin) {
          setUser(data.user);
          
          // Fetch initial queue state after authentication
          const queueRes = await fetch(`${config.url}/api/queue`);
          const queueData = await queueRes.json();
          if (queueData.success) {
            setQueue(queueData.queue);
          }
          setLoading(false);
        } else {
          router.push('/');
        }
      } catch (error) {
        console.error('Auth check or queue fetch failed:', error);
        router.push('/');
      }
    };

    checkAuth();

    // Initialize Socket.IO connection
    socketRef.current = io(config.url);

    socketRef.current.on('connect', () => {
        console.log('Connected to Socket.IO server');
    });

    socketRef.current.on('queue:update', (updatedQueue) => {
        setQueue(updatedQueue);
    });

    socketRef.current.on('queue:error', (errorMessage) => {
        toast.error(errorMessage);
    });

    return () => {
        if (socketRef.current) {
            socketRef.current.disconnect();
        }
    };
  }, [router]);


  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmedLink = link.trim();
    if (!trimmedLink || !trimmedLink.includes('motherless.com')) {
      toast.error('Please enter a valid Motherless link.');
      return;
    }

    const optimisticVideo = {
      _id: `temp-${Date.now()}`,
      link: trimmedLink,
      status: 'queued',
      destination: uploadDestination,
      isOptimistic: true,
    };
    setQueue(prevQueue => [optimisticVideo, ...prevQueue]);
    
    const token = localStorage.getItem('token');
    socketRef.current.emit('queue:add', { link: trimmedLink, destination: uploadDestination, token });
    setLink('');
    toast.success('Video added to the queue.');
  };

  const removeFromQueue = (id) => {
    // Optimistic UI update for removing
    setQueue(prevQueue => prevQueue.filter(video => video._id !== id));

    socketRef.current.emit('queue:remove', id);
    toast.warning('Video removed from the queue.');
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'queued': return <FaClock className="text-yellow-400" />;
      case 'processing': return <FaCog className="animate-spin text-blue-400" />;
      case 'downloading': return <FaDownload className="text-cyan-400" />;
      case 'uploading': return <FaUpload className="text-purple-400" />;
      case 'completed': return <FaCheckCircle className="text-green-400" />;
      case 'failed': return <FaExclamationTriangle className="text-red-400" />;
      default: return null;
    }
  };
  
  const getButtonClass = (dest) => {
    const baseClass = "px-6 py-3 rounded-xl transition-all duration-300 ease-in-out cursor-pointer text-sm font-semibold shadow-lg transform hover:scale-[1.025] text-center";
    if (uploadDestination === dest) {
        return `${baseClass} cursor-pointer bg-[#bb156b] text-white`;
    }
    return `${baseClass} bg-gradient-to-br from-[#1a1a1a] to-[#1f1f1f] text-white`;
  }

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-[#080808] via-[#0a0a0a] to-[#0c0c0c] min-h-screen flex items-center justify-center">
        <div className="animate-pulse">
          <div className="h-8 bg-gradient-to-r from-[#1a1a1a] to-[#1f1f1f] rounded-xl w-48"></div>
        </div>
      </div>
    );
  }

  const goonChanUploads = queue.filter(v => v.status === 'completed' && (v.destination === 'goonchan' || v.destination === 'both')).length;
  const goonVideosUploads = queue.filter(v => v.status === 'completed' && (v.destination === 'goonvideos' || v.destination === 'both')).length;
  const inQueueCount = queue.filter(v => v.status === 'queued' || v.status === 'processing').length;

  return (
    <div className="bg-gradient-to-br from-[#080808] via-[#0a0a0a] to-[#0c0c0c] min-h-screen text-white">
      <Toaster theme="dark" position="bottom-right" richColors />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-12">
        <div className="mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent">
            Video Upload Engine
          </h1>
          <p className="text-[#a0a0a0] text-sm sm:text-base font-medium mt-2">
            Add Motherless links to scrape and upload videos automatically.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-gradient-to-br from-[#1a1a1a] to-[#1f1f1f] px-6 py-4 rounded-2xl border border-[#2a2a2a]/50 shadow-xl">
            <div className="text-[#a0a0a0] text-sm font-medium">In Queue</div>
            <div className="text-white font-bold text-2xl mt-1">{inQueueCount}</div>
          </div>
          <div className="bg-gradient-to-br from-[#1a1a1a] to-[#1f1f1f] px-6 py-4 rounded-2xl border border-[#2a2a2a]/50 shadow-xl">
            <div className="text-[#a0a0a0] text-sm font-medium">GoonChan Uploads</div>
            <div className="text-white font-bold text-2xl mt-1">{goonChanUploads}</div>
          </div>
          <div className="bg-gradient-to-br from-[#1a1a1a] to-[#1f1f1f] px-6 py-4 rounded-2xl border border-[#2a2a2a]/50 shadow-xl">
            <div className="text-[#a0a0a0] text-sm font-medium">GoonVideos Uploads</div>
            <div className="text-white font-bold text-2xl mt-1">{goonVideosUploads}</div>
          </div>
        </div>
        
        <div className="mb-6">
          <label className="block text-white font-semibold mb-3 text-sm">Upload Destination</label>
          <div className="flex flex-wrap items-center gap-3">
              <button onClick={() => setUploadDestination('goonchan')} className={getButtonClass('goonchan')}>GoonChan</button>
              <button onClick={() => setUploadDestination('goonvideos')} className={getButtonClass('goonvideos')}>GoonVideos</button>
              <button onClick={() => setUploadDestination('both')} className={getButtonClass('both')}>Both</button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mb-10 relative group">
           {/* <div className="absolute inset-0 bg-gradient-to-r from-[#ea4197]/20 to-[#d63384]/20 rounded-2xl blur-xl opacity-0 group-focus-within:opacity-100 transition-all duration-500"></div> */}
           <div className="relative flex items-center">
            <FaLink className="absolute z-10 left-5 top-1/2 transform -translate-y-1/2 text-[#727272] group-focus-within:text-[#ea4198b0] transition-colors duration-300" />
            <input
              type="text"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="Paste a Motherless.com video link here..."
              className="w-full bg-gradient-to-br from-[#1a1a1a] to-[#1f1f1f] border border-[#2a2a2a]/50 text-white rounded-2xl pl-12 pr-28 py-4 focus:outline-none focus:border-[#ea4197]/80 focus:ring-2 focus:ring-[#ea4197]/20 transition-all duration-300 placeholder-[#666] text-sm sm:text-base shadow-sm"
            />
            <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2 px-4 py-2.5 cursor-pointer bg-[#bb156b] text-white rounded-xl transition-all duration-300 text-sm font-semibold shadow-lg hover:shadow-xl transform hover:scale-[1.025]">
              <FaPlus />
              <span className="hidden sm:inline">Add to Queue</span>
            </button>
           </div>
        </form>

        <div>
          <h2 className="text-2xl font-bold mb-6">Upload Queue</h2>
          {queue.length === 0 ? (
            <div className="text-center py-20 bg-gradient-to-br from-[#111]/60 to-[#171717]/60 rounded-3xl p-8 border border-[#2a2a2a]/40">
              <i className="ri-upload-cloud-2-line text-6xl text-[#ea4197]"></i>
              <h3 className="text-xl font-bold mt-4">Queue is empty</h3>
              <p className="text-[#a0a0a0] mt-2">Add a video link above to get started.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {queue.map(video => (
                <div 
                  key={video._id} 
                  className={`bg-gradient-to-br from-[#121212] to-[#171717] border border-[#2a2a2a]/50 rounded-2xl p-4 flex flex-col gap-3 transition-all duration-300 ${video.isOptimistic ? 'opacity-50' : ''}`}
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="text-lg">{getStatusIcon(video.status)}</div>
                      <div className="min-w-0">
                        <p className="text-sm text-white truncate font-medium">{video.link}</p>
                        <p className="text-xs text-[#a0a0a0] capitalize">
                          {video.status}
                          {video.destination && <span className="font-semibold"> to {video.destination}</span>}
                        </p>
                      </div>
                    </div>
                    {/* <button onClick={() => removeFromQueue(video._id)} className="text-gray-500 hover:text-red-500 transition-colors p-2 rounded-full">
                      <FaTrash />
                    </button> */}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default page;
