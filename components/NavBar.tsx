"use client";
import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { FiSearch, FiMenu, FiX } from "react-icons/fi";
import { FaUserAlt, FaRegUser, FaRandom, FaHeart, FaFire, FaPlay, FaList, FaUser, FaClock, FaTrophy, FaCompass } from "react-icons/fa";
import { RiVideoUploadFill, RiVideoUploadLine } from "react-icons/ri";
import { IoSearchSharp } from "react-icons/io5";
import Link from "next/link";

const NavBar = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [activeCategory, setActiveCategory] = useState("discover");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const mobileSearchInputRef = useRef<HTMLInputElement>(null);
  const desktopSearchInputRef = useRef<HTMLInputElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    handleResize();

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // Close sidebar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node) && isSidebarOpen) {
        setIsSidebarOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSidebarOpen]);

  useEffect(() => {
    if (isSidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isSidebarOpen]);

  const [screenSize, setScreenSize] = useState({
    isLg: false,
    isMd: false,
    isSm: false
  });

  useEffect(() => {
    const handleScreenResize = () => {
      setScreenSize({
        isLg: window.innerWidth >= 1024,
        isMd: window.innerWidth >= 768 && window.innerWidth < 1024,
        isSm: window.innerWidth >= 640 && window.innerWidth < 768
      });
    };

    handleScreenResize();
    window.addEventListener("resize", handleScreenResize);

    return () => {
      window.removeEventListener("resize", handleScreenResize);
    };
  }, []);

  const focusSearchInput = (isMobileView: boolean) => {
    if (isMobileView) {
      mobileSearchInputRef.current?.focus();
    } else {
      desktopSearchInputRef.current?.focus();
    }
  };

  const categories = [
    { id: "discover", name: "Discover", icon: <FaCompass /> },
    { id: "top", name: "Top Videos", icon: <FaTrophy /> },
    // { id: "popular", name: "Popular Now", icon: <FaFire /> },
    { id: "recent", name: "Recently Added", icon: <FaClock /> },
    { id: "liked", name: "Most Liked", icon: <FaHeart /> },
    { id: "random", name: "Random", icon: <FaRandom /> },
    { id: "categories", name: "Categories", icon: <FaList /> },
    { id: "profiles", name: "Profiles", icon: <FaUser /> },
  ];

  return (
    <div className="max-w-[79rem] mx-auto px-4">
      {/* Mobile Sidebar */}
      {isMobile && (
        <>
          <div 
            className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300 ease-in-out ${
              isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
            onClick={() => setIsSidebarOpen(false)}
          ></div>
          
          <div 
            ref={sidebarRef}
            className={`fixed top-0 left-0 h-full w-[80%] max-w-[300px] bg-[#121212] z-50 shadow-xl transform transition-transform duration-300 ease-in-out ${
              isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
          >
            <div className="p-5 flex flex-col h-full">

              <div className="flex items-center justify-between mb-8">
                <Link href="/" className="flex items-center" onClick={() => setIsSidebarOpen(false)}>
                  <Image
                    src="/logo2.webp"
                    alt="GoonChan Logo"
                    width={32}
                    height={32}
                    className="rounded-full opacity-95"
                  />
                  <h1 className="font-inter text-xl font-semibold text-white ml-3">
                    Goon<span className="text-[#ea4197]">Chan</span>
                  </h1>
                </Link>
                <button 
                  onClick={() => setIsSidebarOpen(false)}
                  className="p-1 rounded-full hover:bg-[#2a2a2a] transition-colors duration-200"
                >
                  <FiX size={22} className="text-[#c2c2c2] hover:text-white" />
                </button>
              </div>

              <div className="mt-2">
                <h3 className="text-[#9e9e9e] text-xs font-medium uppercase tracking-wider mb-3 pl-2">Categories</h3>
                <div className="flex flex-col space-y-1">
                  {categories.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => {
                        setActiveCategory(category.id);
                        setIsSidebarOpen(false);
                      }}
                      className={`
                        flex items-center p-3 rounded-lg transition-all duration-200
                        ${activeCategory === category.id 
                          ? 'bg-[#ea4197]/10 text-[#ea4197]' 
                          : 'text-[#c2c2c2] hover:bg-[#ffffff10] hover:text-white'}
                      `}
                    >
                      <span className="text-xl mr-4">{category.icon}</span>
                      <span className="font-medium">{category.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-[#2a2a2a]">
                <h3 className="text-[#9e9e9e] text-xs font-medium uppercase tracking-wider mb-3 pl-2">Account</h3>
                <div className="flex flex-col space-y-1">
                  <button className="flex items-center p-3 rounded-lg text-[#c2c2c2] hover:bg-[#ffffff10] hover:text-white transition-all duration-200">
                    <FaUserAlt className="text-lg mr-4" />
                    <span className="font-medium">Profile</span>
                  </button>
                  <button className="flex items-center p-3 rounded-lg text-[#c2c2c2] hover:bg-[#ffffff10] hover:text-white transition-all duration-200">
                    <RiVideoUploadFill className="text-lg mr-4" />
                    <span className="font-medium">Upload Video</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {isMobile ? (
        <div className="flex flex-col">
          <div className="relative h-[4rem] flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <FiMenu 
                size={24} 
                className="text-[#c2c2c2] cursor-pointer hover:text-white transition-colors duration-200" 
                onClick={() => setIsSidebarOpen(true)}
              />
              <IoSearchSharp size={24} className="text-[#c2c2c2] font-bold cursor-pointer hover:text-white transition-colors duration-200" />
            </div>

            <Link href="/" className="absolute left-1/2 transform -translate-x-1/2 flex items-center cursor-pointer">
              <Image
                src="/logo2.webp"
                alt="GoonChan Logo"
                width={30}
                height={30}
                className="rounded-full opacity-95"
              />
              <h1 className="font-inter text-xl font-semibold text-white ml-[0.42rem]">
                Goon<span className="text-[#ea4197]">Chan</span>
              </h1>
            </Link>

            <div className="flex items-center space-x-5">
              <RiVideoUploadLine size={22} className="text-[#c2c2c2] cursor-pointer" />
              <FaRegUser
                size={20}
                className="text-[#c2c2c2] cursor-pointer"
              />
            </div>
          </div>

          <div className="w-full mb-4">
            <div 
              className="flex items-center w-full border border-[#1f1f1f] bg-[#101010] rounded-lg py-2 px-3 text-sm focus-within:shadow-[0_0_15px_rgba(234,65,151,0.1)] cursor-text"
              onClick={() => focusSearchInput(true)}
            >
              <FiSearch className="text-[#939393] text-lg min-w-[20px]" />
              <input
                ref={mobileSearchInputRef}
                type="text"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                placeholder="Search GoonChan..."
                className="flex-1 text-[1rem] bg-transparent ml-2 text-[#c0c0c0] placeholder-[#808080] focus:outline-none truncate [&::-webkit-search-cancel-button]:appearance-none"
              />
              {searchValue && (
                <button
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent the container's onClick from firing
                    setSearchValue("");
                    focusSearchInput(true);
                  }}
                  className="focus:outline-none"
                >
                  <FiX className="text-[#ea4198a5] hover:text-[#ff61b7] text-lg cursor-pointer" />
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        // Desktop Layout
        <div className="flex flex-col">
          <div className="relative mt-[1.6rem] mb-[0.95rem] flex justify-between items-center">
            <Link href={"/"} className="flex items-center cursor-pointer hover:opacity-90 hover:scale-[1.015] transition-all ease-out space-x-2">
              <Image
                src="/logo2.webp"
                alt="GoonChan Logo"
                width={37}
                height={37}
                className="rounded-full opacity-95"
              />
              <h1 className="font-inter text-2xl font-semibold text-white hidden sm:block">
                Goon<span className="text-[#ea4197]">Chan</span>
              </h1>
            </Link>

            <div className="flex-1 max-w-xl mx-4 px-2">
              <div 
                className="flex items-center w-full border border-[#1f1f1f] bg-[#101010] rounded-full py-2 sm:py-3 px-3 sm:px-5 text-sm focus-within:shadow-[0_0_15px_rgba(234,65,151,0.085)] transition-all ease-in-out duration-200 cursor-text"
                onClick={() => focusSearchInput(false)}
              >
                <FiSearch className="text-[#939393] text-lg min-w-[20px]" />
                <input
                  ref={desktopSearchInputRef}
                  type="text"
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  placeholder="Search GoonChan..."
                  className="flex-1 text-[1rem] bg-transparent ml-2 sm:ml-3 text-[#c0c0c0] placeholder-[#808080] focus:outline-none truncate [&::-webkit-search-cancel-button]:appearance-none"
                />
                {searchValue && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent the container's onClick from firing
                      setSearchValue("");
                      focusSearchInput(false);
                    }}
                    className="focus:outline-none"
                  >
                    <FiX className="text-[#ea4198a5] ml-2 hover:text-[#ff61b7] text-lg cursor-pointer" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-3 sm:space-x-4">
              <button className="flex items-center justify-center bg-[#ec4c9ef2] hover:scale-[1.03] duration-200 transition-all ease-out cursor-pointer text-[#202020] group rounded-full p-2 sm:py-2 sm:px-4">
                <RiVideoUploadFill size={20} />
                <span className="font-pop font-semibold hidden sm:ml-2 md:inline">Upload</span>
              </button>

              <div className="cursor-pointer">
                <div className="border-2 group border-[#595959] hover:scale-[1.05] transition-all bg-[#181818] p-[0.55rem] rounded-full flex items-center justify-center">
                  <FaUserAlt
                    size={18}
                    className="text-[#c2c2c2] group-hover:text-[#cfcfcf]"
                  />
                </div>
              </div>
            </div>
          </div>

          {!isMobile && (
            <div className="categories-nav py-2 mb-2 overflow-x-auto scrollbar-hide">
              <div className="flex items-center justify-between w-full gap-1">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setActiveCategory(category.id)}
                    className={`
                      flex-1 cursor-pointer transition-all ease-out duration-200 whitespace-nowrap
                      
                      ${/* Large screens - buttons with background */''}
                      lg:flex lg:flex-row lg:items-center lg:justify-center lg:px-3 lg:py-[0.6rem] lg:rounded-full
                      lg:hover:scale-[1.02] lg:transform-gpu lg:mx-0.5
                      ${activeCategory === category.id 
                        ? 'lg:bg-[#dc2b87d2] lg:text-white lg:font-medium lg:shadow-[0_4px_12px_rgba(234,65,151,0.1)]' 
                        : 'lg:bg-[#151515] lg:hover:bg-[#1c1c1c] lg:text-[#b3b3b3] lg:hover:text-white'}
                      
                      ${/* Medium screens - text with icons, no background */''}
                      md:flex md:flex-row md:items-center md:justify-center md:px-2 md:py-1.5
                      md:hover:text-white md:mx-0.5
                      ${activeCategory === category.id 
                        ? 'md:text-[#ea4197] md:font-medium' 
                        : 'md:text-[#b3b3b3]'}
                      
                      ${/* Small screens - icons above text */''}
                      flex flex-col items-center justify-center px-1 py-1
                      hover:text-white mx-0.5
                      ${activeCategory === category.id 
                        ? 'text-[#ea4197] font-medium' 
                        : 'text-[#b3b3b3]'}
                    `}
                  >
                    <div className="flex items-center justify-center">
                      <span className="lg:mr-2 md:mr-1.5 text-base sm:text-lg block mb-1 md:mb-0">{category.icon}</span>
                      <span className="text-[10px] sm:text-xs md:text-sm font-pop font-medium">{category.name}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NavBar;
