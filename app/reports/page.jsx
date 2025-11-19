"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useNavBar } from "@/contexts/NavBarContext";
import { Toaster, toast } from "sonner";
import config from "@/config.json";
import useUserAvatar from '@/hooks/useUserAvatar';
import "remixicon/fonts/remixicon.css";
import {
  FaEye,
  FaTrash,
  FaUser,
  FaClock,
  FaImage,
  FaVideo,
  FaChevronDown,
  FaChevronUp,
  FaFilter,
  FaSearch
} from "react-icons/fa";

const ReporterAvatar = ({ reporter }) => {
  const { avatarUrl: reporterAvatarUrl } = useUserAvatar(reporter);

  return (
    <div className="w-8 h-8 rounded-full bg-[#1a1a1a] flex items-center justify-center overflow-hidden flex-shrink-0">
      {reporter?.avatar ? (
        <img
          src={reporter.avatar}
          alt={reporter.username}
          className="object-cover w-full h-full"
        />
      ) : reporterAvatarUrl ? (
        <img
          src={reporterAvatarUrl}
          alt={reporter?.username || 'Reporter'}
          className="object-cover w-full h-full"
        />
      ) : (
        <span className="text-white text-xs font-medium">
          {reporter?.username?.[0]?.toUpperCase() || '?'}
        </span>
      )}
    </div>
  );
};

