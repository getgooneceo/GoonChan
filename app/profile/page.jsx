"use client";
import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { useSearchParams, useRouter } from "next/navigation";
import { FiUpload, FiEdit2, FiLogOut } from "react-icons/fi";
import { RiVideoLine, RiImageLine, RiUser3Line } from "react-icons/ri";
import { MdFavoriteBorder } from "react-icons/md";
import { TbUsers } from "react-icons/tb";
import { FaBell } from "react-icons/fa";
import NavBar from "@/components/NavBar";
import ProfileImageGrid from "@/components/ProfileImageGrid";
import ProfileVideoGrid from "@/components/ProfileVideoGrid";
import SubscriptionGrid from "@/components/SubscriptionGrid";
// import { Toaster, toast } from "sonner";
import config from "@/config.json";
import useUserAvatar from "@/hooks/useUserAvatar";

const calculateLikePercentage = (likeCount = 0, dislikeCount = 0) => {
  if (likeCount === 0 && dislikeCount === 0) return 0;
  return Math.round((likeCount / (likeCount + dislikeCount)) * 100);
};

const ProfilePage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const username = searchParams.get('user');
  
  const [activeTab, setActiveTab] = useState("general");
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [user, setUser] = useState(null);
  const [profileData, setProfileData] = useState(null);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [bio, setBio] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isHoveringPfp, setIsHoveringPfp] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const fileInputRef = useRef(null);
  const bioTextareaRef = useRef(null);
  const [fadeInOut, setFadeInOut] = useState(false);
  const [updateData, setUpdateData] = useState(false);
  const { avatarUrl } = useUserAvatar(profileData);
  
  const handlePictureUpload = () => {
    if (isOwnProfile) {
      fileInputRef.current?.click();
    }
  };

  const handleTabChange = (tabId) => {
    if (tabId === activeTab) return;
    
    setFadeInOut(true);

    setTimeout(() => {
      setActiveTab(tabId);
      setTimeout(() => {
        setFadeInOut(false);
      }, 80);
    }, 35);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && isOwnProfile) {
      const imageUrl = URL.createObjectURL(file);
      // Upload image to server logic would go here
      console.log("File selected:", file);
    }
  };

  const handleBioSubmit = async () => {
    if (!isOwnProfile) return;
    
    setIsEditingBio(false);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No token found');
        return;
      }

      const response = await fetch(`${config.url}/api/updateBio`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          token,
          bio: bio.trim()
        }),
      });

      const data = await response.json();

      if (data.success) {
        setProfileData(prev => ({
          ...prev,
          bio: data.bio
        }));
        // toast('Bio updated successfully!');
      } else {
        console.error('Failed to update bio:', data.message);
        // toast.error(data.message || 'Failed to update bio');
        setBio(profileData.bio || "");
      }
    } catch (error) {
      console.error('Failed to update bio:', error);
      // toast.error('Failed to update bio');
      setBio(profileData.bio || "");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
    router.push('/');
  };

  useEffect(() => {
    if (isEditingBio && bioTextareaRef.current) {
      bioTextareaRef.current.focus();
    }
  }, [isEditingBio]);

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        const token = username ? null : localStorage.getItem('token');

        if (!token && !username) {
          router.push('/');
          return;
        }

        setIsLoading(true);
        setError(null);
        
        const response = await fetch(`${config.url}/api/profile`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            token,
            username: username || null
          }),
        });

        const data = await response.json();

        if (data.success && data.user) {
          const videosWithPercentage = data.user.videos?.map(video => ({
            ...video,
            likePercentage: calculateLikePercentage(video.likeCount, video.dislikeCount)
          })) || [];

          const imagesWithPercentage = data.user.images?.map(image => ({
            ...image,
            likePercentage: calculateLikePercentage(image.likeCount, image.dislikeCount)
          })) || [];

          setProfileData({
            ...data.user,
            videos: videosWithPercentage,
            images: imagesWithPercentage
          });
          setIsOwnProfile(data.isOwnProfile);
          setBio(data.user.bio || "");

          if (!data.isOwnProfile) {
            setActiveTab("videos");
          }
        } else {
          setError(data.message || "Failed to load profile");
        }
      } catch (error) {
        console.error("Profile data fetch failed:", error);
        setError("Failed to load profile data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfileData();
  }, [username, router, updateData]);

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long'
    });
  };

  const categories = [
    { id: "general", label: "General", icon: <RiUser3Line /> },
    { id: "videos", label: "Videos", icon: <RiVideoLine /> },
    { id: "images", label: "Images", icon: <RiImageLine /> },
    { id: "subscriptions", label: "Subs", icon: <TbUsers /> },
    // { id: "liked", label: "Liked", icon: <MdFavoriteBorder /> },
  ];

  if (isLoading) {
    return (
      // skelly
      <div className="min-h-screen bg-[#080808] text-white">
        <NavBar user={user} setUser={setUser} />
        {/* <Toaster theme="dark" position="bottom-right" richColors /> */}
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          <div className="flex flex-col md:flex-row gap-8">
            <div className="hidden md:block w-64 shrink-0">
              <div className="bg-[#121212] rounded-xl p-4">
                {[...Array(5)].map((_, index) => (
                  <div 
                    key={index} 
                    className="h-10 bg-[#1a1a1a] rounded-lg mb-1 animate-pulse"
                  ></div>
                ))}
              </div>
            </div>

            <div className="flex-1">
              <div className="bg-[#0e0e0e] border border-[#2b2b2b] rounded-xl p-6 mb-6 overflow-hidden">
                <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                  <div className="w-24 h-24 rounded-full bg-[#1a1a1a] animate-pulse"></div>

                  <div className="flex-1 w-full">
                    <div className="h-8 bg-[#1a1a1a] rounded-lg w-40 mb-4 animate-pulse"></div>
                    <div className="flex gap-4 mb-4">
                      <div className="h-5 bg-[#1a1a1a] rounded w-24 animate-pulse"></div>
                      <div className="h-5 bg-[#1a1a1a] rounded w-20 animate-pulse"></div>
                    </div>
                    <div className="h-28 bg-[#1a1a1a] rounded-lg animate-pulse"></div>
                  </div>
                </div>
              </div>

              <div className="bg-[#0e0e0e] border border-[#2b2b2b] rounded-xl p-6 mb-16">
                <div className="h-8 bg-[#1a1a1a] rounded-lg w-48 mb-6 animate-pulse"></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {[...Array(2)].map((_, index) => (
                    <div key={index} className="bg-[#151515] rounded-lg p-5 border border-[#272727]">
                      <div className="h-6 bg-[#1a1a1a] rounded w-32 mb-4 animate-pulse"></div>
                      <div className="space-y-4">
                        {[...Array(3)].map((_, i) => (
                          <div key={i} className="flex justify-between">
                            <div className="h-5 bg-[#1a1a1a] rounded w-24 animate-pulse"></div>
                            <div className="h-5 bg-[#1a1a1a] rounded w-20 animate-pulse"></div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !profileData) {
    return (
      <div className="min-h-screen bg-[#080808] text-white">
        <NavBar user={user} setUser={setUser} />
        <div className="flex flex-col items-center justify-center h-[80vh] px-4 max-w-md mx-auto text-center">
          <h1 className="text-3xl font-semibold text-white mb-3">Profile Not Found</h1>
          <p className="text-white/70 mb-5 leading-relaxed">
            {"We couldn't find the profile you're looking for. It may have been removed or does not exist."}
          </p>
          <div className="flex flex-col items-center space-y-1">
            <a 
              href="/"
              className="text-[#ea4197] hover:text-[#f06db3] transition-colors text-base underline underline-offset-4 decoration-1"
            >
              Return to the homepage
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080808] text-white">
      <NavBar user={user} setUser={setUser} />

      {/* Full-width bottom navigation for mobile */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[#121212] shadow-lg z-40 border-t border-[#2a2a2a]">
        <div className="flex justify-between items-center">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => handleTabChange(category.id)}
              className={`flex flex-col items-center py-2 flex-1 ${
                activeTab === category.id ? "text-[#ea4197]" : "text-white/70"
              }`}
            >
              <span className="text-xl mb-1">{category.icon}</span>
              <span className="text-sm font-roboto">{category.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="container mx-auto px-2 md:py-8 py-2 max-w-7xl pb-16 md:pb-8">
        <div className="flex flex-col md:flex-row gap-8">
          <div className="hidden md:block w-64 shrink-0">
            <div className="bg-[#121212] rounded-xl p-4 sticky top-24">
              <div className={`space-y-1 ${isOwnProfile ? "pb-2.5" : ""}`}>
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => handleTabChange(category.id)}
                    className={`flex items-center cursor-pointer w-full px-4 py-2.5 rounded-lg transition-colors ${
                      activeTab === category.id
                        ? "bg-[#ea419730] text-[#ea4197]"
                        : "text-white/80 hover:bg-white/5"
                    }`}
                  >
                    <span className="mr-[0.7rem] text-lg">{category.icon}</span>
                    <span className="-translate-y-[2px] font-pop">
                      {category.label}
                    </span>
                  </button>
                ))}
              </div>

              {isOwnProfile && (
                <div className="pt-3 border-t border-white/10 mt-0">
                  <button
                    className="flex items-center cursor-pointer w-full px-4 py-2.5 rounded-lg text-red-400 hover:bg-red-900/20"
                    onClick={handleLogout}
                  >
                    <FiLogOut className="mr-[0.7rem] text-lg" />
                    <span className="-translate-y-[2px] font-pop">Logout</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Main content area */}
          <div className="flex-1">
            <div className="relative bg-[#0e0e0e] border border-[#2b2b2b] rounded-xl p-6 mb-6 overflow-hidden">
              <div className="flex flex-col md:flex-row items-center md:items-start gap-1 md:gap-6 relative">
                {/* Profile Picture with upload button overlay */}
                <div
                  className={`relative ${isOwnProfile ? 'cursor-pointer' : ''}`}
                  onMouseEnter={() => isOwnProfile && setIsHoveringPfp(true)}
                  onMouseLeave={() => isOwnProfile && setIsHoveringPfp(false)}
                  onClick={isOwnProfile ? handlePictureUpload : undefined}
                >
                  <div className="w-26 h-26 md:w-24 md:h-24 rounded-full overflow-hidden border-4 border-[#1f1f1f] bg-[#1f1f1f] relative">
                    {(profileData.avatar || avatarUrl) ? (
                      <Image
                        src={profileData.avatar || avatarUrl}
                        alt="Profile Picture"
                        fill
                        className="object-cover transition-transform duration-200 ease-in-out"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-[#1f1f1f]">
                        <RiUser3Line className="text-[#444] text-4xl" />
                      </div>
                    )}

                    {/* Edit button overlay - visible on hover */}
                    {isOwnProfile && (
                      <div
                        className={`absolute inset-0 flex items-center justify-center bg-black/60 transition-opacity duration-300 ${
                          isHoveringPfp ? "opacity-100" : "opacity-0"
                        }`}
                      >
                        <div className="flex flex-col items-center">
                          <FiUpload className="text-white text-xl mb-2" />
                          <span className="text-white text-xs text-center px-2">
                            Change photo
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    className="hidden"
                  />
                </div>

                {/* Profile Info */}
                <div className="flex-1 text-center md:text-left w-full">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <h1 className="text-2xl md:text-2xl font-pop font-bold text-white">
                      @{profileData.username}
                    </h1>
                  </div>

                  <div className="flex flex-wrap gap-4 justify-center md:justify-start lg:mb-3 mb-4 mt-0 lg:mt-2">
                    <div className="text-white/70">
                      <span className="text-white font-bold">
                        {profileData.subscriberCount}
                      </span>{" "}
                      Subscribers
                    </div>
                    <div className="text-white/70">
                      <span className="text-white font-bold">
                        {profileData.totalUploads}
                      </span>{" "}
                      Uploads
                    </div>
                  </div>

                  {/* Bio section with edit functionality */}
                  <div className="relative w-full max-w-full">
                    {isEditingBio ? (
                      <div className="mt-1 w-full">
                        <textarea
                          ref={bioTextareaRef}
                          value={bio}
                          onChange={(e) => setBio(e.target.value)}
                          className="w-full p-3 bg-[#1a1a1a] rounded-lg text-white/90 border border-[#3a3a3a] focus:border-[#ea4197] focus:outline-none min-h-[100px] resize-none"
                          placeholder="Write something about yourself..."
                          maxLength={300}
                        />
                        <div className="flex justify-between items-center mt-2">
                          <span className="text-white/50 text-xs -translate-y-1.5">
                            {bio.length}/300
                          </span>
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setBio(profileData.bio);
                                setIsEditingBio(false);
                              }}
                              className="px-3 py-1 text-sm bg-[#2a2a2a] hover:bg-[#3a3a3a] rounded-md transition-colors"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={handleBioSubmit}
                              className="px-3 py-1 text-sm bg-[#ea4197] hover:bg-[#d03884] rounded-md transition-colors"
                            >
                              Save
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div
                        className={`p-3 bg-[#1a1a1a] border border-[#2a2a2a] border-dashed rounded-lg ${isOwnProfile ? 'hover:border-[#3a3a3a] cursor-text' : ''}`}
                        onClick={isOwnProfile ? () => setIsEditingBio(true) : undefined}
                      >
                        {profileData.bio ? (
                          <p className="text-white/80 text-sm md:text-base">
                            {profileData.bio}
                          </p>
                        ) : (
                          <p className="text-white/40 text-sm md:text-base italic">
                            {isOwnProfile ? "Add a bio to your profile..." : "No bio available."}
                          </p>
                        )}
                      </div>
                    )}
                    <div className="flex items-center justify-end mt-2.5">
                      {!isEditingBio && isOwnProfile && (
                        <button
                          onClick={() => setIsEditingBio(true)}
                          className="flex cursor-pointer items-center gap-1 text-xs text-white/60 hover:text-white/90 transition-colors"
                        >
                          <FiEdit2 size={12} />
                          Edit bio
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Tab Content */}
            <div className={`bg-[#0e0e0e] border border-[#2b2b2b] rounded-xl p-6 ${activeTab=="general" && isOwnProfile ? "mb-0" : "mb-16"}`}>
              {activeTab === "general" && (
                <div className={`space-y-6 transition-opacity duration-200 ease-out ${fadeInOut ? "opacity-0" : "opacity-100"}`}>
                  <h2 className="text-xl font-pop font-semibold mb-4 text-white/90">
                    Account Overview
                  </h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-[#151515] rounded-lg p-5 border border-[#272727]">
                      <h3 className="text-lg font-medium mb-3 text-[#ea4197]">
                        Activity
                      </h3>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-white/70">Total Views</span>
                          <span className="text-white font-medium">
                            {profileData.totalViews.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/70">Total Likes</span>
                          <span className="text-white font-medium">
                            {profileData.totalLikes.toLocaleString()}
                          </span>
                        </div>
                        {isOwnProfile && profileData.email && (
                          <div className="flex justify-between">
                            <span className="text-white/70">Uploads</span>
                            <span className="text-white font-medium">
                              {profileData.totalUploads}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="bg-[#151515] rounded-lg p-5 border border-[#272727]">
                      <h3 className="text-lg font-medium mb-3 text-[#ea4197]">
                        Account Info
                      </h3>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-white/70">Username</span>
                          <span className="text-white font-medium">
                            @{profileData.username}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/70">Member Since</span>
                          <span className="text-white font-medium">
                            {formatDate(profileData.createdAt)}
                          </span>
                        </div>
                        {isOwnProfile && profileData.email && (
                          <div className="flex justify-between">
                            <span className="text-white/70">Email</span>
                            <span className="text-white font-medium">
                              {profileData.email}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "videos" && (
                <div className={`transition-opacity duration-300 ease-in-out ${fadeInOut ? "opacity-0" : "opacity-100"}`}>
                  <h2 className="text-xl font-semibold mb-4 text-white/90">
                    Uploaded Videos
                  </h2>
                  {profileData.videos && profileData.videos.length > 0 ? (
                    <ProfileVideoGrid 
                      videos={profileData.videos} 
                      isOwnProfile={isOwnProfile}
                      onVideoDelete={(deletedVideoId) => {
                        setProfileData(prev => ({
                          ...prev,
                          videos: prev.videos.filter(video => 
                            (video._id || video.id) !== deletedVideoId
                          )
                        }));
                      }}
                    />
                  ) : (
                    <div className="text-center py-16">
                      <div className="inline-block p-4 rounded-full bg-[#1a1a1a] mb-4">
                        <RiVideoLine size={40} className="text-[#ea4197]" />
                      </div>
                      <h3 className="text-lg font-medium mb-2">
                        No videos uploaded yet
                      </h3>
                      <p className="text-white/50 max-w-md mx-auto">
                        {isOwnProfile ? 
                          "Your uploaded videos will appear here. Start uploading to grow your channel!" : 
                          "This user hasn't uploaded any videos yet."}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "images" && (
                <div className={`transition-opacity duration-300 ease-in-out ${fadeInOut ? "opacity-0" : "opacity-100"}`}>
                  <h2 className="text-xl font-semibold mb-4 text-white/90">
                    Uploaded Images
                  </h2>
                  {profileData.images && profileData.images.length > 0 ? (
                    <ProfileImageGrid 
                      images={profileData.images} 
                      isOwnProfile={isOwnProfile}
                      onImageDelete={(deletedImageId) => {
                        setProfileData(prev => ({
                          ...prev,
                          images: prev.images.filter(image => 
                            (image._id || image.id) !== deletedImageId
                          )
                        }));
                      }}
                    />
                  ) : (
                    <div className="text-center py-16">
                      <div className="inline-block p-4 rounded-full bg-[#1a1a1a] mb-4">
                        <RiImageLine size={40} className="text-[#ea4197]" />
                      </div>
                      <h3 className="text-lg font-medium mb-2">
                        No images uploaded yet
                      </h3>
                      <p className="text-white/50 max-w-md mx-auto">
                        {isOwnProfile ?
                          "Your uploaded images will appear here. Share your best content with the community!" :
                          "This user hasn't uploaded any images yet."}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "subscriptions" && (
                <div className={`transition-opacity duration-300 ease-in-out ${fadeInOut ? "opacity-0" : "opacity-100"}`}>
                  <h2 className="text-xl font-semibold mb-4 text-white/90">
                    Subscriptions
                  </h2>
                  {profileData.subscriptions && profileData.subscriptions.length > 0 ? (
                    <SubscriptionGrid subscriptions={profileData.subscriptions} />
                  ) : (
                    <div className="text-center py-16">
                      <div className="inline-block p-4 rounded-full bg-[#1a1a1a] mb-4">
                        <TbUsers size={40} className="text-[#ea4197]" />
                      </div>
                      <h3 className="text-lg font-medium mb-2">
                        No subscriptions yet
                      </h3>
                      <p className="text-white/50 max-w-md mx-auto">
                        {isOwnProfile ?
                          "Channels you subscribe to will appear here. Discover creators and subscribe to see their content!" :
                          "This user isn't subscribed to any channels yet."}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "liked" && (
                <div className={`transition-opacity duration-300 ease-in-out ${fadeInOut ? "opacity-0" : "opacity-100"}`}>
                  <h2 className="text-xl font-semibold mb-4 text-white/90">
                    Liked Content
                  </h2>
                  <div className="text-center py-16">
                    <div className="inline-block p-4 rounded-full bg-[#1a1a1a] mb-4">
                      <MdFavoriteBorder size={40} className="text-[#ea4197]" />
                    </div>
                    <h3 className="text-lg font-medium mb-2">
                      No liked content yet
                    </h3>
                    <p className="text-white/50 max-w-md mx-auto">
                      {isOwnProfile ?
                        "Videos and images you like will appear here. Start exploring and liking content!" :
                        "This user hasn't liked any content yet."}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Logout button at the bottom on mobile */}
            {isOwnProfile && activeTab=="general" && (
              <div className="md:hidden mt-6 mb-20">
                <button
                  className="flex items-center justify-center w-full gap-2 px-4 py-3 rounded-lg text-red-400 bg-[#1a1a1a] hover:bg-[#252525]"
                  onClick={handleLogout}
                >
                  <FiLogOut className="mr-1" />
                  Logout
                </button>
              </div>
            
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
