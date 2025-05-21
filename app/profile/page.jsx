"use client";
import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { FiUpload, FiEdit2, FiLogOut } from "react-icons/fi";
import { RiVideoLine, RiImageLine, RiUser3Line } from "react-icons/ri";
import { MdFavoriteBorder } from "react-icons/md";
import { TbUsers } from "react-icons/tb";
import NavBar from "@/components/NavBar";

// Mock user data - replace with actual data fetching
const mockUserData = {
  username: "GoonMaster69",
  profilePicture: "/logo.webp", // Replace with actual profile picture
  bio: "Just a casual enthusiast exploring the finest content on the internet. Been here for 2 years now and loving the community!",
  joinDate: "May 2023",
  totalViews: 145872,
  totalLikes: 2340,
  totalUploads: 26,
  followers: 342,
  following: 128,
};

const ProfilePage = () => {
  const [activeTab, setActiveTab] = useState("general");
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [bio, setBio] = useState(mockUserData.bio);
  const [profilePicture, setProfilePicture] = useState(
    mockUserData.profilePicture
  );
  const [isHoveringPfp, setIsHoveringPfp] = useState(false);
  const fileInputRef = useRef(null);
  const bioTextareaRef = useRef(null);
  const [fadeInOut, setFadeInOut] = useState(false);
  // const [prevTab, setPrevTab] = useState("general");

  const handlePictureUpload = () => {
    fileInputRef.current?.click();
  };

  const handleTabChange = (tabId) => {
    if (tabId === activeTab) return;
    
    setFadeInOut(true);
    // setPrevTab(activeTab);

    setTimeout(() => {
      setActiveTab(tabId);
      setTimeout(() => {
        setFadeInOut(false);
      }, 80);
    }, 35);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      setProfilePicture(imageUrl);

      // Handle image upload logic here
      console.log("File selected:", file);
      // You would typically upload this to your server and update the URL
    }
  };

  const handleBioSubmit = () => {
    setIsEditingBio(false);
    // Update bio in backend here
    console.log("Saving bio:", bio);
  };

  useEffect(() => {
    if (isEditingBio && bioTextareaRef.current) {
      bioTextareaRef.current.focus();
    }
  }, [isEditingBio]);

  const categories = [
    { id: "general", label: "General", icon: <RiUser3Line /> },
    { id: "videos", label: "Videos", icon: <RiVideoLine /> },
    { id: "images", label: "Images", icon: <RiImageLine /> },
    { id: "subscriptions", label: "Subs", icon: <TbUsers /> },
    { id: "liked", label: "Liked", icon: <MdFavoriteBorder /> },
  ];

  return (
    <div className="min-h-screen bg-[#080808] text-white">
      <NavBar />

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

      <div className="container mx-auto px-4 py-8 max-w-7xl pb-16 md:pb-8">
        <div className="flex flex-col md:flex-row gap-8">
          <div className="hidden md:block w-64 shrink-0">
            <div className="bg-[#121212] rounded-xl p-4 sticky top-24">
              {/* <h2 className="font-bold font-inter text-lg mb-4 text-[#ea4197] px-4">Profile</h2> */}

              <div className="space-y-1 pb-3">
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

              <div className="pt-3 border-t border-white/10 mt-6">
                <button
                  className="flex items-center cursor-pointer w-full px-4 py-2.5 rounded-lg text-red-400 hover:bg-red-900/20"
                  onClick={() => console.log("Logout clicked")}
                >
                  <FiLogOut className="mr-[0.7rem] text-lg" />
                  <span className="-translate-y-[2px] font-pop">Logout</span>
                </button>
              </div>
            </div>
          </div>

          {/* Main content area */}
          <div className="flex-1">
            <div className="relative bg-[#0e0e0e] border border-[#2b2b2b] rounded-xl p-6 mb-8 overflow-hidden">
              {/* Background decoration */}
              {/* <div className="absolute top-0 right-0 w-64 h-64 bg-[#ea4197] opacity-5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4"></div> */}
              {/* <div className="absolute bottom-0 left-0 w-32 h-32 bg-[#4197ea] opacity-5 rounded-full blur-2xl -translate-x-1/2"></div> */}

              <div className="flex flex-col md:flex-row items-center md:items-start gap-6 relative">
                {/* Profile Picture with upload button overlay */}
                <div
                  className="relative cursor-pointer"
                  onMouseEnter={() => setIsHoveringPfp(true)}
                  onMouseLeave={() => setIsHoveringPfp(false)}
                  onClick={handlePictureUpload}
                >
                  <div className="w-28 h-28 md:w-24 md:h-24 rounded-full overflow-hidden border-4 border-[#1f1f1f] bg-[#1f1f1f] relative">
                    <Image
                      src={profilePicture}
                      alt="Profile Picture"
                      fill
                      className="object-cover transition-transform duration-200 ease-in-out"
                    />

                    {/* Edit button overlay - visible on hover */}
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
                  </div>

                  {/* Edit button that appears outside the profile picture for mobile */}
                  {/* <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePictureUpload();
                    }}
                    className=" absolute -bottom-0.5 md:-bottom-1 right-1.5 bg-[#ea4197] rounded-full p-1 shadow-lg"
                  >
                    <FiEdit2 className="text-white text-xs" />
                  </button> */}

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
                  <h1 className="text-2xl md:text-2xl font-pop font-bold text-white mb-1.5">
                    @{mockUserData.username}
                  </h1>

                  <div className="flex flex-wrap gap-4 justify-center md:justify-start lg:mb-4 mb-4">
                    <div className="text-white/70">
                      <span className="text-white font-bold">
                        {mockUserData.followers}
                      </span>{" "}
                      Subscribers
                    </div>
                    <div className="text-white/70">
                      <span className="text-white font-bold">
                        {mockUserData.totalUploads}
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
                                setBio(mockUserData.bio);
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
                        className="p-3 bg-[#1a1a1a] border border-[#2a2a2a] border-dashed rounded-lg hover:border-[#3a3a3a] cursor-text"
                        onClick={() => setIsEditingBio(true)}
                      >
                        {bio ? (
                          <p className="text-white/80 text-sm md:text-base">
                            {bio}
                          </p>
                        ) : (
                          <p className="text-white/40 text-sm md:text-base italic">
                            Add a bio to your profile...
                          </p>
                        )}
                      </div>
                    )}
                    <div className="flex items-center justify-end mt-2.5">
                      {/* <h3 className="text-[#ea4197] text-sm font-semibold">Bio</h3> */}
                      {!isEditingBio && (
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
            <div className="bg-[#0e0e0e] border border-[#2b2b2b] rounded-xl p-6">
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
                            {mockUserData.totalViews.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/70">Total Likes</span>
                          <span className="text-white font-medium">
                            {mockUserData.totalLikes.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/70">Uploads</span>
                          <span className="text-white font-medium">
                            {mockUserData.totalUploads}
                          </span>
                        </div>
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
                            @{mockUserData.username}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/70">Member Since</span>
                          <span className="text-white font-medium">
                            {mockUserData.joinDate}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/70">Email</span>
                          <span className="text-white font-medium">
                            user***@example.com
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#151515] rounded-lg p-5 border border-[#272727]">
                    <h3 className="text-lg font-medium mb-4 text-[#ea4197]">
                      Recent Activity
                    </h3>
                    <div className="text-center py-8">
                      <p className="text-white/50">
                        Your recent activity will appear here
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "videos" && (
                <div className={`transition-opacity duration-300 ease-in-out ${fadeInOut ? "opacity-0" : "opacity-100"}`}>
                  <h2 className="text-xl font-semibold mb-4 text-white/90">
                    Uploaded Videos
                  </h2>
                  <div className="text-center py-16">
                    <div className="inline-block p-4 rounded-full bg-[#1a1a1a] mb-4">
                      <RiVideoLine size={40} className="text-[#ea4197]" />
                    </div>
                    <h3 className="text-lg font-medium mb-2">
                      No videos uploaded yet
                    </h3>
                    <p className="text-white/50 max-w-md mx-auto">
                      Your uploaded videos will appear here. Start uploading to
                      grow your channel!
                    </p>
                  </div>
                </div>
              )}

              {activeTab === "images" && (
                <div className={`transition-opacity duration-300 ease-in-out ${fadeInOut ? "opacity-0" : "opacity-100"}`}>
                  <h2 className="text-xl font-semibold mb-4 text-white/90">
                    Uploaded Images
                  </h2>
                  <div className="text-center py-16">
                    <div className="inline-block p-4 rounded-full bg-[#1a1a1a] mb-4">
                      <RiImageLine size={40} className="text-[#ea4197]" />
                    </div>
                    <h3 className="text-lg font-medium mb-2">
                      No images uploaded yet
                    </h3>
                    <p className="text-white/50 max-w-md mx-auto">
                      Your uploaded images will appear here. Share your best
                      content with the community!
                    </p>
                  </div>
                </div>
              )}

              {activeTab === "subscriptions" && (
                <div className={`transition-opacity duration-300 ease-in-out ${fadeInOut ? "opacity-0" : "opacity-100"}`}>
                  <h2 className="text-xl font-semibold mb-4 text-white/90">
                    Subscriptions
                  </h2>
                  <div className="text-center py-16">
                    <div className="inline-block p-4 rounded-full bg-[#1a1a1a] mb-4">
                      <TbUsers size={40} className="text-[#ea4197]" />
                    </div>
                    <h3 className="text-lg font-medium mb-2">
                      No subscriptions yet
                    </h3>
                    <p className="text-white/50 max-w-md mx-auto">
                      Channels you subscribe to will appear here. Discover
                      creators and subscribe to see their content!
                    </p>
                  </div>
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
                      Videos and images you like will appear here. Start
                      exploring and liking content!
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Logout button at the bottom on mobile */}
            <div className="md:hidden mt-6 mb-20">
              <button
                className="flex items-center justify-center w-full gap-2 px-4 py-3 rounded-lg text-red-400 bg-[#1a1a1a] hover:bg-[#252525]"
                onClick={() => console.log("Logout clicked")}
              >
                <FiLogOut className="mr-1" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
