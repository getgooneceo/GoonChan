"use client";
import React, { useState, useRef, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { FiUpload, FiEdit2, FiLogOut } from "react-icons/fi";
import { RiVideoLine, RiImageLine, RiUser3Line } from "react-icons/ri";
import { Toaster, toast } from "sonner";
import { MdFavoriteBorder } from "react-icons/md";
import { TbUsers } from "react-icons/tb";
import { useNavBar } from "@/contexts/NavBarContext";
import ProfileImageGrid from "../../components/ProfileImageGrid";
import ProfileVideoGrid from "../../components/ProfileVideoGrid";
import SubscriptionGrid from "../../components/SubscriptionGrid";
import config from "../../config.json";
import useUserAvatar from "../../hooks/useUserAvatar";

const calculateLikePercentage = (likeCount = 0, dislikeCount = 0) => {
  if (likeCount === 0 && dislikeCount === 0) return 0;
  return Math.round((likeCount / (likeCount + dislikeCount)) * 100);
};

const ProfileContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const usernameParam = searchParams.get('user');
  const { user, setUser, setConfig } = useNavBar();
  
  const [activeTab, setActiveTab] = useState("general");
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [profileData, setProfileData] = useState(null);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [bio, setBio] = useState("");
  const [username, setUsername] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isHoveringPfp, setIsHoveringPfp] = useState(false);
  const [isHoveringUsername, setIsHoveringUsername] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const fileInputRef = useRef(null);
  const bioTextareaRef = useRef(null);
  const usernameInputRef = useRef(null);
  const [fadeInOut, setFadeInOut] = useState(false);
  const [updateData, setUpdateData] = useState(false);
  const { avatarUrl } = useUserAvatar(profileData);
  const [videoOffset, setVideoOffset] = useState(0);
  const [imageOffset, setImageOffset] = useState(0);
  const [loadingMoreVideos, setLoadingMoreVideos] = useState(false);
  const [loadingMoreImages, setLoadingMoreImages] = useState(false);
  const [hasMoreVideos, setHasMoreVideos] = useState(true);
  const [hasMoreImages, setHasMoreImages] = useState(true);
  const observerTargetVideos = useRef(null);
  const observerTargetImages = useRef(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  
  const handlePictureUpload = () => {
    if (isOwnProfile) {
      fileInputRef.current?.click();
    }
  };

  const handleTabChange = (tabId) => {
    if (activeTab === tabId) return;

    if (tabId === "admin") {
      window.location.href = '/admin';
      return;
    }

    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tabId);
    router.push(`/profile?${params.toString()}`, { scroll: false });

    setFadeInOut(true);

    setTimeout(() => {
      setActiveTab(tabId);
      setTimeout(() => {
        setFadeInOut(false);
      }, 80);
    }, 35);
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (file && isOwnProfile) {
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
      if (!allowedTypes.includes(file.type)) {
        toast.error('Invalid file type. Please upload JPG, PNG, WebP, or GIF images only.');
        console.error('Invalid file type');
        return;
      }

      const maxSize = 10 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        toast.error('File size too large. Maximum size is 10MB.');
        console.error('File size too large');
        return;
      }

      const imageUrl = URL.createObjectURL(file);

      try {
        const token = localStorage.getItem('token');
        if (!token) {
          console.error('No token found');
          return;
        }

        setProfileData(prev => ({
          ...prev,
          avatar: imageUrl
        }));

        const formData = new FormData();
        formData.append('token', token);
        formData.append('avatar', file);

        const response = await fetch(`${config.url}/api/updateAvatar`, {
          method: 'POST',
          body: formData,
        });

        const data = await response.json();

        if (data.success) {
          setProfileData(prev => ({
            ...prev,
            avatar: data.avatar
          }));
          toast.success('Profile picture updated successfully!');
          console.log('Avatar updated successfully');
        } else {
          console.error('Failed to update avatar:', data.message);
          toast.error(data.message || 'Failed to update profile picture');
          setProfileData(prev => ({
            ...prev,
            avatar: profileData.avatar
          }));
        }
      } catch (error) {
        console.error('Failed to update avatar:', error);
        toast.error('Failed to update profile picture');
        setProfileData(prev => ({
          ...prev,
          avatar: profileData.avatar
        }));
      }
    }
  };

  const handleBioSubmit = async () => {
    if (!isOwnProfile) return;
    
    // Blur the textarea to remove focus styling before closing
    if (bioTextareaRef.current) {
      bioTextareaRef.current.blur();
    }
    
    // Small delay to allow blur to complete
    setTimeout(() => {
      setIsEditingBio(false);
    }, 50);
    
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
        toast.success('Bio updated successfully!');
      } else {
        console.error('Failed to update bio:', data.message);
        toast.error(data.message || 'Failed to update bio');
        setBio(profileData.bio || "");
      }
    } catch (error) {
      console.error('Failed to update bio:', error);
      toast.error('Failed to update bio');
      setBio(profileData.bio || "");
    }
  };

  const handleUsernameSubmit = async () => {
    if (!isOwnProfile) return;
    
    // Blur the input to remove focus styling before closing
    if (usernameInputRef.current) {
      usernameInputRef.current.blur();
    }
    
    // Small delay to allow blur to complete
    setTimeout(() => {
      setIsEditingUsername(false);
    }, 50);
    
    const trimmedUsername = username.trim();
    if (!trimmedUsername) {
      toast.error('Username cannot be empty');
      setUsername(profileData.username);
      return;
    }
    
    if (trimmedUsername.length < 3 || trimmedUsername.length > 16) {
      toast.error('Username must be 3-16 characters long');
      setUsername(profileData.username);
      return;
    }
    
    if (!/^[a-zA-Z0-9]+$/.test(trimmedUsername)) {
      toast.error('Username can only contain letters and numbers');
      setUsername(profileData.username);
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Authentication required. Please log in again.');
        setUsername(profileData.username);
        return;
      }

      const response = await fetch(`${config.url}/api/updateUsername`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          token,
          username: trimmedUsername
        }),
      });

      const data = await response.json();

      if (data.success) {
        setProfileData(prev => ({
          ...prev,
          username: data.username
        }));
        toast.success('Username updated successfully!');
      } else {
        console.error('Failed to update username:', data.message);
        toast.error(data.message || 'Failed to update username');
        setUsername(profileData.username);
      }
    } catch (error) {
      console.error('Failed to update username:', error);
      toast.error('Network error. Please check your connection and try again.');
      setUsername(profileData.username);
    }
  };

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = () => {
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
    if (isEditingUsername && usernameInputRef.current) {
      usernameInputRef.current.focus();
    }
  }, [isEditingUsername]);

  const loadMoreVideos = async () => {
    if (loadingMoreVideos || !hasMoreVideos || !profileData) return;

    setLoadingMoreVideos(true);
    try {
      const token = localStorage.getItem('token');
      const newOffset = videoOffset + 60;

      const response = await fetch(`${config.url}/api/profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          username: usernameParam || null,
          videoOffset: newOffset,
          imageOffset: 0,
          limit: 60
        }),
      });

      const data = await response.json();

      if (data.success && data.user.videos) {
        const videosWithPercentage = data.user.videos.map(video => ({
          ...video,
          likePercentage: calculateLikePercentage(video.likeCount, video.dislikeCount)
        }));

        setProfileData(prev => ({
          ...prev,
          videos: [...prev.videos, ...videosWithPercentage],
          totalUploads: data.user.totalUploads,
          totalViews: data.user.totalViews,
          totalLikes: data.user.totalLikes
        }));
        setVideoOffset(newOffset);
        setHasMoreVideos(data.pagination.videos.hasMore);
      }
    } catch (error) {
      console.error("Failed to load more videos:", error);
    } finally {
      setLoadingMoreVideos(false);
    }
  };

  const loadMoreImages = async () => {
    if (loadingMoreImages || !hasMoreImages || !profileData) return;

    setLoadingMoreImages(true);
    try {
      const token = localStorage.getItem('token');
      const newOffset = imageOffset + 60;

      const response = await fetch(`${config.url}/api/profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          username: usernameParam || null,
          videoOffset: 0,
          imageOffset: newOffset,
          limit: 60
        }),
      });

      const data = await response.json();

      if (data.success && data.user.images) {
        const imagesWithPercentage = data.user.images.map(image => ({
          ...image,
          likePercentage: calculateLikePercentage(image.likeCount, image.dislikeCount)
        }));

        setProfileData(prev => ({
          ...prev,
          images: [...prev.images, ...imagesWithPercentage],
          totalUploads: data.user.totalUploads,
          totalViews: data.user.totalViews,
          totalLikes: data.user.totalLikes
        }));
        setImageOffset(newOffset);
        setHasMoreImages(data.pagination.images.hasMore);
      }
    } catch (error) {
      console.error("Failed to load more images:", error);
    } finally {
      setLoadingMoreImages(false);
    }
  };

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        const token = usernameParam ? null : localStorage.getItem('token');

        if (!token && !usernameParam) {
          router.push('/');
          return;
        }

        setIsLoading(true);
        setError(null);
        setVideoOffset(0);
        setImageOffset(0);
        
        const response = await fetch(`${config.url}/api/profile`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            token,
            username: usernameParam || null,
            videoOffset: 0,
            imageOffset: 0,
            limit: 60
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
          
          // Set pagination states
          if (data.pagination) {
            setHasMoreVideos(data.pagination.videos.hasMore);
            setHasMoreImages(data.pagination.images.hasMore);
          }

          const tabParam = searchParams.get('tab');
          const validTabs = ['videos', 'images', 'subscriptions'];
          if (data.isOwnProfile) {
            validTabs.push('general');
          }

          let initialTab = data.isOwnProfile ? 'general' : 'videos';
          if (tabParam && validTabs.includes(tabParam)) {
            initialTab = tabParam;
          }
          
          setActiveTab(initialTab);
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
  }, [usernameParam, router, updateData]);

  // Intersection observer for videos infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMoreVideos && !loadingMoreVideos && activeTab === 'videos') {
          loadMoreVideos();
        }
      },
      { threshold: 0.7, rootMargin: '300px' }
    );

    if (observerTargetVideos.current) {
      observer.observe(observerTargetVideos.current);
    }

    return () => {
      if (observerTargetVideos.current) {
        observer.unobserve(observerTargetVideos.current);
      }
    };
  }, [hasMoreVideos, loadingMoreVideos, activeTab, profileData]);

  // Intersection observer for images infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMoreImages && !loadingMoreImages && activeTab === 'images') {
          loadMoreImages();
        }
      },
      { threshold: 0.7, rootMargin: '300px' }
    );

    if (observerTargetImages.current) {
      observer.observe(observerTargetImages.current);
    }

    return () => {
      if (observerTargetImages.current) {
        observer.unobserve(observerTargetImages.current);
      }
    };
  }, [hasMoreImages, loadingMoreImages, activeTab, profileData]);

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

  // Add Admin category only for own profile if user is admin
  if (isOwnProfile && profileData?.isAdmin) {
    categories.push({ id: "admin", label: "Admin", icon: <RiUser3Line /> });
  }

  // Configure navbar
  useEffect(() => {
    setConfig({
      show: true,
      showCategories: true,
    });
  }, []);

  if (isLoading) {
    return (
      // skelly
      <div className="min-h-screen bg-[#080808] text-white">
        {/* <Toaster theme="dark" position="bottom-right" richColors /> */}
        <div className="container mx-auto px-4 md:py-8 py-2 max-w-7xl pb-16 md:pb-8">
          <div className="flex flex-col md:flex-row gap-8">
            <div className="hidden md:block w-64 shrink-0">
              <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-xl p-4">
                {[...Array(5)].map((_, index) => (
                  <div 
                    key={index} 
                    className="h-10 bg-white/5 rounded-lg mb-1 animate-pulse"
                  ></div>
                ))}
              </div>
            </div>

            <div className="flex-1">
              <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-xl p-6 mb-6 overflow-hidden">
                <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                  <div className="w-24 h-24 rounded-full bg-white/5 border-4 border-[#1a1a1a] animate-pulse"></div>

                  <div className="flex-1 w-full">
                    <div className="h-8 bg-white/5 rounded-lg w-40 mb-4 animate-pulse"></div>
                    <div className="flex gap-4 mb-4">
                      <div className="h-5 bg-white/5 rounded w-24 animate-pulse"></div>
                      <div className="h-5 bg-white/5 rounded w-20 animate-pulse"></div>
                    </div>
                    <div className="h-24 bg-white/5 rounded-lg animate-pulse"></div>
                  </div>
                </div>
              </div>

              <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-xl p-6 mb-16">
                <div className="h-8 bg-white/5 rounded-lg w-48 mb-6 animate-pulse"></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {[...Array(2)].map((_, index) => (
                    <div key={index} className="bg-[#0a0a0a] rounded-lg p-5 border border-[#1a1a1a]">
                      <div className="h-6 bg-white/5 rounded w-32 mb-4 animate-pulse"></div>
                      <div className="space-y-4">
                        {[...Array(3)].map((_, i) => (
                          <div key={i} className="flex justify-between">
                            <div className="h-5 bg-white/5 rounded w-24 animate-pulse"></div>
                            <div className="h-5 bg-white/5 rounded w-20 animate-pulse"></div>
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
      {/* <Toaster theme="dark" position="bottom-right" richColors /> */}

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowLogoutConfirm(false)}
        >
          <div 
            className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-xl p-6 max-w-sm w-full animate-in fade-in zoom-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-semibold mb-2 text-white">Log out?</h3>
            <p className="text-white/60 text-sm mb-6">
              Are you sure you want to log out of your account?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 px-4 py-2.5 rounded-lg bg-[#1a1a1a] hover:bg-[#222] text-white/90 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmLogout}
                className="flex-1 px-4 py-2.5 rounded-lg bg-red-500 hover:bg-red-600 text-white font-medium transition-colors"
              >
                Log out
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[#0f0f0f] border-t border-[#1f1f1f] z-40">
        <div className="flex justify-between items-center">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => handleTabChange(category.id)}
              className={`flex flex-col items-center py-3 flex-1 transition-colors ${
                activeTab === category.id ? "text-[#ea4197]" : "text-white/60"
              }`}
            >
              <span className="text-xl mb-1">{category.icon}</span>
              <span className="text-xs font-roboto font-medium">{category.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="container mx-auto px-4 md:py-8 py-2 max-w-7xl pb-16 md:pb-8">
        <div className="flex flex-col md:flex-row gap-8">
          <div className="hidden md:block w-64 shrink-0">
            <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-xl p-4 sticky top-24">
              <div className={`space-y-1 ${isOwnProfile ? "pb-2.5" : ""}`}>
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => handleTabChange(category.id)}
                    className={`flex items-center cursor-pointer w-full px-4 py-2.5 rounded-lg transition-colors ${
                      activeTab === category.id
                        ? "bg-[#ea419715] text-[#ea4197]"
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

          <div className="flex-1">
            <div className="relative bg-[#0f0f0f] border border-[#1a1a1a] rounded-xl p-6 mb-6 overflow-hidden">
              <div className="flex flex-col md:flex-row items-center md:items-start gap-1 md:gap-6 relative">
                <div
                  className={`relative ${isOwnProfile ? 'cursor-pointer' : ''}`}
                  onMouseEnter={() => isOwnProfile && setIsHoveringPfp(true)}
                  onMouseLeave={() => isOwnProfile && setIsHoveringPfp(false)}
                  onClick={isOwnProfile ? handlePictureUpload : undefined}
                >
                  <div className="w-26 h-26 md:w-24 md:h-24 rounded-full overflow-hidden border-4 border-[#1a1a1a] bg-[#1a1a1a] relative">
                    {(profileData.avatar || avatarUrl) ? (
                      <img
                        src={profileData.avatar || avatarUrl}
                        alt="Profile Picture"
                        className="object-cover transition-transform duration-200 ease-in-out w-full h-full"
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
                    {/* Username display/edit */}
                    {isEditingUsername ? (
                      <div className="flex items-center justify-center md:justify-start gap-2 w-full md:w-auto animate-in fade-in duration-200">
                        <span className="text-2xl font-pop font-bold text-white/70">@</span>
                        <input
                          ref={usernameInputRef}
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          className="text-2xl font-pop font-bold bg-transparent text-white border-b-2 border-[#2a2a2a] focus:border-[#ea4197] focus:outline-none px-1 py-0.5 min-w-0 flex-1 transition-colors duration-150"
                          placeholder="Enter username"
                          maxLength={16}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleUsernameSubmit();
                            } else if (e.key === 'Escape') {
                              if (usernameInputRef.current) {
                                usernameInputRef.current.blur();
                              }
                              setTimeout(() => {
                                setUsername(profileData.username);
                                setIsEditingUsername(false);
                              }, 50);
                            }
                          }}
                        />
                        <div className="flex gap-1.5 ml-2">
                          <button
                            onClick={() => {
                              if (usernameInputRef.current) {
                                usernameInputRef.current.blur();
                              }
                              setTimeout(() => {
                                setUsername(profileData.username);
                                setIsEditingUsername(false);
                              }, 50);
                            }}
                            className="w-7 h-7 cursor-pointer flex items-center justify-center text-white/60 hover:text-white hover:bg-white/5 rounded-md transition-all duration-200"
                            title="Cancel (Esc)"
                          >
                            <span className="text-base">✕</span>
                          </button>
                          <button
                            onClick={handleUsernameSubmit}
                            className="w-7 h-7 cursor-pointer flex items-center justify-center text-[#ea4197] hover:text-white hover:bg-[#ea4197] rounded-md transition-all duration-200"
                            title="Save (Enter)"
                          >
                            <span className="text-base">✓</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div 
                        className={`flex items-center justify-center md:justify-start gap-2 ${isOwnProfile ? 'cursor-pointer group' : ''}`}
                        onMouseEnter={() => isOwnProfile && setIsHoveringUsername(true)}
                        onMouseLeave={() => isOwnProfile && setIsHoveringUsername(false)}
                        onClick={isOwnProfile ? () => {
                          setUsername(profileData.username);
                          setIsEditingUsername(true);
                        } : undefined}
                      >
                        <h1 className="text-2xl font-pop font-bold text-white transition-colors duration-200">
                          @{profileData.username}
                        </h1>
                        {isOwnProfile && (
                          <div className={`hidden md:flex items-center gap-1.5 transition-all duration-300 ${isHoveringUsername ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-1'}`}>
                            <FiEdit2 size={14} className="text-white/50" />
                            <span className="text-xs text-white/50 font-medium">Edit</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-4 justify-center md:justify-start lg:mb-3 mb-4 mt-2 lg:mt-2">
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
                      {isEditingBio && (
                      <div className="mt-1 w-full">
                        <div className="relative">
                          <textarea
                            ref={bioTextareaRef}
                            value={bio}
                            onChange={(e) => setBio(e.target.value)}
                            className="w-full p-3 bg-[#0c0c0c] rounded-lg text-white/90 border border-[#2a2a2a] focus:border-[#ea4197] focus:outline-none min-h-[100px] resize-none transition-colors duration-150"
                            placeholder="Write something about yourself..."
                            maxLength={300}
                          />
                          <span className="absolute bottom-2.5 right-2.5 text-white/30 text-[10px] pointer-events-none font-medium">
                            {bio.length}/300
                          </span>
                        </div>
                        <div className="flex justify-end items-center gap-2 mt-2">
                          <button
                            onClick={() => {
                              if (bioTextareaRef.current) {
                                bioTextareaRef.current.blur();
                              }
                              setTimeout(() => {
                                setBio(profileData.bio);
                                setIsEditingBio(false);
                              }, 50);
                            }}
                            className="px-3 py-1.5 cursor-pointer text-xs text-white/60 hover:text-white hover:bg-white/5 rounded-md transition-all duration-200 font-medium"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleBioSubmit}
                            className="px-3 py-1.5 cursor-pointer text-xs text-white bg-[#ea4197] hover:bg-[#d03884] rounded-md transition-all duration-200 font-medium"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    )}
                    {!isEditingBio && (
                      <div>
                        <div
                          className={`p-3 bg-[#0c0c0c] border border-[#1a1a1a] rounded-lg transition-all duration-200 ${isOwnProfile ? 'hover:border-[#2a2a2a] cursor-text group' : ''}`}
                          onClick={isOwnProfile ? () => setIsEditingBio(true) : undefined}
                        >
                          {profileData.bio ? (
                            <p className="text-white/80 text-sm md:text-base leading-relaxed">
                              {profileData.bio}
                            </p>
                          ) : (
                            <p className="text-white/40 text-sm md:text-base">
                              {isOwnProfile ? "Add a bio to your profile..." : "No bio available."}
                            </p>
                          )}
                        </div>
                        {isOwnProfile && (
                          <div className="flex items-center justify-end mt-2 gap-3">
                            {/* Mobile edit buttons */}
                            <div className="flex md:hidden items-center gap-3">
                              <button
                                onClick={() => {
                                  setUsername(profileData.username);
                                  setIsEditingUsername(true);
                                }}
                                className="flex items-center gap-1 text-[11px] text-white/50 hover:text-white/90 transition-all duration-200 font-medium"
                              >
                                <FiEdit2 size={11} />
                                Edit Username
                              </button>
                              <button
                                onClick={() => setIsEditingBio(true)}
                                className="flex items-center gap-1 text-[11px] text-white/50 hover:text-white/90 transition-all duration-200 font-medium"
                              >
                                <FiEdit2 size={11} />
                                Edit Bio
                              </button>
                            </div>
                            
                            {/* Desktop edit button */}
                            <button
                              onClick={() => setIsEditingBio(true)}
                              className="hidden md:flex items-center gap-1 text-[11px] text-white/50 hover:text-white/80 transition-all duration-200 font-medium"
                            >
                              <FiEdit2 size={11} />
                              Edit
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Tab Content */}
            {activeTab === "general" ? (
              <div className={`transition-opacity duration-200 ease-out ${fadeInOut ? "opacity-0" : "opacity-100"}`}>

                {/* Mobile: Single card with stacked sections */}
                <div className="md:hidden bg-[#0f0f0f] border border-[#1a1a1a] rounded-xl py-6 px-6">
                  {/* Activity Section */}
                  <div className="mb-6">
                    <h3 className="text-sm font-medium mb-4 text-white/50 uppercase tracking-wide">
                      Activity
                    </h3>
                    <div className="space-y-0">
                      <div className="flex items-center justify-between py-3 border-b border-[#1a1a1a] last:border-b-0">
                        <span className="text-white/70 text-sm font-pop">Total Views</span>
                        <span className="text-white font-medium tabular-nums">
                          {profileData.totalViews.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-3 border-b border-[#1a1a1a] last:border-b-0">
                        <span className="text-white/70 text-sm font-pop">Total Likes</span>
                        <span className="text-white font-medium tabular-nums">
                          {profileData.totalLikes.toLocaleString()}
                        </span>
                      </div>
                      {isOwnProfile && profileData.email && (
                        <div className="flex items-center justify-between py-3 border-b border-[#1a1a1a] last:border-b-0">
                          <span className="text-white/70 text-sm font-pop">Uploads</span>
                          <span className="text-white font-medium tabular-nums">
                            {profileData.totalUploads}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Account Info Section */}
                  <div>
                    <h3 className="text-sm font-medium mb-4 text-white/50 uppercase tracking-wide">
                      Account Info
                    </h3>
                    <div className="space-y-0">
                      <div className="flex items-center justify-between py-3 border-b border-[#1a1a1a] last:border-b-0">
                        <span className="text-white/70 text-sm font-pop">Username</span>
                        <span className="text-white font-medium">
                          @{profileData.username}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-3 border-b border-[#1a1a1a] last:border-b-0">
                        <span className="text-white/70 text-sm font-pop">Member Since</span>
                        <span className="text-white font-medium">
                          {formatDate(profileData.createdAt)}
                        </span>
                      </div>
                      {isOwnProfile && profileData.email && (
                        <div className="flex items-center justify-between py-3 border-b border-[#1a1a1a] last:border-b-0">
                          <span className="text-white/70 text-sm font-pop">Email</span>
                          <span className="text-white font-medium truncate ml-4">
                            {profileData.email}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Desktop: Two separate cards side by side */}
                <div className="hidden md:grid md:grid-cols-2 gap-6">
                  {/* Activity Card */}
                  <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-xl py-6 px-7">
                    <h3 className="text-sm font-medium mb-4 text-white/50 uppercase tracking-wide">
                      Activity
                    </h3>
                    <div className="space-y-0">
                      <div className="flex items-center justify-between py-3 border-b border-[#1a1a1a] last:border-b-0">
                        <span className="text-white/70 text-sm font-pop">Total Views</span>
                        <span className="text-white font-medium  tabular-nums">
                          {profileData.totalViews.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-3 border-b border-[#1a1a1a] last:border-b-0">
                        <span className="text-white/70 text-sm font-pop">Total Likes</span>
                        <span className="text-white font-medium tabular-nums">
                          {profileData.totalLikes.toLocaleString()}
                        </span>
                      </div>
                      {isOwnProfile && profileData.email && (
                        <div className="flex items-center justify-between py-3 border-b border-[#1a1a1a] last:border-b-0">
                          <span className="text-white/70 text-sm font-pop">Uploads</span>
                          <span className="text-white font-medium tabular-nums">
                            {profileData.totalUploads}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Account Info Card */}
                  <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-xl py-6 px-7">
                    <h3 className="text-sm font-medium mb-4 text-white/50 uppercase tracking-wide">
                      Account Info
                    </h3>
                    <div className="space-y-0">
                      <div className="flex items-center justify-between py-3 border-b border-[#1a1a1a] last:border-b-0">
                        <span className="text-white/70 text-sm font-pop">Username</span>
                        <span className="text-white font-medium">
                          @{profileData.username}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-3 border-b border-[#1a1a1a] last:border-b-0">
                        <span className="text-white/70 text-sm font-pop">Member Since</span>
                        <span className="text-white font-medium">
                          {formatDate(profileData.createdAt)}
                        </span>
                      </div>
                      {isOwnProfile && profileData.email && (
                        <div className="flex items-center justify-between py-3 border-b border-[#1a1a1a] last:border-b-0">
                          <span className="text-white/70 text-sm font-pop">Email</span>
                          <span className="text-white font-medium truncate ml-4">
                            {profileData.email}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className={`bg-[#0f0f0f] border border-[#1a1a1a] rounded-xl p-6 ${activeTab=="general" && isOwnProfile ? "mb-0" : "mb-16"}`}>
                {activeTab === "videos" && (
                <div className={`transition-opacity duration-300 ease-in-out ${fadeInOut ? "opacity-0" : "opacity-100"}`}>
                  {profileData.videos && profileData.videos.length > 0 ? (
                    <>
                      <ProfileVideoGrid 
                        videos={profileData.videos} 
                        isOwnProfile={isOwnProfile}
                        isAdmin={user?.isAdmin || false}
                        onVideoDelete={(deletedVideoId) => {
                          setProfileData(prev => ({
                            ...prev,
                            videos: prev.videos.filter(video => 
                              (video._id || video.id) !== deletedVideoId
                            ),
                            totalUploads: prev.totalUploads - 1
                          }));
                        }}
                      />
                      {/* Loading skeleton and observer target - always visible when more content exists */}
                      {hasMoreVideos && (
                        <div ref={observerTargetVideos} className="mt-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {[...Array(typeof window !== 'undefined' ? (window.innerWidth >= 1024 ? 6 : window.innerWidth >= 640 ? 4 : 1) : 6)].map((_, i) => (
                              <div key={i} className={loadingMoreVideos ? "animate-pulse" : ""}>
                                <div className="aspect-video bg-[#1a1a1a] rounded-lg mb-2"></div>
                                <div className="h-4 bg-[#1a1a1a] rounded w-3/4 mb-2"></div>
                                <div className="h-3 bg-[#1a1a1a] rounded w-1/2"></div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
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
                  {profileData.images && profileData.images.length > 0 ? (
                    <>
                      <ProfileImageGrid 
                        images={profileData.images} 
                        isOwnProfile={isOwnProfile}
                        isAdmin={user?.isAdmin || false}
                        onImageDelete={(deletedImageId) => {
                          setProfileData(prev => ({
                            ...prev,
                            images: prev.images.filter(image => 
                              (image._id || image.id) !== deletedImageId
                            ),
                            totalUploads: prev.totalUploads - 1
                          }));
                        }}
                      />
                      {/* Loading skeleton and observer target - always visible when more content exists */}
                      {hasMoreImages && (
                        <div ref={observerTargetImages} className="mt-4">
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {[...Array(typeof window !== 'undefined' ? (window.innerWidth >= 1024 ? 8 : window.innerWidth >= 640 ? 6 : 1) : 8)].map((_, i) => (
                              <div key={i} className={loadingMoreImages ? "animate-pulse" : ""}>
                                <div className="aspect-square bg-[#1a1a1a] rounded-lg mb-2"></div>
                                <div className="h-4 bg-[#1a1a1a] rounded w-3/4 mb-2"></div>
                                <div className="h-3 bg-[#1a1a1a] rounded w-1/2"></div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
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
            )}

            {/* Logout button at the bottom on mobile */}
            {isOwnProfile && activeTab=="general" && (
              <div className="md:hidden mt-6 mb-20">
                <button
                  className="flex items-center justify-center w-full cursor-pointer gap-2 px-4 py-3 rounded-lg text-red-400/90 bg-[#0f0f0f] border border-[#1a1a1a] hover:bg-red-500/10 transition-colors"
                  onClick={handleLogout}
                >
                  <FiLogOut className="mr-1" />
                  <span className="font-medium">Logout</span>
                </button>
              </div>
            
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const ProfilePage = () => {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#080808] text-white">
        <div className="container mx-auto px-4 md:py-8 py-2 max-w-7xl pb-16 md:pb-8">
          <div className="flex flex-col md:flex-row gap-8">
            <div className="hidden md:block w-64 shrink-0">
              <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-xl p-4">
                {[...Array(5)].map((_, index) => (
                  <div 
                    key={index} 
                    className="h-10 bg-white/5 rounded-lg mb-1 animate-pulse"
                  ></div>
                ))}
              </div>
            </div>

            <div className="flex-1">
              <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-xl p-6 mb-6 overflow-hidden">
                <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                  <div className="w-24 h-24 rounded-full bg-white/5 border-4 border-[#1a1a1a] animate-pulse"></div>
                  <div className="flex-1 w-full">
                    <div className="h-8 bg-white/5 rounded-lg w-40 mb-4 animate-pulse"></div>
                    <div className="flex gap-4 mb-4">
                      <div className="h-5 bg-white/5 rounded w-24 animate-pulse"></div>
                      <div className="h-5 bg-white/5 rounded w-20 animate-pulse"></div>
                    </div>
                    <div className="h-24 bg-white/5 rounded-lg animate-pulse"></div>
                  </div>
                </div>
              </div>

              <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-xl p-6 mb-16">
                <div className="h-8 bg-white/5 rounded-lg w-48 mb-6 animate-pulse"></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {[...Array(2)].map((_, index) => (
                    <div key={index} className="bg-[#0a0a0a] rounded-lg p-5 border border-[#1a1a1a]">
                      <div className="h-6 bg-white/5 rounded w-32 mb-4 animate-pulse"></div>
                      <div className="space-y-4">
                        {[...Array(3)].map((_, i) => (
                          <div key={i} className="flex justify-between">
                            <div className="h-5 bg-white/5 rounded w-24 animate-pulse"></div>
                            <div className="h-5 bg-white/5 rounded w-20 animate-pulse"></div>
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
    }>
      <ProfileContent />
    </Suspense>
  );
};

export default ProfilePage;
