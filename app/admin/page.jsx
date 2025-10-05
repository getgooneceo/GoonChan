"use client";
import { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useNavBar } from "@/contexts/NavBarContext";
import { Toaster, toast } from "sonner";
import config from "@/config.json";
import { 
  FiBarChart, 
  FiUpload, 
  FiFlag, 
  FiSettings,
  FiLogOut,
  FiUsers,
  FiVideo,
  FiImage,
  FiEye,
  FiServer,
  FiDatabase,
  FiHardDrive,
  FiTrendingUp,
  FiExternalLink,
  FiMonitor,
  FiZap,
  FiSave,
  FiRotateCcw,
  FiX
} from "react-icons/fi";
import { 
  RiAdminLine,
  RiDashboardLine,
  RiVideoUploadLine,
  RiFlagLine,
  RiSettings3Line
} from "react-icons/ri";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';

// Placeholder data for the chart
const generateViewsData = (days) => {
  const data = [];
  const now = new Date();
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    
    // Generate realistic random data
    const baseViews = Math.floor(Math.random() * 1000) + 500;
    const weekendMultiplier = date.getDay() === 0 || date.getDay() === 6 ? 1.3 : 1;
    const views = Math.floor(baseViews * weekendMultiplier);
    
    data.push({
      date: date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        ...(days > 30 && { year: '2-digit' })
      }),
      fullDate: date.toLocaleDateString('en-US', { 
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      views: views
    });
  }
  
  return data;
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-[#1a1a1a] border border-[#333] rounded-lg p-3 shadow-xl">
        <p className="text-white font-medium text-sm">{data.fullDate}</p>
        <p className="text-[#ea4197] font-semibold">
          {payload[0].value.toLocaleString()} views
        </p>
      </div>
    );
  }
  return null;
};

const AdminPageContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, setUser, setConfig } = useNavBar();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("analytics");
  const [fadeInOut, setFadeInOut] = useState(false);
  const [selectedTimeRange, setSelectedTimeRange] = useState('7d');

  // Analytics State
  const [analyticsData, setAnalyticsData] = useState({
    totals: {
      users: 0,
      videos: 0,
      images: 0,
      views: 0,
      videoViews: 0,
      imageViews: 0
    },
    dailyViews: [],
    hasData: false
  });
  const [analyticsLoading, setAnalyticsLoading] = useState(true);

  // Blocked Keywords State
  const [blockedKeywords, setBlockedKeywords] = useState([]);
  const [newKeyword, setNewKeyword] = useState('');
  
  // Ad Settings State
  const [adSettings, setAdSettings] = useState({
    chaturbate1: { enabled: false, iframeUrl: '' },
    chaturbate2: { enabled: false, iframeUrl: '' },
    smartAd1: { enabled: false, iframeUrl: '' },
    smartAd2: { enabled: false, iframeUrl: '' },
    videoAd: { enabled: false, url: '' },
    popunderAd: { enabled: false, urls: [] },
    bannerAds: { 
      enabled: false, 
      ads: []
    },
    undressButton: {
      enabled: true,
      text: 'Undress Her',
      url: 'https://pornworks.com/?refid=goonproject'
    }
  });

  // Original settings for change tracking
  const [originalSettings, setOriginalSettings] = useState({
    blockedKeywords: [],
    adSettings: {
      chaturbate1: { enabled: false, iframeUrl: '' },
      chaturbate2: { enabled: false, iframeUrl: '' },
      smartAd1: { enabled: false, iframeUrl: '' },
      smartAd2: { enabled: false, iframeUrl: '' },
      videoAd: { enabled: false, url: '' },
      popunderAd: { enabled: false, urls: [] },
      bannerAds: { 
        enabled: false, 
        ads: []
      },
      undressButton: {
        enabled: true,
        text: 'Undress Her',
        url: 'https://pornworks.com/?refid=goonproject'
      }
    }
  });

  const [settingsLoading, setSettingsLoading] = useState(true);

  const [newPopunderUrl, setNewPopunderUrl] = useState('');
  const [showPopunderInput, setShowPopunderInput] = useState(false);
  const [newBannerLink, setNewBannerLink] = useState('');
  const [newBannerGif, setNewBannerGif] = useState('');
  const [showBannerInput, setShowBannerInput] = useState(false);

  const [banSearchQuery, setBanSearchQuery] = useState('');
  const [banSearchResults, setBanSearchResults] = useState([]);
  const [isBanSearching, setIsBanSearching] = useState(false);
  const [adminSearchQuery, setAdminSearchQuery] = useState('');
  const [adminSearchResults, setAdminSearchResults] = useState([]);
  const [isAdminSearching, setIsAdminSearching] = useState(false);
  const [bannedUsers, setBannedUsers] = useState([]);
  const [adminUsers, setAdminUsers] = useState([]);

  const hasUnsavedChanges = useMemo(() => {
    const currentKeywordsSorted = JSON.stringify([...blockedKeywords].sort());
    const originalKeywordsSorted = JSON.stringify([...(originalSettings.blockedKeywords || [])].sort());
    
    if (currentKeywordsSorted !== originalKeywordsSorted) {
      return true;
    }

    const currentAdSettingsStr = JSON.stringify(adSettings);
    const originalAdSettingsStr = JSON.stringify(originalSettings.adSettings);
    
    if (currentAdSettingsStr !== originalAdSettingsStr) {
      return true;
    }

    return false;
  }, [blockedKeywords, adSettings, originalSettings]);

  const ToggleSwitch = ({ enabled, onToggle, size = 'default' }) => {
    const sizeClasses = size === 'small' 
      ? 'w-8 h-4' 
      : 'w-10 h-5';
    const dotClasses = size === 'small' 
      ? 'w-3 h-3' 
      : 'w-4 h-4';

    return (
      <button
        onClick={onToggle}
        className={`${sizeClasses} rounded-full relative transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#ea4197]/30 cursor-pointer ${
          enabled 
            ? 'bg-[#ea4197] shadow-inner' 
            : 'bg-[#2a2a2a] hover:bg-[#333]'
        }`}
      >
        <div
          className={`${dotClasses} bg-white rounded-full shadow transition-transform duration-300 ease-in-out ${
            enabled ? 'translate-x-5' : 'translate-x-0.5'
          } ${size === 'small' && enabled ? 'translate-x-4' : ''} ${size === 'small' && !enabled ? 'translate-x-0.5' : ''}`}
        />
      </button>
    );
  };

  const adminCategories = [
    { id: "analytics", label: "Analytics", icon: <RiDashboardLine /> },
    { id: "admin-settings", label: "Admin Settings", icon: <RiSettings3Line /> },
    { id: "manage-users", label: "Manage Users", icon: <FiUsers /> },
    { id: "video-reupload", label: "Video Reupload", icon: <RiVideoUploadLine /> },
    { id: "user-reports", label: "User Reports", icon: <RiFlagLine /> },
  ];

  const timeRanges = [
    { id: '7d', label: '7D', days: 7 },
    { id: '30d', label: '30D', days: 30 },
    { id: '1y', label: '1Y', days: 365 }
  ];

  const getViewsData = () => {
    const range = timeRanges.find(r => r.id === selectedTimeRange);
    const now = new Date();
    const cutoffDate = new Date(now);
    cutoffDate.setDate(cutoffDate.getDate() - range.days);
    
    if (!analyticsData.hasData || analyticsData.dailyViews.length === 0) {
      // No data at all - return padding for all days
      const paddingData = [];
      for (let i = range.days - 1; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        paddingData.push({
          date: date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric',
            ...(range.days > 30 && { year: '2-digit' })
          }),
          fullDate: date.toLocaleDateString('en-US', { 
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          }),
          views: 100
        });
      }
      return paddingData;
    }
    
    // Filter real data by selected time range
    const realData = analyticsData.dailyViews
      .filter(entry => new Date(entry.date) >= cutoffDate)
      .map(entry => ({
        date: new Date(entry.date).toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric',
          ...(range.days > 30 && { year: '2-digit' })
        }),
        fullDate: entry.fullDate,
        views: entry.views,
        realDate: new Date(entry.date)
      }))
      .sort((a, b) => a.realDate - b.realDate);

    if (realData.length > 0) {
      const firstRealDataDate = realData[0].realDate;
      const result = [];

      for (let i = range.days - 1; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        
        if (date < firstRealDataDate) {
          result.push({
            date: date.toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric',
              ...(range.days > 30 && { year: '2-digit' })
            }),
            fullDate: date.toLocaleDateString('en-US', { 
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            }),
            views: 100
          });
        }
      }
      
      // Add real data
      realData.forEach(entry => {
        result.push({
          date: entry.date,
          fullDate: entry.fullDate,
          views: entry.views
        });
      });
      
      return result;
    }
    
    return realData;
  };

  const fetchAdminData = async () => {
    try {
      setAnalyticsLoading(true);
      setSettingsLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${config.url}/api/admin/data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      const result = await response.json();
      
      if (result.success) {
        const { analytics, settings, userManagement } = result.data;
        
        // Set analytics data
        setAnalyticsData(analytics);
        
        // Set settings data
        setBlockedKeywords(settings.blockedKeywords || []);
        setAdSettings(settings.adSettings || {});
        
        // Set original settings for change tracking
        const originalSettingsCopy = {
          blockedKeywords: [...(settings.blockedKeywords || [])],
          adSettings: JSON.parse(JSON.stringify(settings.adSettings || {}))
        };
        setOriginalSettings(originalSettingsCopy);
        
        // Set user management data
        setBannedUsers(userManagement.bannedUsers || []);
        setAdminUsers(userManagement.adminUsers || []);
      } else {
        toast.error('Failed to load admin data');
      }
    } catch (error) {
      console.error('Failed to fetch admin data:', error);
      toast.error('Failed to load admin data');
    } finally {
      setAnalyticsLoading(false);
      setSettingsLoading(false);
    }
  };

  const addKeyword = () => {
    if (newKeyword.trim() && !blockedKeywords.includes(newKeyword.trim().toLowerCase())) {
      setBlockedKeywords([...blockedKeywords, newKeyword.trim().toLowerCase()]);
      setNewKeyword('');
      // setHasUnsavedChanges(true); // This will be handled by useMemo
    }
  };

  const removeKeyword = (keyword) => {
    setBlockedKeywords(blockedKeywords.filter(k => k !== keyword));
    // setHasUnsavedChanges(true); // This will be handled by useMemo
  };

  // Helper functions for ad settings
  const toggleAdEnabled = (adType) => {
    setAdSettings(prev => ({
      ...prev,
      [adType]: { ...prev[adType], enabled: !prev[adType].enabled }
    }));
    // setHasUnsavedChanges(true); // This will be handled by useMemo
  };

  const updateAdUrl = (adType, urlType, value) => {
    setAdSettings(prev => ({
      ...prev,
      [adType]: { ...prev[adType], [urlType]: value }
    }));
    // setHasUnsavedChanges(true); // This will be handled by useMemo
  };

  const addPopunderUrl = () => {
    if (newPopunderUrl.trim()) {
      setAdSettings(prev => ({
        ...prev,
        popunderAd: {
          ...prev.popunderAd,
          urls: [...prev.popunderAd.urls, newPopunderUrl.trim()]
        }
      }));
      setNewPopunderUrl('');
      setShowPopunderInput(false);
      // setHasUnsavedChanges(true); // This will be handled by useMemo
    }
  };

  const removePopunderUrl = (index) => {
    setAdSettings(prev => ({
      ...prev,
      popunderAd: {
        ...prev.popunderAd,
        urls: prev.popunderAd.urls.filter((_, i) => i !== index)
      }
    }));
    // setHasUnsavedChanges(true); // This will be handled by useMemo
  };

  const addBannerAd = () => {
    if (newBannerLink.trim() && newBannerGif.trim()) {
      setAdSettings(prev => ({
        ...prev,
        bannerAds: {
          ...prev.bannerAds,
          ads: [...prev.bannerAds.ads, { link: newBannerLink.trim(), gif: newBannerGif.trim() }]
        }
      }));
      setNewBannerLink('');
      setNewBannerGif('');
      setShowBannerInput(false);
      // setHasUnsavedChanges(true); // This will be handled by useMemo
    }
  };

  const removeBannerAd = (index) => {
    setAdSettings(prev => ({
      ...prev,
      bannerAds: {
        ...prev.bannerAds,
        ads: prev.bannerAds.ads.filter((_, i) => i !== index)
      }
    }));
    // setHasUnsavedChanges(true); // This will be handled by useMemo
  };

  // User Management Functions
  const searchUsers = async (query) => {
    if (!query.trim() || query.length < 3) {
      return [];
    }
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${config.url}/api/admin/users/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, query }),
      });

      const data = await response.json();
      
      if (data.success) {
        return data.users;
      }
      return [];
    } catch (error) {
      console.error('Failed to search users:', error);
      return [];
    }
  };

  const searchBanUsers = async (query) => {
    if (!query.trim() || query.length < 3) {
      setBanSearchResults([]);
      return;
    }
    
    setIsBanSearching(true);
    const results = await searchUsers(query);
    setBanSearchResults(results);
    setIsBanSearching(false);
  };

  const searchAdminUsers = async (query) => {
    if (!query.trim() || query.length < 3) {
      setAdminSearchResults([]);
      return;
    }
    
    setIsAdminSearching(true);
    const results = await searchUsers(query);
    setAdminSearchResults(results);
    setIsAdminSearching(false);
  };

  const banUser = async (user) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${config.url}/api/admin/users/ban`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, userId: user._id }),
      });

      const data = await response.json();
      
      if (data.success) {
        if (!bannedUsers.find(u => u._id === user._id)) {
          setBannedUsers(prev => [...prev, user]);
        }
        toast.success(`${user.username} has been banned`);
      } else {
        toast.error(data.message || 'Failed to ban user');
      }
    } catch (error) {
      console.error('Failed to ban user:', error);
      toast.error('Failed to ban user');
    }
    setBanSearchResults([]);
    setBanSearchQuery('');
  };

  const unbanUser = async (userId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${config.url}/api/admin/users/unban`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, userId }),
      });

      const data = await response.json();
      
      if (data.success) {
        const user = bannedUsers.find(u => u._id === userId);
        setBannedUsers(prev => prev.filter(u => u._id !== userId));
        if (user) {
          toast.success(`${user.username} has been unbanned`);
        }
      } else {
        toast.error(data.message || 'Failed to unban user');
      }
    } catch (error) {
      console.error('Failed to unban user:', error);
      toast.error('Failed to unban user');
    }
  };

  const addAdmin = async (user) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${config.url}/api/admin/users/add-admin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, userId: user._id }),
      });

      const data = await response.json();
      
      if (data.success) {
        if (!adminUsers.find(u => u._id === user._id)) {
          setAdminUsers(prev => [...prev, user]);
        }
        toast.success(`${user.username} has been granted admin privileges`);
      } else {
        toast.error(data.message || 'Failed to add admin');
      }
    } catch (error) {
      console.error('Failed to add admin:', error);
      toast.error('Failed to add admin');
    }
    setAdminSearchResults([]);
    setAdminSearchQuery('');
  };

  const removeAdmin = async (userId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${config.url}/api/admin/users/remove-admin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, userId }),
      });

      const data = await response.json();
      
      if (data.success) {
        const user = adminUsers.find(u => u._id === userId);
        setAdminUsers(prev => prev.filter(u => u._id !== userId));
        if (user) {
          toast.success(`Admin privileges removed from ${user.username}`);
        }
      } else {
        toast.error(data.message || 'Failed to remove admin');
      }
    } catch (error) {
      console.error('Failed to remove admin:', error);
      toast.error('Failed to remove admin');
    }
  };



  // Save and Reset functions
  const saveChanges = async () => {
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${config.url}/api/admin/settings/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          token,
          settings: {
            blockedKeywords,
            adSettings
          }
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        // Update original settings to match current
        const newOriginalSettings = {
          blockedKeywords: [...blockedKeywords],
          adSettings: JSON.parse(JSON.stringify(adSettings))
        };
        setOriginalSettings(newOriginalSettings);
        
        toast.success('Changes saved successfully!');
      } else {
        toast.error(data.message || 'Failed to save settings');
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast.error('Failed to save settings');
    }
  };

  const resetChanges = () => {
    // Reset to original settings
    if (originalSettings.blockedKeywords) {
      setBlockedKeywords([...originalSettings.blockedKeywords]);
    }
    if (originalSettings.adSettings) {
      setAdSettings(JSON.parse(JSON.stringify(originalSettings.adSettings)));
    }
  };

  const handleTabChange = (tabId) => {
    if (activeTab === tabId) return;

    if (tabId === "user-reports") {
      router.push('/reports');
      return;
    }

    if (tabId === "video-reupload") {
      router.push('/something');
      return;
    }

    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tabId);
    router.push(`/admin?${params.toString()}`, { scroll: false });

    setFadeInOut(true);

    setTimeout(() => {
      setActiveTab(tabId);
      setTimeout(() => {
        setFadeInOut(false);
      }, 80);
    }, 35);
  };

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
          
          // Fetch all admin data in one request
          await fetchAdminData();
          
          const tabParam = searchParams.get('tab');
          if (tabParam && adminCategories.some(cat => cat.id === tabParam)) {
            setActiveTab(tabParam);
          }
        } else {
          router.push('/');
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        router.push('/');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router, searchParams]);

  // Configure navbar for admin page
  useEffect(() => {
    setConfig({
      show: true,
      showCategories: false,
    });
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
    router.push('/');
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-[#080808] via-[#0a0a0a] to-[#0c0c0c] min-h-screen">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex flex-col lg:flex-row gap-8">
            <div className="hidden lg:block w-64 shrink-0">
              <div className="bg-[#121212] rounded-lg p-4 border border-[#2a2a2a]/50">
                {[...Array(4)].map((_, index) => (
                  <div 
                    key={index} 
                    className="h-10 bg-[#1a1a1a] rounded-md mb-2 animate-pulse"
                  ></div>
                ))}
              </div>
            </div>

            <div className="flex-1 space-y-6">
              <div className="bg-[#121212] border border-[#2a2a2a]/50 rounded-lg p-6">
                <div className="space-y-4">
                  <div className="h-8 bg-[#1a1a1a] rounded-md w-80 animate-pulse"></div>
                  <div className="h-4 bg-[#1a1a1a] rounded-md w-64 animate-pulse"></div>
                </div>
              </div>

              <div className="bg-[#121212] border border-[#2a2a2a]/50 rounded-lg p-6">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="border-b border-[#2a2a2a]/30 py-4 last:border-b-0 last:pb-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-[#1a1a1a] rounded-md animate-pulse"></div>
                        <div className="space-y-2">
                          <div className="h-4 bg-[#1a1a1a] rounded-md w-48 animate-pulse"></div>
                          <div className="h-3 bg-[#1a1a1a] rounded-md w-32 animate-pulse"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

    );
  }

  return (
    <div className="bg-gradient-to-br from-[#080808] via-[#0a0a0a] to-[#0c0c0c] min-h-screen">
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[#121212] shadow-lg z-40 border-t border-[#2a2a2a]">
        <div className="flex justify-between items-center">
          {adminCategories.map((category) => (
            <button
              key={category.id}
              onClick={() => handleTabChange(category.id)}
              className={`flex flex-col items-center py-2 flex-1 ${
                activeTab === category.id ? "text-[#ea4197]" : "text-white/70"
              }`}
            >
              <span className="text-xl mb-1">{category.icon}</span>
              <span className="text-sm font-roboto">{category.label.split(' ')[0]}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="container mx-auto px-4 md:py-8 py-2 max-w-7xl pb-16 md:pb-8">
        <div className="flex flex-col md:flex-row gap-8">
          <div className="hidden md:block w-64 shrink-0">
            <div className="bg-[#121212] rounded-xl p-4 sticky top-24">
              <div className="space-y-1 pb-2.5">
                {adminCategories.map((category) => (
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

              {/* <div className="pt-3 border-t border-white/10 mt-0">
                <button
                  className="flex items-center cursor-pointer w-full px-4 py-2.5 rounded-lg text-red-400 hover:bg-red-900/20"
                  onClick={handleLogout}
                >
                  <FiLogOut className="mr-[0.7rem] text-lg" />
                  <span className="-translate-y-[2px] font-pop">Logout</span>
                </button>
              </div> */}
            </div>
          </div>

          <div className="flex-1">
            <div className="space-y-8">
              {activeTab === "analytics" && (
                <div className={`space-y-8 transition-opacity mb-8 duration-200 ease-out ${fadeInOut ? "opacity-0" : "opacity-100"}`}>
                  <div>
                    <h1 className="text-2xl font-semibold text-white mb-0.5">Analytics</h1>
                    <p className="text-white/60">Track goonchan's performance and growth.</p>
                  </div>

                  <div className="bg-[#121212] rounded-lg border border-[#2a2a2a]/50 p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
                      <div>
                        <h2 className="text-lg font-semibold text-white mb-0.5">Daily Views</h2>
                        <p className="text-sm text-white/60">
                          {analyticsData.hasData 
                            ? 'Daily video/image views over time' 
                            : 'Showing placeholder data - real data will appear after 24 hours'}
                        </p>
                      </div>
                      
                      <div className="flex gap-1 mt-4 sm:mt-0 bg-[#1a1a1a] rounded-lg p-1">
                        {timeRanges.map((range) => (
                          <button
                            key={range.id}
                            onClick={() => setSelectedTimeRange(range.id)}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium cursor-pointer transition-colors ${
                              selectedTimeRange === range.id
                                ? "bg-[#ea4197] fon-medium text-white shadow-sm"
                                : "text-white/70 hover:text-white font-medium"
                            }`}
                          >
                            {range.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={getViewsData()}>
                          <defs>
                            <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#ea4197" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#ea4197" stopOpacity={0.05}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                          <XAxis 
                            dataKey="date" 
                            stroke="#666" 
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                          />
                          <YAxis 
                            stroke="#666" 
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(value) => `${value}`}
                          />
                          <Tooltip content={<CustomTooltip />} />
                          <Area
                            type="monotone"
                            dataKey="views"
                            stroke="#ea4197"
                            strokeWidth={2}
                            fillOpacity={1}
                            fill="url(#colorViews)"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-[#121212] rounded-lg border border-[#2a2a2a]/50 py-4 px-6 hover:border-[#3a3a3a] transition-colors">
                      <div className="flex items-center justify-between ">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                            <FiUsers className="text-blue-400 text-lg" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-white">Users</h3>
                            <p className="text-sm text-white/60">Total registered</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-semibold text-white">
                            {analyticsLoading ? '...' : (analyticsData.totals.users + 30).toLocaleString()}
                          </div>
                          {/* <div className="text-sm text-green-400 flex items-center justify-end gap-1">
                            <FiTrendingUp className="text-xs" />
                            +8.2%
                          </div> */}
                        </div>
                      </div>
                    </div>

                    <div className="bg-[#121212] rounded-lg border border-[#2a2a2a]/50 py-4 px-6 hover:border-[#3a3a3a] transition-colors">
                      <div className="flex items-center justify-between ">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                            <FiVideo className="text-purple-400 text-lg" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-white">Videos</h3>
                            <p className="text-sm text-white/60">Total uploaded</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-semibold text-white">
                            {analyticsLoading ? '...' : analyticsData.totals.videos.toLocaleString()}
                          </div>
                          {/* <div className="text-sm text-green-400 flex items-center justify-end gap-1">
                            <FiTrendingUp className="text-xs" />
                            +12.4%
                          </div> */}
                        </div>
                      </div>
                    </div>

                    <div className="bg-[#121212] rounded-lg border border-[#2a2a2a]/50 py-4 px-6 hover:border-[#3a3a3a] transition-colors">
                      <div className="flex items-center justify-between ">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center">
                            <FiImage className="text-orange-400 text-lg" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-white">Images</h3>
                            <p className="text-sm text-white/60">Total uploaded</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-semibold text-white">
                            {analyticsLoading ? '...' : analyticsData.totals.images.toLocaleString()}
                          </div>
                          {/* <div className="text-sm text-green-400 flex items-center justify-end gap-1">
                            <FiTrendingUp className="text-xs" />
                            +5.7%
                          </div> */}
                        </div>
                      </div>
                    </div>

                    <div className="bg-[#121212] rounded-lg border border-[#2a2a2a]/50 py-4 px-6 hover:border-[#3a3a3a] transition-colors">
                      <div className="flex items-center justify-between ">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-[#ea4197]/20 rounded-lg flex items-center justify-center">
                            <FiEye className="text-[#ea4197] text-lg" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-white">Views</h3>
                            <p className="text-sm text-white/60">All-time total</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-semibold text-white">
                            {analyticsLoading ? '...' : analyticsData.totals.views >= 1000000 
                              ? (analyticsData.totals.views / 1000000).toFixed(1) + 'M'
                              : analyticsData.totals.views >= 1000
                              ? (analyticsData.totals.views / 1000).toFixed(1) + 'K'
                              : analyticsData.totals.views.toLocaleString()}
                          </div>
                          {/* <div className="text-sm text-green-400 flex items-center justify-end gap-1">
                            <FiTrendingUp className="text-xs" />
                            +15.3%
                          </div> */}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h2 className="text-lg font-semibold text-white mb-4">System Health</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-[#121212] rounded-lg border border-[#2a2a2a]/50 p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                            <FiServer className="text-green-400 text-sm" />
                          </div>
                          <div>
                            <h3 className="font-medium text-white text-sm">Server</h3>
                            <div className="flex items-center gap-2 mt-0.5">
                              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                              <span className="text-green-400 text-xs font-medium">Operational</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="bg-[#121212] rounded-lg border border-[#2a2a2a]/50 p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                            <FiDatabase className="text-green-400 text-sm" />
                          </div>
                          <div>
                            <h3 className="font-medium text-white text-sm">Database</h3>
                            <div className="flex items-center gap-2 mt-0.5">
                              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                              <span className="text-green-400 text-xs font-medium">Connected</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="bg-[#121212] rounded-lg border border-[#2a2a2a]/50 p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                            <FiHardDrive className="text-yellow-400 text-sm" />
                          </div>
                          <div>
                            <h3 className="font-medium text-white text-sm">Storage</h3>
                            <div className="flex items-center gap-2 mt-0.5">
                              <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                              <span className="text-yellow-400 text-xs font-medium">Coming Soon</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "admin-settings" && (
                <div className={`space-y-8 transition-opacity duration-200 ease-out ${fadeInOut ? "opacity-0" : "opacity-100"}`}>
                  <div>
                    <h1 className="text-2xl font-semibold text-white mb-0.5">Admin Settings</h1>
                    <p className="text-white/60">Manage blocked keywords and advertisement configuration.</p>
                  </div>

                  {/* Blocked Keywords Section */}
                  <div className="bg-[#121212] rounded-lg border border-[#2a2a2a]/50 p-6">
                    <h2 className="text-lg font-semibold text-white mb-0.5">Blocked Keywords</h2>
                    <p className="text-sm text-white/60 mb-4">Keywords that will be blocked during content uploads.</p>
                    
                    <div className="flex gap-2 mb-4">
                      <input
                        type="text"
                        value={newKeyword}
                        onChange={(e) => setNewKeyword(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && addKeyword()}
                        placeholder="Enter keyword to block..."
                        className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-md px-3 py-2 text-white placeholder-white/40 focus:outline-none focus:border-[#ea4197]"
                      />
                      <button
                        onClick={addKeyword}
                        className="bg-[#ea4197] hover:bg-[#d63384] px-4 py-2 rounded-md text-white font-medium transition-colors cursor-pointer"
                      >
                        Add
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {blockedKeywords.map((keyword) => (
                        <span
                          key={keyword}
                          className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-md px-3 py-1.5 text-sm text-white flex items-center gap-2"
                        >
                          {keyword}
                          <button
                            onClick={() => removeKeyword(keyword)}
                            className="text-red-400 hover:text-red-300 transition-colors cursor-pointer"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                      {blockedKeywords.length === 0 && (
                        <p className="text-white/40 text-sm">No keywords blocked yet.</p>
                      )}
                    </div>
                  </div>
                  
                  {/* Ad Settings Section */}
                  <div>
                    <div className="mb-6">
                      <h2 className="text-lg font-semibold text-white mb-1">Ad Settings</h2>
                      <p className="text-sm text-white/60">Configure advertisement placements and URLs.</p>
                    </div>
                    
                      <div className="space-y-4">
                      {/* Chaturbate Ads */}
                      <div className="bg-[#121212] rounded-xl border border-[#2a2a2a]/50 p-6 hover:border-[#2a2a2a]/80 transition-all duration-200">
                        <div className="flex items-center gap-3 mb-5">
                          <div className="w-8 h-8 bg-orange-500/10 rounded-lg flex items-center justify-center">
                            <FiExternalLink className="text-orange-400 text-sm" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-white">Chaturbate Ads</h3>
                            <p className="text-xs text-white/50">Embed chaturbate iframe advertisements</p>
                          </div>
                        </div>
                        
                        <div className="grid gap-4">
                        {['chaturbate1', 'chaturbate2'].map((adType, index) => (
                            <div key={adType} className="bg-[#0f0f0f] rounded-lg border border-[#1f1f1f] p-4 hover:bg-[#111111] transition-colors">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 bg-orange-400/60 rounded-full"></div>
                                  <span className="text-white/90 font-medium text-sm">Chaturbate {index + 1}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className={`text-xs font-medium ${adSettings[adType].enabled ? 'text-[#ea4197]' : 'text-white/50'}`}>
                                    {adSettings[adType].enabled ? 'Active' : 'Inactive'}
                                  </span>
                                  <ToggleSwitch
                                    enabled={adSettings[adType].enabled}
                                    onToggle={() => toggleAdEnabled(adType)}
                                    size="small"
                                  />
                                </div>
                            </div>
                            <input
                              type="url"
                              value={adSettings[adType].iframeUrl}
                              onChange={(e) => updateAdUrl(adType, 'iframeUrl', e.target.value)}
                                placeholder="https://chaturbate.com/embed/..."
                                className="w-full bg-[#0a0a0a] border border-[#1f1f1f] rounded-lg px-3 py-2.5 text-white/90 placeholder-white/30 focus:outline-none focus:border-[#ea4197]/50 focus:ring-1 focus:ring-[#ea4197]/20 text-sm transition-all"
                            />
                          </div>
                        ))}
                        </div>
                      </div>

                      {/* Smart Ads */}
                      <div className="bg-[#121212] rounded-xl border border-[#2a2a2a]/50 p-6 hover:border-[#2a2a2a]/80 transition-all duration-200">
                        <div className="flex items-center gap-3 mb-5">
                          <div className="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center">
                            <FiZap className="text-blue-400 text-sm" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-white">Smart Ads</h3>
                            <p className="text-xs text-white/50">Intelligent ad placement system</p>
                          </div>
                        </div>
                        
                        <div className="grid gap-4">
                        {['smartAd1', 'smartAd2'].map((adType, index) => (
                            <div key={adType} className="bg-[#0f0f0f] rounded-lg border border-[#1f1f1f] p-4 hover:bg-[#111111] transition-colors">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 bg-blue-400/60 rounded-full"></div>
                                  <span className="text-white/90 font-medium text-sm">Smart Ad {index + 1}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className={`text-xs font-medium ${adSettings[adType].enabled ? 'text-[#ea4197]' : 'text-white/50'}`}>
                                    {adSettings[adType].enabled ? 'Active' : 'Inactive'}
                                  </span>
                                  <ToggleSwitch
                                    enabled={adSettings[adType].enabled}
                                    onToggle={() => toggleAdEnabled(adType)}
                                    size="small"
                                  />
                                </div>
                        </div>
                            <input
                              type="url"
                              value={adSettings[adType].iframeUrl}
                              onChange={(e) => updateAdUrl(adType, 'iframeUrl', e.target.value)}
                                placeholder="https://smartads.com/embed/..."
                                className="w-full bg-[#0a0a0a] border border-[#1f1f1f] rounded-lg px-3 py-2.5 text-white/90 placeholder-white/30 focus:outline-none focus:border-[#ea4197]/50 focus:ring-1 focus:ring-[#ea4197]/20 text-sm transition-all"
                            />
                          </div>
                        ))}
                        </div>
                      </div>

                      {/* Video Ad */}
                      <div className="bg-[#121212] rounded-xl border border-[#2a2a2a]/50 p-6 hover:border-[#2a2a2a]/80 transition-all duration-200">
                        <div className="flex items-center gap-3 mb-5">
                          <div className="w-8 h-8 bg-purple-500/10 rounded-lg flex items-center justify-center">
                            <FiVideo className="text-purple-400 text-sm" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-white">Video Advertisement</h3>
                            <p className="text-xs text-white/50">Pre-roll and mid-roll video ads</p>
                          </div>
                        </div>
                        
                        <div className="bg-[#0f0f0f] rounded-lg border border-[#1f1f1f] p-4 hover:bg-[#111111] transition-colors">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-purple-400/60 rounded-full"></div>
                              <span className="text-white/90 font-medium text-sm">Video Player Ad</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-medium ${adSettings.videoAd.enabled ? 'text-[#ea4197]' : 'text-white/50'}`}>
                                {adSettings.videoAd.enabled ? 'Active' : 'Inactive'}
                              </span>
                              <ToggleSwitch
                                enabled={adSettings.videoAd.enabled}
                                onToggle={() => toggleAdEnabled('videoAd')}
                                size="small"
                              />
                            </div>
                          </div>
                          <input
                            type="url"
                            value={adSettings.videoAd.url}
                            onChange={(e) => updateAdUrl('videoAd', 'url', e.target.value)}
                            placeholder="https://video-ads.com/player/..."
                            className="w-full bg-[#0a0a0a] border border-[#1f1f1f] rounded-lg px-3 py-2.5 text-white/90 placeholder-white/30 focus:outline-none focus:border-[#ea4197]/50 focus:ring-1 focus:ring-[#ea4197]/20 text-sm transition-all"
                          />
                        </div>
                      </div>

                      {/* Popunder Ad */}
                      <div className="bg-[#121212] rounded-xl border border-[#2a2a2a]/50 p-6 hover:border-[#2a2a2a]/80 transition-all duration-200">
                        <div className="flex items-center gap-3 mb-5">
                          <div className="w-8 h-8 bg-green-500/10 rounded-lg flex items-center justify-center">
                            <FiMonitor className="text-green-400 text-sm" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-white">Popunder Advertisement</h3>
                            <p className="text-xs text-white/50">Background popup advertisements</p>
                          </div>
                        </div>
                        
                        <div className="bg-[#0f0f0f] rounded-lg border border-[#1f1f1f] p-4 hover:bg-[#111111] transition-colors">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-green-400/60 rounded-full"></div>
                              <span className="text-white/90 font-medium text-sm">Popunder URLs</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-medium ${adSettings.popunderAd.enabled ? 'text-[#ea4197]' : 'text-white/50'}`}>
                                {adSettings.popunderAd.enabled ? 'Active' : 'Inactive'}
                              </span>
                              <ToggleSwitch
                                enabled={adSettings.popunderAd.enabled}
                                onToggle={() => toggleAdEnabled('popunderAd')}
                                size="small"
                              />
                            </div>
                          </div>
                          
                          <div className="space-y-3">
                            {adSettings.popunderAd.urls.map((url, index) => (
                              <div key={index} className="flex gap-2 items-center">
                                {/* <div className="w-1 h-1 bg-white/20 rounded-full flex-shrink-0 mt-2"></div> */}
                                <input
                                  type="url"
                                  value={url}
                                  onChange={(e) => {
                                    const newUrls = [...adSettings.popunderAd.urls];
                                    newUrls[index] = e.target.value;
                                    setAdSettings(prev => ({
                                      ...prev,
                                      popunderAd: { ...prev.popunderAd, urls: newUrls }
                                    }));
                                    // setHasUnsavedChanges(true); // This will be handled by useMemo
                                  }}
                                  placeholder="https://popunder-url.com/..."
                                  className="flex-1 bg-[#0a0a0a] border border-[#1f1f1f] rounded-lg px-3 py-2 text-white/90 placeholder-white/30 focus:outline-none focus:border-[#ea4197]/50 focus:ring-1 focus:ring-[#ea4197]/20 text-sm transition-all"
                                />
                                <button
                                  onClick={() => removePopunderUrl(index)}
                                  className="w-8 h-8 bg-red-500/10 hover:bg-red-500/20 rounded-lg flex items-center justify-center text-red-400 hover:text-red-300 transition-colors text-sm cursor-pointer"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                            
                            {/* New URL Input */}
                            {showPopunderInput ? (
                              <div className="flex gap-2 items-center p-3 bg-[#0a0a0a] border border-[#ea4197]/30 rounded-lg">
                                {/* <div className="w-1 h-1 bg-[#ea4197]/60 rounded-full flex-shrink-0 mt-2"></div> */}
                                <input
                                  type="url"
                                  value={newPopunderUrl}
                                  onChange={(e) => setNewPopunderUrl(e.target.value)}
                                  onKeyPress={(e) => e.key === 'Enter' && addPopunderUrl()}
                                  placeholder="https://new-popunder-url.com/..."
                                  className="flex-1 bg-transparent border-none outline-none text-white/90 placeholder-white/30 text-sm"
                                  autoFocus
                                />
                            <button
                              onClick={addPopunderUrl}
                                  disabled={!newPopunderUrl.trim()}
                                  className="px-3 py-1.5 bg-[#ea4197] hover:bg-[#d63384] disabled:bg-[#2a2a2a] disabled:text-white/30 rounded-md text-white text-xs font-medium transition-colors cursor-pointer disabled:cursor-not-allowed"
                                >
                                  Add
                                </button>
                                <button
                                  onClick={() => {
                                    setShowPopunderInput(false);
                                    setNewPopunderUrl('');
                                  }}
                                  className="w-6 h-6 bg-red-500/10 hover:bg-red-500/20 rounded-md flex items-center justify-center text-red-400 hover:text-red-300 transition-colors text-sm cursor-pointer"
                                >
                                  <FiX />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setShowPopunderInput(true)}
                                className="w-full bg-[#0a0a0a] hover:bg-[#0f0f0f] border border-[#1f1f1f] hover:border-[#ea4197]/30 rounded-lg py-2.5 text-white/70 hover:text-[#ea4197] transition-all duration-200 text-sm font-medium cursor-pointer"
                            >
                              + Add URL
                          </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Undress Button */}
                      <div className="bg-[#121212] rounded-xl border border-[#2a2a2a]/50 p-6 hover:border-[#2a2a2a]/80 transition-all duration-200">
                        <div className="flex items-center gap-3 mb-5">
                          <div className="w-8 h-8 bg-pink-500/10 rounded-lg flex items-center justify-center">
                            <FiExternalLink className="text-pink-400 text-sm" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-white">Navigation Button</h3>
                            <p className="text-xs text-white/50">Customize the promotional button in navbar</p>
                          </div>
                        </div>
                        
                        <div className="bg-[#0f0f0f] rounded-lg border border-[#1f1f1f] p-4 hover:bg-[#111111] transition-colors">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-pink-400/60 rounded-full"></div>
                              <span className="text-white/90 font-medium text-sm">Button Configuration</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-medium ${adSettings.undressButton.enabled ? 'text-[#ea4197]' : 'text-white/50'}`}>
                                {adSettings.undressButton.enabled ? 'Active' : 'Inactive'}
                              </span>
                              <ToggleSwitch
                                enabled={adSettings.undressButton.enabled}
                                onToggle={() => toggleAdEnabled('undressButton')}
                                size="small"
                              />
                            </div>
                          </div>
                          
                          <div className="space-y-3">
                            <div>
                              <label className="text-white/70 text-xs font-medium mb-1.5 block">Button Text</label>
                              <input
                                type="text"
                                value={adSettings.undressButton.text}
                                onChange={(e) => updateAdUrl('undressButton', 'text', e.target.value)}
                                placeholder="Undress Her"
                                className="w-full bg-[#0a0a0a] border border-[#1f1f1f] rounded-lg px-3 py-2.5 text-white/90 placeholder-white/30 focus:outline-none focus:border-[#ea4197]/50 focus:ring-1 focus:ring-[#ea4197]/20 text-sm transition-all"
                              />
                            </div>
                            <div>
                              <label className="text-white/70 text-xs font-medium mb-1.5 block">Button URL</label>
                              <input
                                type="url"
                                value={adSettings.undressButton.url}
                                onChange={(e) => updateAdUrl('undressButton', 'url', e.target.value)}
                                placeholder="https://example.com/?refid=yourrefid"
                                className="w-full bg-[#0a0a0a] border border-[#1f1f1f] rounded-lg px-3 py-2.5 text-white/90 placeholder-white/30 focus:outline-none focus:border-[#ea4197]/50 focus:ring-1 focus:ring-[#ea4197]/20 text-sm transition-all"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Banner Ads */}
                      <div className="bg-[#121212] rounded-xl border border-[#2a2a2a]/50 p-6 hover:border-[#2a2a2a]/80 transition-all duration-200">
                        <div className="flex items-center gap-3 mb-5">
                          <div className="w-8 h-8 bg-yellow-500/10 rounded-lg flex items-center justify-center">
                            <FiImage className="text-yellow-400 text-sm" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-white">Banner Advertisements</h3>
                            <p className="text-xs text-white/50">Display banner and GIF advertisements</p>
                          </div>
                        </div>
                        
                        <div className="bg-[#0f0f0f] rounded-lg border border-[#1f1f1f] p-4 hover:bg-[#111111] transition-colors">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-yellow-400/60 rounded-full"></div>
                              <span className="text-white/90 font-medium text-sm">Banner Collection</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-medium ${adSettings.bannerAds.enabled ? 'text-[#ea4197]' : 'text-white/50'}`}>
                                {adSettings.bannerAds.enabled ? 'Active' : 'Inactive'}
                              </span>
                              <ToggleSwitch
                                enabled={adSettings.bannerAds.enabled}
                                onToggle={() => toggleAdEnabled('bannerAds')}
                                size="small"
                              />
                            </div>
                        </div>

                          <div className="space-y-4">
                            {adSettings.bannerAds.ads.map((ad, index) => (
                              <div key={index} className="bg-[#0a0a0a] rounded-lg border border-[#1f1f1f] p-3 hover:border-[#2a2a2a]/50 transition-colors">
                                <div className="flex items-center justify-between mb-3">
                                  <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 bg-yellow-400/40 rounded-full"></div>
                                  <span className="text-white/80 text-sm font-medium">Banner {index + 1}</span>
                                  </div>
                                  <button
                                    onClick={() => removeBannerAd(index)}
                                    className="text-xs text-red-400/80 hover:text-red-400 bg-red-500/5 hover:bg-red-500/10 px-2 py-1 rounded transition-colors cursor-pointer"
                                  >
                                    Remove
                        </button>
                                </div>
                                <div className="space-y-2">
                                  <input
                                    type="url"
                                    value={ad.link}
                                    onChange={(e) => {
                                      const newAds = [...adSettings.bannerAds.ads];
                                      newAds[index].link = e.target.value;
                                      setAdSettings(prev => ({
                                        ...prev,
                                        bannerAds: { ...prev.bannerAds, ads: newAds }
                                      }));
                                      // setHasUnsavedChanges(true); // This will be handled by useMemo
                                    }}
                                    placeholder="Banner destination URL..."
                                    className="w-full bg-[#050505] border border-[#1a1a1a] rounded-md px-3 py-2 text-white/90 placeholder-white/30 focus:outline-none focus:border-[#ea4197]/50 text-sm transition-all"
                                  />
                                  <input
                                    type="url"
                                    value={ad.gif}
                                    onChange={(e) => {
                                      const newAds = [...adSettings.bannerAds.ads];
                                      newAds[index].gif = e.target.value;
                                      setAdSettings(prev => ({
                                        ...prev,
                                        bannerAds: { ...prev.bannerAds, ads: newAds }
                                      }));
                                      // setHasUnsavedChanges(true); // This will be handled by useMemo
                                    }}
                                    placeholder="Banner image/GIF URL..."
                                    className="w-full bg-[#050505] border border-[#1a1a1a] rounded-md px-3 py-2 text-white/90 placeholder-white/30 focus:outline-none focus:border-[#ea4197]/50 text-sm transition-all"
                                  />
                                </div>
                              </div>
                            ))}
                            {/* New Banner Input */}
                            {showBannerInput ? (
                              <div className="p-3 bg-[#0a0a0a] border border-[#ea4197]/30 rounded-lg space-y-3">
                                <div className="flex items-center gap-2 mb-2">
                                  <div className="w-1.5 h-1.5 bg-[#ea4197]/60 rounded-full"></div>
                                  <span className="text-white/80 text-sm font-medium">New Banner</span>
                                  <button
                                    onClick={() => {
                                      setShowBannerInput(false);
                                      setNewBannerLink('');
                                      setNewBannerGif('');
                                    }}
                                    className="ml-auto w-6 h-6 bg-red-500/10 hover:bg-red-500/20 rounded-md flex items-center justify-center text-red-400 hover:text-red-300 transition-colors text-sm cursor-pointer"
                                  >
                                    <FiX />
                                  </button>
                                </div>
                                <input
                                  type="url"
                                  value={newBannerLink}
                                  onChange={(e) => setNewBannerLink(e.target.value)}
                                  placeholder="Banner destination URL..."
                                  className="w-full bg-transparent border border-[#1a1a1a] rounded-md px-3 py-2 text-white/90 placeholder-white/30 focus:outline-none focus:border-[#ea4197]/50 text-sm transition-all"
                                />
                                <input
                                  type="url"
                                  value={newBannerGif}
                                  onChange={(e) => setNewBannerGif(e.target.value)}
                                  onKeyPress={(e) => e.key === 'Enter' && addBannerAd()}
                                  placeholder="Banner image/GIF URL..."
                                  className="w-full bg-transparent border border-[#1a1a1a] rounded-md px-3 py-2 text-white/90 placeholder-white/30 focus:outline-none focus:border-[#ea4197]/50 text-sm transition-all"
                                />
                            <button
                              onClick={addBannerAd}
                                  disabled={!newBannerLink.trim() || !newBannerGif.trim()}
                                  className="w-full px-3 py-2 bg-[#ea4197] hover:bg-[#d63384] disabled:bg-[#2a2a2a] disabled:text-white/30 rounded-md text-white text-sm font-medium transition-colors cursor-pointer disabled:cursor-not-allowed"
                                >
                                  Add Banner
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setShowBannerInput(true)}
                                className="w-full bg-[#0a0a0a] hover:bg-[#0f0f0f] border border-[#1f1f1f] hover:border-[#ea4197]/30 rounded-lg py-2.5 text-white/70 hover:text-[#ea4197] transition-all duration-200 text-sm font-medium cursor-pointer"
                            >
                              + Add Banner
                        </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "manage-users" && (
                <div className={`space-y-8 transition-opacity duration-200 ease-out ${fadeInOut ? "opacity-0" : "opacity-100"}`}>
                  <div>
                    <h1 className="text-2xl font-semibold text-white mb-0.5">Manage Users</h1>
                    <p className="text-white/60">Ban or unban users and manage admin privileges.</p>
                  </div>

                  {/* Ban/Unban Users Section */}
                  <div className="bg-[#121212] rounded-lg border border-[#2a2a2a]/50 p-6">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="w-8 h-8 bg-red-500/10 rounded-lg sm:flex hidden items-center justify-center">
                        <FiFlag className="text-red-400 text-sm" />
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-white">Ban/Unban Users</h2>
                        <p className="text-sm text-white/60">Search and ban or unban users.</p>
                      </div>
                    </div>
                    
                    {/* User Search */}
                    <div className="mb-6">
                      <div className="relative">
                        <input
                          type="text"
                          value={banSearchQuery}
                          onChange={(e) => {
                            setBanSearchQuery(e.target.value);
                            searchBanUsers(e.target.value);
                          }}
                          placeholder="Search users by name or email (min 3 chars)..."
                          className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 pr-10 text-white placeholder-white/40 focus:outline-none focus:border-[#ea4197] transition-colors"
                        />
                        {isBanSearching && (
                          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                            <div className="w-4 h-4 border-2 border-[#ea4197]/30 border-t-[#ea4197] rounded-full animate-spin"></div>
                          </div>
                        )}
                      </div>
                      
                      {/* Search Results */}
                      {banSearchResults.length > 0 && (
                        <div className="mt-2 bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg overflow-hidden">
                          {banSearchResults.map((user) => (
                            <div key={user._id} className="flex items-center justify-between p-3 hover:bg-[#1a1a1a] transition-colors border-b border-[#2a2a2a]/30 last:border-b-0">
                              <div className="flex items-center gap-3">
                                {user.avatar ? (
                                  <img 
                                    src={user.avatar} 
                                    alt={user.username}
                                    className="w-8 h-8 rounded-full bg-[#2a2a2a] object-cover"
                                  />
                                ) : (
                                  <div 
                                    className="w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-sm"
                                    style={{ backgroundColor: user.avatarColor }}
                                  >
                                    {user.username?.[0]?.toUpperCase()}
                                  </div>
                                )}
                                <div>
                                  <p className="text-white font-medium text-sm">{user.username}</p>
                                  <p className="text-white/60 text-xs">{user.email}</p>
                                </div>
                              </div>
                              <button
                                onClick={() => banUser(user)}
                                className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/30 text-red-400 rounded-md text-sm font-medium transition-colors cursor-pointer"
                              >
                                Ban User
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Banned Users List */}
                    <div>
                      <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                        <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                        Banned Users ({bannedUsers.length})
                      </h3>
                      <div className="space-y-2">
                        {bannedUsers.map((user) => (
                          <div key={user._id} className="flex items-center justify-between p-3 bg-[#0f0f0f] border border-[#2a2a2a]/30 rounded-lg hover:border-[#2a2a2a]/50 transition-colors">
                            <div className="flex items-center gap-3">
                              {user.avatar ? (
                                <img 
                                  src={user.avatar} 
                                  alt={user.username}
                                  className="w-8 h-8 rounded-full bg-[#2a2a2a] object-cover"
                                />
                              ) : (
                                <div 
                                  className="w-8 h-8 select-none rounded-full flex items-center justify-center text-white font-semibold text-sm"
                                  style={{ backgroundColor: user.avatarColor }}
                                >
                                  {user.username?.[0]?.toUpperCase()}
                                </div>
                              )}
                              <div>
                                <p className="text-white font-medium text-sm">{user.username}</p>
                                <p className="text-white/60 text-xs">{user.email}</p>
                              </div>
                            </div>
                            <button
                              onClick={() => unbanUser(user._id)}
                              className="px-3 py-1.5 bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 hover:border-green-500/30 text-green-400 rounded-md text-sm font-medium transition-colors cursor-pointer"
                            >
                              Unban
                            </button>
                          </div>
                        ))}
                        {bannedUsers.length === 0 && (
                          <p className="text-white/40 text-sm text-center py-4">No banned users.</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Admin Management Section */}
                  <div className="bg-[#121212] rounded-lg border border-[#2a2a2a]/50 p-6">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="w-8 h-8 bg-[#ea4197]/10 rounded-lg sm:flex hidden items-center justify-center">
                        <RiAdminLine className="text-[#ea4197] text-sm" />
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-white">Admin Management</h2>
                        <p className="text-sm text-white/60">Grant or revoke admin privileges for users.</p>
                      </div>
                    </div>
                    
                    {/* User Search for Admin */}
                    <div className="mb-6">
                      <div className="relative">
                        <input
                          type="text"
                          value={adminSearchQuery}
                          onChange={(e) => {
                            setAdminSearchQuery(e.target.value);
                            searchAdminUsers(e.target.value);
                          }}
                          placeholder="Search users to grant admin privileges (min 3 chars)..."
                          className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 pr-10 text-white placeholder-white/40 focus:outline-none focus:border-[#ea4197] transition-colors"
                        />
                        {isAdminSearching && (
                          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                            <div className="w-4 h-4 border-2 border-[#ea4197]/30 border-t-[#ea4197] rounded-full animate-spin"></div>
                          </div>
                        )}
                      </div>
                      
                      {/* Search Results for Admin */}
                      {adminSearchResults.length > 0 && (
                        <div className="mt-2 bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg overflow-hidden">
                          {adminSearchResults.map((user) => (
                            <div key={user._id} className="flex items-center justify-between p-3 hover:bg-[#1a1a1a] transition-colors border-b border-[#2a2a2a]/30 last:border-b-0">
                              <div className="flex items-center gap-3">
                                {user.avatar ? (
                                  <img 
                                    src={user.avatar} 
                                    alt={user.username}
                                    className="w-8 h-8 rounded-full bg-[#2a2a2a] object-cover"
                                  />
                                ) : (
                                  <div 
                                    className="w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-sm"
                                    style={{ backgroundColor: user.avatarColor }}
                                  >
                                    {user.username?.[0]?.toUpperCase()}
                                  </div>
                                )}
                                <div>
                                  <p className="text-white font-medium text-sm">{user.username}</p>
                                  <p className="text-white/60 text-xs">{user.email}</p>
                                </div>
                              </div>
                              <button
                                onClick={() => addAdmin(user)}
                                className="px-3 py-1.5 bg-[#ea4197]/10 hover:bg-[#ea4197]/20 border border-[#ea4197]/20 hover:border-[#ea4197]/30 text-[#ea4197] rounded-md text-sm font-medium transition-colors cursor-pointer"
                              >
                                Make Admin
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Admin Users List */}
                    <div>
                      <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                        <div className="w-2 h-2 bg-[#ea4197] rounded-full"></div>
                        Admin Users ({adminUsers.length})
                      </h3>
                      <div className="space-y-2">
                        {adminUsers.map((adminUser) => (
                          <div key={adminUser._id} className="flex items-center justify-between p-3 bg-[#0f0f0f] border border-[#2a2a2a]/30 rounded-lg hover:border-[#2a2a2a]/50 transition-colors">
                            <div className="flex items-center gap-3">
                              {adminUser.avatar ? (
                                <img 
                                  src={adminUser.avatar} 
                                  alt={adminUser.username}
                                  className="w-8 h-8 rounded-full bg-[#2a2a2a] object-cover"
                                />
                              ) : (
                                <div 
                                  className="w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-sm"
                                  style={{ backgroundColor: adminUser.avatarColor }}
                                >
                                  {adminUser.username?.[0]?.toUpperCase()}
                                </div>
                              )}
                              <div>
                                <p className="text-white font-medium text-sm flex items-center gap-2">
                                  {adminUser.username}
                                  {adminUser.email === "siddz.dev@gmail.com" || adminUser.email === "mincboss@email.com" ? (
                                  <span className="text-white/60 text-xs">
                                    <span className="px-2 py-0.5 bg-[#ea4197]/10 text-[#ea4197] text-xs rounded-full">
                                      SuperAdmin
                                    </span>
                                  </span>
                                  ) : (
                                    <span className="px-2 py-0.5 bg-[#ea4197]/10 text-[#ea4197] text-xs rounded-full">Admin</span>
                                  )}
                                </p>
                                <p className="text-white/60 text-xs">{adminUser.email}</p>
                              </div>
                            </div>
                            {adminUser._id !== user?._id && adminUser?.email !== "mincboss@email.com" && adminUser?.email !== "siddz.dev@gmail.com" && ( // Prevent removing self
                              <button
                                onClick={() => removeAdmin(adminUser._id)}
                                className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/30 text-red-400 rounded-md text-sm font-medium transition-colors cursor-pointer"
                              >
                                Remove Admin
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className={`fixed bottom-0 left-0 right-0 z-50 transition-all duration-300 ease-out ${
        hasUnsavedChanges 
          ? 'transform translate-y-0 opacity-100' 
          : 'transform translate-y-full opacity-0'
      }`}>
        <div className="bg-[#121212] border-t border-[#2a2a2a] backdrop-blur-md bg-opacity-95 shadow-2xl">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-[#ea4197] rounded-full animate-pulse"></div>
                <div>
                  <p className="text-white font-medium text-sm">Unsaved changes <span className="text-red-500 font-medium">*</span></p>
                  <p className="text-white/60 text-xs">You have modified settings that haven't been saved yet.</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={resetChanges}
                  className="flex items-center gap-2 px-4 py-2 bg-[#2a2a2a] hover:bg-[#333] text-white/80 hover:text-white rounded-lg text-sm font-medium transition-colors cursor-pointer"
                >
                  <FiRotateCcw className="text-sm" />
                  Reset
                </button>
                <button
                  onClick={saveChanges}
                  className="flex items-center gap-2 px-4 py-2 bg-[#ea4197] hover:bg-[#d63384] text-white rounded-lg text-sm font-medium transition-colors shadow-lg cursor-pointer"
                >
                  <FiSave className="text-sm" />
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const AdminPage = () => {
  return (
    <Suspense fallback={
      <div className="bg-gradient-to-br from-[#080808] via-[#0a0a0a] to-[#0c0c0c] min-h-screen">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex flex-col lg:flex-row gap-8">
            <div className="hidden lg:block w-64 shrink-0">
              <div className="bg-[#121212] rounded-lg p-4 border border-[#2a2a2a]/50">
                {[...Array(4)].map((_, index) => (
                  <div 
                    key={index} 
                    className="h-10 bg-[#1a1a1a] rounded-md mb-2 animate-pulse"
                  ></div>
                ))}
              </div>
            </div>

            <div className="flex-1 space-y-6">
              <div className="bg-[#121212] border border-[#2a2a2a]/50 rounded-lg p-6">
                <div className="space-y-4">
                  <div className="h-8 bg-[#1a1a1a] rounded-md w-80 animate-pulse"></div>
                  <div className="h-4 bg-[#1a1a1a] rounded-md w-64 animate-pulse"></div>
                </div>
              </div>

              <div className="bg-[#121212] border border-[#2a2a2a]/50 rounded-lg p-6">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="border-b border-[#2a2a2a]/30 py-4 last:border-b-0 last:pb-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-[#1a1a1a] rounded-md animate-pulse"></div>
                        <div className="space-y-2">
                          <div className="h-4 bg-[#1a1a1a] rounded-md w-48 animate-pulse"></div>
                          <div className="h-3 bg-[#1a1a1a] rounded-md w-32 animate-pulse"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    }>
      <AdminPageContent />
    </Suspense>
  );
};

export default AdminPage;
