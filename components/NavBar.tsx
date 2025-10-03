/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { FiSearch, FiMenu, FiX } from "react-icons/fi";
import { FaUserAlt, FaRegUser, FaRandom, FaHeart,  FaUser, FaClock, FaTrophy, FaCompass, FaMagic } from "react-icons/fa";
import { RiVideoUploadFill, RiVideoUploadLine } from "react-icons/ri";
import { IoSearchSharp } from "react-icons/io5";
import { FaRegImage } from "react-icons/fa6";
import AuthModel from './authModel';
import UploadModal from './UploadModal';
import Link from "next/link";
import { useRouter } from "next/navigation";
import config from "../config.json";
import useUserAvatar from '../hooks/useUserAvatar';

const NavBar = ({user, setUser, showCategories = true, activeCategory, setActiveCategory}: {
  user?: any; 
  setUser?: (user: any) => void; 
  showCategories?: boolean;
  activeCategory?: string;
  setActiveCategory?: (category: string) => void;
}) => {
  const router = useRouter();
  const [isMobile, setIsMobile] = useState(false);
  const [localActiveCategory, setLocalActiveCategory] = useState("discover");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const mobileSearchInputRef = useRef<HTMLInputElement>(null);
  const desktopSearchInputRef = useRef<HTMLInputElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const { avatarUrl } = useUserAvatar(user) as { avatarUrl: string; isLoading: boolean };
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [showStickyNav, setShowStickyNav] = useState(false);
  const [stickyNavOpacity, setStickyNavOpacity] = useState(0);

  const handleScroll = useCallback(() => {
    const currentScrollY = window.scrollY;

    if (currentScrollY > 150) {
      if (!showStickyNav) {
        setShowStickyNav(true);
        setIsVisible(false);
        setStickyNavOpacity(1); 
      }

      if (currentScrollY > lastScrollY && currentScrollY > 200) {
        setIsVisible(false);
      } else if (currentScrollY < lastScrollY) {
        setIsVisible(true);
        setStickyNavOpacity(1);
      }
    } else {
      if (showStickyNav) {
        const fadeThreshold = 70;
        const fadeOpacity = Math.max(0, currentScrollY / fadeThreshold);
        setStickyNavOpacity(fadeOpacity);

        if (currentScrollY <= 50) {
          setShowStickyNav(false);
          setIsVisible(true);
          setStickyNavOpacity(0);
        }
      }
    }
    
    setLastScrollY(currentScrollY);
  }, [lastScrollY, showStickyNav]);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [handleScroll]);

  useEffect(() => {
    const checkAuthentication = async () => {
      setIsAuthChecking(true);
      try {
        const token = localStorage.getItem('token');

        if (!token) {
          setIsAuthChecking(false);
          return;
        }

        const response = await fetch(`${config.url}/api/check`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token }),
        });

        const data = await response.json();

        if (data.success && data.user) {
          if (setUser) {
            setUser(data.user);
            // console.log("User authenticated:", data.user);
          }
        }
      } catch (error) {
        console.error("Authentication check failed:", error);
      } finally {
        setIsAuthChecking(false);
      }
    }

    checkAuthentication();
  }, []);

  useEffect(() => {
    router.prefetch("/");
    router.prefetch("/profile");
    router.prefetch("/search");
  }, [router]);

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

  const handleProfileNavigation = useCallback(() => {
    if (isAuthChecking) return;
    
    if (user) {
      router.push("/profile");
    } else{
      setShowAuthModal(true);
    }
  }, [isAuthChecking, user, router]);

  const handleUploadNavigation = useCallback(() => {
    if (isAuthChecking) return;
    
    if (user) {
      setShowUploadModal(true);
    } else {
      setShowAuthModal(true);
    }
  }, [isAuthChecking, user]);

  const handleUndressNavigation = useCallback(() => {
    window.open("https://pornworks.com/?refid=goonproject", "_blank");
  }, []);

  const handleSearchSubmit = useCallback((searchTerm: string) => {
    if (searchTerm.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchTerm.trim())}`);
    }
  }, [router]);

  const focusSearchInput = useCallback((isMobileView: boolean) => {
    if (isMobileView) {
      mobileSearchInputRef.current?.focus();
    } else {
      desktopSearchInputRef.current?.focus();
    }
  }, []);

  const handleCategoryNavigation = useCallback((categoryId: string) => {
    if (categoryId === "discover") {
      router.push("/");
    } else {
      router.push(`/?category=${categoryId}`);
    }

    if (window.location.pathname === '/') {
      if (setActiveCategory) {
        setActiveCategory(categoryId);
      } else {
        setLocalActiveCategory(categoryId);
      }
    }
  }, [router, setActiveCategory]);

  const handleCategoryHover = useCallback((categoryId: string) => {
    if (categoryId === "discover") {
      router.prefetch("/");
    } else {
      router.prefetch(`/?category=${categoryId}`);
    }
  }, [router]);

  const categories = useMemo(() => [
    { id: "discover", name: "Discover", icon: <FaCompass /> },
    { id: "images", name: "Images", icon: <FaRegImage /> },
    { id: "top", name: "Top Videos", icon: <FaTrophy /> },
    { id: "recent", name: "Recently Added", icon: <FaClock /> },
    { id: "liked", name: "Most Liked", icon: <FaHeart /> },
    { id: "random", name: "Random", icon: <FaRandom /> },
    { id: "subscriptions", name: "Subscriptions", icon: <FaUser /> },
  ], []);

  const currentActiveCategory = activeCategory || localActiveCategory;

  // Independent Search Input Component with its own state
  const SearchInput = React.memo(({ 
    isMobile, 
    inputRef, 
    isSticky,
    onSubmit
  }: {
    isMobile: boolean;
    inputRef: React.RefObject<HTMLInputElement | null>;
    isSticky?: boolean;
    onSubmit: (searchTerm: string) => void;
  }) => {
    const [searchValue, setSearchValue] = useState("");
    
    const handleSearchKeyPress = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        onSubmit(searchValue);
        setSearchValue("");
      }
    };
    
    return (
      <div className={`${isMobile ? 'w-full mb-4' : 'flex-1 max-w-xl mx-4 px-2'}`}>
        <div 
          className={`flex items-center w-full border border-[#1f1f1f] bg-[#101010] ${
            isMobile 
              ? 'rounded-lg py-2 px-3 text-sm focus-within:shadow-[0_0_15px_rgba(234,65,151,0.1)]' 
              : 'rounded-full py-2 sm:py-3 px-3 sm:px-5 text-sm focus-within:shadow-[0_0_15px_rgba(234,65,151,0.085)]'
          } transition-all ease-in-out duration-200 cursor-text`}
          onClick={() => inputRef.current?.focus()}
        >
          <FiSearch className="text-[#939393] text-lg min-w-[20px]" />
          <input
            ref={inputRef}
            type="text"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Search GoonChan..."
            className={`flex-1 text-[1rem] bg-transparent ${
              isMobile ? 'ml-2' : 'ml-2 sm:ml-3'
            } text-[#c0c0c0] placeholder-[#808080] focus:outline-none truncate [&::-webkit-search-cancel-button]:appearance-none`}
            onKeyDown={handleSearchKeyPress}
          />
          {searchValue && (
            <button
              onClick={(e) => {
                e.stopPropagation(); 
                setSearchValue("");
                inputRef.current?.focus();
              }}
              className="focus:outline-none"
            >
              <FiX className={`text-[#ea4198a5] hover:text-[#ff61b7] text-lg cursor-pointer ${
                !isMobile ? 'ml-2' : ''
              }`} />
            </button>
          )}
        </div>
      </div>
    );
  });

  SearchInput.displayName = 'SearchInput';

  const NavbarContent = React.memo(({ isSticky = false }: { isSticky?: boolean }) => (
    <div className="max-w-[79rem] px-4 lg:px-2 mx-auto">
      {isMobile ? (
        <div className="flex flex-col md:hidden">
          <div className="relative h-[4rem] flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <FiMenu 
                size={24} 
                className="text-[#c2c2c2] cursor-pointer hover:text-white transition-colors duration-200" 
                onClick={() => setIsSidebarOpen(true)}
              />
              <IoSearchSharp 
                size={24} 
                className="text-[#c2c2c2] font-bold cursor-pointer hover:text-white transition-colors duration-200" 
                onClick={() => focusSearchInput(true)}
              />
            </div>

            <Link href="/" prefetch={true} className="absolute left-1/2 transform -translate-x-1/2 flex items-center cursor-pointer">
              <img
                src="/logo.webp"
                alt="GoonChan Logo"
                className="rounded-full opacity-95"
                style={{ width: '30px', height: '30px' }}
              />
              <h1 className="font-inter text-xl font-semibold text-white ml-[0.42rem]">
                Goon<span className="text-[#ea4197]">Chan</span>
              </h1>
            </Link>

            <div className="flex items-center space-x-5">
              <RiVideoUploadLine 
                size={22} 
                className="text-[#c2c2c2] cursor-pointer"
                onClick={handleUploadNavigation}
              />
              {user && (user.avatar || avatarUrl) ? (
                <div 
                  className="cursor-pointer" 
                  onClick={handleProfileNavigation}
                  onTouchStart={() => router.prefetch("/profile")}
                >
                  <img
                    src={user.avatar || avatarUrl}
                    alt={user.username || "User Avatar"}
                    className="rounded-full object-cover"
                    style={{ width: '25px', height: '25px' }}
                  />
                </div>
              ) : (
                <FaRegUser
                  size={20}
                  className="text-[#c2c2c2] cursor-pointer"
                  onClick={handleProfileNavigation}
                  onTouchStart={() => router.prefetch("/profile")}
                />
              )}
            </div>
          </div>

          <SearchInput 
            isMobile={true}
            inputRef={mobileSearchInputRef}
            isSticky={false}
            onSubmit={handleSearchSubmit}
          />
        </div>
      ) : (
        // Desktop Layout
        <div className="hidden md:flex flex-col">
          <div className="relative mt-[1.6rem] mb-[0.95rem] flex justify-between items-center">
            <Link href={"/"} prefetch={true} className="flex items-center cursor-pointer hover:opacity-90 transition-all ease-out space-x-2">
              <img
                src="/logo.webp"
                alt="GoonChan Logo"
                className="rounded-full opacity-95"
                style={{ width: '34px', height: '34px' }}
              />
              <h1 className="font-inter text-2xl font-semibold text-white hidden sm:block">
                Goon<span className="text-[#ea4197]">Chan</span>
              </h1>
            </Link>

            <SearchInput 
              isMobile={false}
              inputRef={desktopSearchInputRef}
              isSticky={showStickyNav}
              onSubmit={handleSearchSubmit}
            />

            <div className="flex items-center space-x-3 sm:space-x-4">
              <button 
                onClick={handleUndressNavigation}
                className="flex items-center cursor-pointer justify-center bg-[#d97b00] hover:bg-[#e68200] hover:scale-[1.03] duration-200 transition-all ease-out text-[#202020] group rounded-full p-2 sm:py-2 sm:px-4"
              >
                <FaMagic size={18} />
                <span className="font-pop font-semibold hidden sm:ml-2 md:inline">
                  Undress Her
                </span>
              </button>

              <button 
                onClick={handleUploadNavigation}
                className="flex items-center cursor-pointer justify-center bg-[#ec4c9ef2] hover:scale-[1.03] duration-200 transition-all ease-out text-[#202020] group rounded-full p-2 sm:py-2 sm:px-4"
              >
                <RiVideoUploadFill size={20} />
                <span className="font-pop font-semibold hidden sm:ml-2 md:inline">
                  Upload
                </span>
              </button>

              <div 
                className="cursor-pointer" 
                onClick={handleProfileNavigation}
                onMouseEnter={() => router.prefetch("/profile")}
              >
                <div className={`group hover:scale-[1.05] transition-scale bg-[#181818] ${user && (user.avatar || avatarUrl) ? "border-2 border-[#323232]" : "p-[0.55rem] border-2 border-[#595959]"} rounded-full flex items-center justify-center overflow-hidden`}>
                  {user && (user.avatar || avatarUrl) ? (
                    <img
                      src={user.avatar || avatarUrl}
                      alt={user.username || "User Avatar"}
                      className="rounded-full object-cover"
                      style={{ width: '41px', height: '41px' }}
                    />
                  ) : (
                    <FaUserAlt
                      size={18}
                      className="text-[#c2c2c2] group-hover:text-[#cfcfcf]"
                    />
                  )}
                </div>
              </div>
            </div>
          </div>

          {!isMobile && showCategories && !isSticky && (
            <div className="categories-nav py-2 mb-2 overflow-x-auto scrollbar-hide hidden md:block [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              <div className="flex items-center justify-between w-full gap-1">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => handleCategoryNavigation(category.id)}
                    onMouseEnter={() => handleCategoryHover(category.id)}
                    className={`
                      flex-1 cursor-pointer transition-all ease-out duration-300 whitespace-nowrap transform
                      
                      lg:flex lg:flex-row lg:items-center lg:justify-center lg:px-3 lg:py-[0.6rem] lg:rounded-full
                      lg:hover:scale-[1.05] lg:transform-gpu lg:mx-0.5
                      ${currentActiveCategory === category.id 
                        ? 'lg:bg-[#dc2b87d2] lg:text-white lg:font-medium lg:shadow-[0_6px_20px_rgba(234,65,151,0.01)] lg:scale-[1.02]' 
                        : 'lg:bg-[#151515] lg:hover:bg-[#1c1c1c] lg:text-[#b3b3b3] lg:hover:text-white lg:hover:shadow-[0_4px_12px_rgba(255,255,255,0.01)]'}
                       
                      md:flex md:flex-row md:items-center md:justify-center md:px-2 md:py-1.5
                      md:hover:text-white md:mx-0.5 md:hover:scale-[1.02]
                      ${currentActiveCategory === category.id 
                        ? 'md:text-[#ea4197] md:font-medium md:scale-[1.02]' 
                        : 'md:text-[#b3b3b3]'}
                      
                      flex flex-col items-center justify-center px-1 py-1
                      hover:text-white mx-0.5 hover:scale-[1.02]
                      ${currentActiveCategory === category.id 
                        ? 'text-[#ea4197] font-medium scale-[1.02]' 
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
  ));

  NavbarContent.displayName = 'NavbarContent';

  return (
    <>
      {showAuthModal && <AuthModel setShowAuthModel={setShowAuthModal} setUser={setUser} />}
      {showUploadModal && <UploadModal setShowUploadModal={setShowUploadModal} user={user} />}

      {user && user.isBanned && (
        <div className="fixed inset-0 z-[9999] bg-[#0a0a0a] flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-[#121212] border-2 border-red-500/30 rounded-2xl p-8 text-center shadow-2xl">
            <div className="mb-6">
              <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg 
                  className="w-10 h-10 text-red-500" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
                  />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">Banned from GoonChan</h1>
              <div className="w-16 h-1 bg-red-500 mx-auto rounded-full"></div>
            </div>
            
            <p className="text-[#b3b3b3] text-base mb-6 leading-relaxed">
              You have been banned from GoonChan and you cannot access any of our services.
            </p>

            <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl p-4 mb-6">
              {/* <p className="text-white font-semibold mb-2 text-sm">Want to appeal?</p> */}
              <p className="text-[#999] text-sm mb-3">Submit an appeal ticket on our Discord server</p>
              <a 
                href="https://discord.gg/fAVnfMGDh6" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center w-full bg-[#5865F2] hover:bg-[#4752C4] text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200"
              >
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
                </svg>
                Join Discord Server
              </a>
            </div>
          </div>
        </div>
      )}

      {isMobile && (
        <>
          {/* Backdrop overlay */}
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
                <Link href="/" prefetch={true} className="flex items-center" onClick={() => setIsSidebarOpen(false)}>
                  <img
                    src="/logo.webp"
                    alt="GoonChan Logo"
                    className="rounded-full opacity-95"
                    style={{ width: '32px', height: '32px' }}
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
                        handleCategoryNavigation(category.id);
                        setIsSidebarOpen(false);
                      }}
                      onTouchStart={() => handleCategoryHover(category.id)}
                      className={`
                        flex items-center p-3 rounded-lg transition-all duration-300 ease-out
                        ${currentActiveCategory === category.id 
                          ? 'bg-[#ea4197]/15 text-[#ea4197] shadow-lg' 
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
                  <button 
                    onClick={() => {
                      handleProfileNavigation();
                      setIsSidebarOpen(false);
                    }}
                    className="flex items-center p-3 rounded-lg text-[#c2c2c2] hover:bg-[#ffffff10] hover:text-white transition-all duration-200"
                  >
                    <FaUserAlt className="text-lg mr-4" />
                    <span className="font-medium">Profile</span>
                  </button>
                  <button 
                    onClick={() => {
                      handleUndressNavigation();
                      setIsSidebarOpen(false);
                    }}
                    className="flex items-center p-3 rounded-lg text-[#ff9000] hover:bg-[#ff9000]/20 hover:text-[#ffab33] transition-all duration-200"
                  >
                    <FaMagic className="text-lg mr-4" />
                    <span className="font-medium">Undress Her</span>
                  </button>
                  <button 
                    onClick={() => {
                      handleUploadNavigation();
                      setIsSidebarOpen(false);
                    }}
                    className="flex items-center p-3 rounded-lg text-[#c2c2c2] hover:bg-[#ffffff10] hover:text-white transition-all duration-200"
                  >
                    <RiVideoUploadFill className="text-lg mr-4" />
                    <span className="font-medium">Upload Video</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      <nav className="relative z-20 bg-[#080808]/95 backdrop-blur-md">
        <NavbarContent isSticky={false} />
      </nav>

      {showStickyNav && (
        <nav 
          className={`
            fixed top-0 left-0 right-0 z-30 bg-[#080808]/95 backdrop-blur-md
            transition-all duration-250 ease-out
            ${isVisible ? 'translate-y-0' : '-translate-y-full'}
          `}
          style={{ opacity: stickyNavOpacity }}
        >
          <NavbarContent isSticky={true} />
        </nav>
      )}
    </>
  );
};

export default NavBar;