const AdminPage = () => {
  const router = useRouter();
  const { user, setUser, setConfig } = useNavBar();
  const [reports, setReports] = useState([]);
  const [filteredReports, setFilteredReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({});
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterContentType, setFilterContentType] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const reportCategories = [
    { id: 'illegal', label: 'Illegal Content', icon: 'ri-error-warning-line', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
    { id: 'nonconsensual', label: 'Non-consensual', icon: 'ri-shield-user-line', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
    { id: 'underage', label: 'Underage Content', icon: 'ri-user-unfollow-line', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
    { id: 'copyright', label: 'Copyright', icon: 'ri-copyright-line', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
    { id: 'other', label: 'Other', icon: 'ri-more-line', color: 'bg-gray-500/20 text-gray-400 border-gray-500/30' }
  ];

  const getCategoryData = (categoryId) => {
    return reportCategories.find(cat => cat.id === categoryId) || reportCategories[4];
  };

  const getRelativeTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSeconds < 60) return "just now";
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 30) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  // Configure navbar
  useEffect(() => {
    setConfig({
      show: true,
      showCategories: false,
    });
  }, []);

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
          fetchReports(token);
        } else {
          router.push('/');
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        router.push('/');
      }
    };

    checkAuth();
  }, [router]);

  useEffect(() => {
    let filtered = reports;

    if (filterCategory !== 'all') {
      filtered = filtered.filter(report => report.category === filterCategory);
    }

    if (filterContentType !== 'all') {
      filtered = filtered.filter(report => report.contentType === filterContentType);
    }

    if (searchTerm) {
      filtered = filtered.filter(report => 
        report.contentSnapshot?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.contentSnapshot?.uploaderUsername?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.reporter?.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.details?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredReports(filtered);
  }, [reports, filterCategory, filterContentType, searchTerm]);

  const fetchReports = async (token) => {
    try {
      setLoading(true);
      const response = await fetch(`${config.url}/api/reports/admin?token=${token}`);
      const data = await response.json();
      
      if (data.success) {
        setReports(data.reports);
      } else {
        toast.error('Failed to fetch reports');
      }
    } catch (error) {
      console.error('Error fetching reports:', error);
      toast.error('Failed to fetch reports');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteReport = async (reportId) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    setActionLoading(prev => ({ ...prev, [reportId]: true }));

    try {
      const response = await fetch(`${config.url}/api/reports/admin/${reportId}?token=${token}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      
      if (data.success) {
        setReports(prev => prev.filter(report => report._id !== reportId));
        toast.success('Report deleted successfully');
      } else {
        toast.error(data.message || 'Failed to delete report');
      }
    } catch (error) {
      console.error('Error deleting report:', error);
      toast.error('Failed to delete report');
    } finally {
      setActionLoading(prev => ({ ...prev, [reportId]: false }));
    }
  };

  const handleViewContent = (report) => {
    if (report.contentType === 'message') {

    } else {
      // For video/image reports
      const identifier = report.contentSnapshot?.slug || report.contentId;
      window.open(`/watch?v=${identifier}`, '_blank');
    }
  };

  const clearFilters = () => {
    setFilterCategory('all');
    setFilterContentType('all');
    setSearchTerm('');
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <div className="max-w-[77rem] mx-auto px-6 py-16">
          <div className="space-y-12">
            <div className="space-y-3">
              <div className="h-9 bg-white/5 rounded w-72 animate-pulse"></div>
              <div className="h-5 bg-white/5 rounded w-96 animate-pulse"></div>
            </div>

            <div className="space-y-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="border border-white/10 rounded-lg p-6 bg-white/[0.02]">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="h-6 w-24 bg-white/5 rounded animate-pulse"></div>
                      <div className="h-6 w-20 bg-white/5 rounded animate-pulse"></div>
                    </div>
                    <div className="h-5 bg-white/5 rounded w-3/4 animate-pulse"></div>
                    <div className="h-4 bg-white/5 rounded w-1/2 animate-pulse"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-[77rem] mx-auto px-6 py-16">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-medium text-white mb-3 tracking-tight">Reports</h1>
          <p className="text-[15px] text-white/50 leading-relaxed">
            Review and manage user-submitted reports across the platform
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-10">
          <div className="border border-white/10 rounded-lg px-5 py-4 bg-white/[0.02]">
            <div className="text-[13px] text-white/40 mb-1">Total Reports</div>
            <div className="text-2xl font-medium text-white">{reports.length}</div>
          </div>
          <div className="border border-white/10 rounded-lg px-5 py-4 bg-white/[0.02]">
            <div className="text-[13px] text-white/40 mb-1">Active Filters</div>
            <div className="text-2xl font-medium text-white">{filteredReports.length}</div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="mb-10 space-y-4">
          <div className="relative">
            <FaSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white/30 w-4 h-4" />
            <input
              type="text"
              placeholder="Search by content, user, or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white/[0.03] border border-white/10 text-white rounded-lg pl-11 pr-4 py-3 text-[15px] focus:outline-none focus:border-white/30 transition-colors placeholder-white/30"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white/[0.03] text-white/70 text-[14px] rounded-lg border border-white/10 hover:bg-white/[0.05] hover:border-white/20 transition-all"
            >
              <FaFilter className="w-3 h-3" />
              Filters
              {showFilters ? <FaChevronUp className="w-3 h-3" /> : <FaChevronDown className="w-3 h-3" />}
            </button>

            {(filterCategory !== 'all' || filterContentType !== 'all' || searchTerm) && (
              <button
                onClick={clearFilters}
                className="px-4 py-2 text-[14px] text-white/70 hover:text-white transition-colors"
              >
                Clear all
              </button>
            )}
          </div>

          {showFilters && (
            <div className="border border-white/10 rounded-lg p-6 bg-white/[0.02]">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-[13px] text-white/60 mb-2 font-medium">Category</label>
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="w-full bg-white/[0.03] border border-white/10 text-white text-[14px] rounded-lg px-3 py-2.5 focus:outline-none focus:border-white/30 transition-colors"
                  >
                    <option value="all">All Categories</option>
                    {reportCategories.map(category => (
                      <option key={category.id} value={category.id}>{category.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[13px] text-white/60 mb-2 font-medium">Content Type</label>
                  <select
                    value={filterContentType}
                    onChange={(e) => setFilterContentType(e.target.value)}
                    className="w-full bg-white/[0.03] border border-white/10 text-white text-[14px] rounded-lg px-3 py-2.5 focus:outline-none focus:border-white/30 transition-colors"
                  >
                    <option value="all">All Types</option>
                    <option value="video">Videos</option>
                    <option value="image">Images</option>
                    <option value="message">Messages</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Reports List */}
        {filteredReports.length === 0 ? (
          <div className="text-center py-20">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/[0.03] border border-white/10 mb-6">
              <i className="ri-flag-line text-2xl text-white/40"></i>
            </div>
            <h3 className="text-lg font-medium text-white mb-2">
              {reports.length === 0 ? 'No reports yet' : 'No matching reports'}
            </h3>
            <p className="text-[15px] text-white/50 max-w-md mx-auto">
              {reports.length === 0 
                ? "No reports have been submitted. They'll appear here once users start reporting content."
                : "Try adjusting your filters or search query to find what you're looking for."
              }
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredReports.map((report) => {
              const categoryData = getCategoryData(report.category);
              const isMessageReport = report.contentType === 'message';
              
              return (
                <div
                  key={report._id}
                  className="border border-white/10 rounded-lg p-6 bg-white/[0.02] transition-all group"
                >
                  {/* Header Row */}
                  <div className="flex items-start justify-between gap-4 mb-5">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[13px] font-medium border ${categoryData.color}`}>
                        <i className={`${categoryData.icon} text-[13px]`}></i>
                        {categoryData.label}
                      </span>
                      
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[13px] border border-white/10 text-white/60">
                        {report.contentType === 'video' ? (
                          <>
                            <FaVideo className="w-3 h-3 text-blue-400" />
                            Video
                          </>
                        ) : report.contentType === 'image' ? (
                          <>
                            <FaImage className="w-3 h-3 text-green-400" />
                            Image
                          </>
                        ) : (
                          <>
                            <i className="ri-chat-3-line text-[13px] text-purple-400"></i>
                            Message
                          </>
                        )}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleViewContent(report)}
                        className={`inline-flex items-center gap-2 px-3.5 py-2 bg-[#1b1b1b] text-[#cecece] text-[13px] font-medium rounded-lg hover:bg-white/10 cursor-pointer transition-all ${isMessageReport ? 'hidden' : ''}`}
                      >
                        <FaEye className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">{isMessageReport ? 'View Chat' : 'View'}</span>
                      </button>
                      
                      <button
                        onClick={() => handleDeleteReport(report._id)}
                        disabled={actionLoading[report._id]}
                        className="inline-flex items-center gap-2 px-3.5 py-2 bg-red-500/10 text-red-400 text-[13px] font-medium rounded-lg cursor-pointer border border-red-500/20 hover:bg-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      >
                        {actionLoading[report._id] ? (
                          <i className="ri-loader-4-line animate-spin text-[14px]"></i>
                        ) : (
                          <FaTrash className="w-3.5 h-3.5" />
                        )}
                        <span className="hidden sm:inline">Delete</span>
                      </button>
                    </div>
                  </div>

                  {/* Content */}
                  {isMessageReport ? (
                    <div className="mb-5">
                      <div className="border-l-2 border-purple-500/50 pl-4 py-1 mb-4 bg-purple-500/5 rounded-r">
                        <p className="text-[14px] text-white/80 leading-relaxed font-mono">
                          "{report.contentSnapshot?.messageContent || 'Message content not available'}"
                        </p>
                      </div>
                      <div className="flex items-center gap-4 text-[13px] text-white/40">
                        <span className="inline-flex items-center gap-1.5">
                          <FaUser className="w-3 h-3" />
                          <span className="text-white/60 hover:text-white cursor-pointer transition-colors" onClick={() => router.push(`/profile?user=${report.contentSnapshot?.senderUsername}`)}>
                            {report.contentSnapshot?.senderUsername || 'Unknown'}
                          </span>
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <i className="ri-chat-3-line"></i>
                          {report.contentSnapshot?.conversationName || 'Unknown Conversation'}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <FaClock className="w-3 h-3" />
                          {getRelativeTime(report.createdAt)}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="mb-5">
                      <h3 className="text-[15px] font-medium text-white mb-3 leading-snug">
                        {report.contentSnapshot?.title || 'Content Title Not Available'}
                      </h3>
                      <div className="flex items-center gap-4 text-[13px] text-white/40">
                        <span className="inline-flex items-center gap-1.5">
                          <FaUser className="w-3 h-3" />
                          <span className="text-white/60 hover:text-white cursor-pointer transition-colors" onClick={() => router.push(`/profile?user=${report.contentSnapshot?.uploaderUsername}`)}>
                            {report.contentSnapshot?.uploaderUsername || 'Unknown'}
                          </span>
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <FaClock className="w-3 h-3" />
                          {getRelativeTime(report.createdAt)}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Footer */}
                  <div className="pt-5 border-t border-white/5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {/* Reporter */}
                      <div>
                        <div className="text-[13px] text-white/40 mb-3 font-medium">Reported By</div>
                        <div className="flex items-center gap-3">
                          <ReporterAvatar reporter={report.reporter} />
                          <div>
                            <div className="text-[14px] text-white font-medium hover:text-white/80 cursor-pointer transition-colors" onClick={() => router.push(`/profile?user=${report.reporter?.username}`)}>
                              {report.reporter?.username || 'Unknown User'}
                            </div>
                            <div className="text-[13px] text-white/40">
                              {report.reporter?.email || 'Email not available'}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Details */}
                      <div>
                        <div className="text-[13px] text-white/40 mb-3 font-medium">Additional Details</div>
                        {report.details ? (
                          <p className="text-[14px] text-white/60 leading-relaxed">
                            {report.details}
                          </p>
                        ) : (
                          <p className="text-[14px] text-white/30 italic">
                            No additional details provided
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPage;
