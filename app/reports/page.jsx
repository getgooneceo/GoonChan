"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import NavBar from "@/components/NavBar";
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
  const [user, setUser] = useState(null);
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
    const identifier = report.contentSnapshot?.slug || report.contentId;
    window.open(`/watch?v=${identifier}`, '_blank');
  };

  const clearFilters = () => {
    setFilterCategory('all');
    setFilterContentType('all');
    setSearchTerm('');
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-[#080808] via-[#0a0a0a] to-[#0c0c0c] min-h-screen">
        <NavBar user={user} setUser={setUser} showCategories={false} />
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="space-y-8">
            <div className="space-y-4">
              <div className="h-8 bg-[#1a1a1a] rounded-md w-80 animate-pulse"></div>
              <div className="h-4 bg-[#1a1a1a] rounded-md w-64 animate-pulse"></div>
            </div>

            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="bg-[#121212] rounded-lg p-6 border border-[#2a2a2a]/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-6 bg-[#1a1a1a] rounded-md animate-pulse"></div>
                    <div className="space-y-2">
                      <div className="h-4 bg-[#1a1a1a] rounded-md w-48 animate-pulse"></div>
                      <div className="h-3 bg-[#1a1a1a] rounded-md w-32 animate-pulse"></div>
                    </div>
                  </div>
                  <div className="flex space-x-3">
                    <div className="h-8 bg-[#1a1a1a] rounded-md w-20 animate-pulse"></div>
                    <div className="h-8 bg-[#1a1a1a] rounded-md w-16 animate-pulse"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-[#080808] via-[#0a0a0a] to-[#0c0c0c] min-h-screen">
      <NavBar user={user} setUser={setUser} showCategories={false} />

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <h1 className="text-3xl font-semibold text-white mb-1">Report Management</h1>
              <p className="text-white/60">Review and manage user reports</p>
            </div>

            <div className="flex gap-4">
              <div className="bg-[#121212] border border-[#2a2a2a]/50 rounded-lg px-4 py-3">
                <div className="text-white/60 text-xs">Total Reports</div>
                <div className="text-white font-semibold text-lg">{reports.length}</div>
              </div>
              <div className="bg-[#121212] border border-[#2a2a2a]/50 rounded-lg px-4 py-3">
                <div className="text-white/60 text-xs">Filtered</div>
                <div className="text-[#ea4197] font-semibold text-lg">{filteredReports.length}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="mb-8 space-y-4">
          <div className="relative">
            <FaSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white/40" />
            <input
              type="text"
              placeholder="Search reports..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#121212] border border-[#2a2a2a]/50 text-white rounded-lg pl-10 pr-4 py-3 focus:outline-none focus:border-[#ea4197]/50 transition-colors placeholder-white/40"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 bg-[#1a1a1a] text-white/70 rounded-lg hover:bg-[#2a2a2a] transition-colors"
            >
              <FaFilter />
              Filters
              {showFilters ? <FaChevronUp /> : <FaChevronDown />}
            </button>

            {(filterCategory !== 'all' || filterContentType !== 'all' || searchTerm) && (
              <button
                onClick={clearFilters}
                className="px-4 py-2 bg-[#ea4197] text-white rounded-lg hover:bg-[#d63384] transition-colors"
              >
                Clear Filters
              </button>
            )}
          </div>

          {showFilters && (
            <div className="bg-[#121212] border border-[#2a2a2a]/50 rounded-lg p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-white font-medium mb-2 text-sm">Category</label>
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a]/50 text-white rounded-lg px-3 py-2 focus:outline-none focus:border-[#ea4197]/50"
                  >
                    <option value="all">All Categories</option>
                    {reportCategories.map(category => (
                      <option key={category.id} value={category.id}>{category.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-white font-medium mb-2 text-sm">Content Type</label>
                  <select
                    value={filterContentType}
                    onChange={(e) => setFilterContentType(e.target.value)}
                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a]/50 text-white rounded-lg px-3 py-2 focus:outline-none focus:border-[#ea4197]/50"
                  >
                    <option value="all">All Types</option>
                    <option value="video">Videos</option>
                    <option value="image">Images</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Reports List */}
        {filteredReports.length === 0 ? (
          <div className="text-center py-16">
            <div className="bg-[#121212] border border-[#2a2a2a]/50 rounded-lg p-8 max-w-md mx-auto">
              <i className="ri-flag-line text-4xl text-[#ea4197] mb-4"></i>
              <h3 className="text-lg font-semibold text-white mb-2">
                {reports.length === 0 ? 'No Reports Found' : 'No Matching Reports'}
              </h3>
              <p className="text-white/60 text-sm">
                {reports.length === 0 
                  ? "No reports to review at the moment."
                  : "Try adjusting your filters to find what you're looking for."
                }
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredReports.map((report) => {
              const categoryData = getCategoryData(report.category);
              
              return (
                <div
                  key={report._id}
                  className="bg-[#121212] border border-[#2a2a2a]/50 rounded-lg p-6 transition-colors"
                >
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                    <div className="flex flex-col gap-3 flex-1">
                      <div className="flex items-start gap-4">
                        <div className={`flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-medium border ${categoryData.color}`}>
                          <i className={`${categoryData.icon}`}></i>
                          <span>{categoryData.label}</span>
                        </div>
                        
                        {/* <div className="flex items-center gap-2 text-white/60 text-xs">
                          {report.contentType === 'video' ? (
                            <FaVideo className="text-blue-400" />
                          ) : (
                            <FaImage className="text-green-400" />
                          )}
                          <span className="capitalize">{report.contentType}</span>
                        </div> */}
                      </div>

                      {/* Content Info */}
                      <div>
                        <h3 className="text-white text-lg font-semibold mb-2">
                          {report.contentSnapshot?.title || 'Content Title Not Available'}
                        </h3>
                        <div className="flex flex-wrap items-center gap-4 text-white/60 text-xs">
                          <div className="flex items-center gap-1">
                            <FaUser />
                            <span>by <span className="text-white/80 hover:text-white/100 transition-colors cursor-pointer" onClick={() => router.push(`/profile?user=${report.contentSnapshot?.uploaderUsername}`)}>{report.contentSnapshot?.uploaderUsername || 'Unknown'}</span></span>
                          </div>
                          <div className="flex items-center gap-1">
                            <FaClock />
                            <span>Reported {getRelativeTime(report.createdAt)}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <button
                        onClick={() => handleViewContent(report)}
                        className="flex items-center gap-2 cursor-pointer px-4 py-2 bg-[#ea4197] hover:bg-[#d63384] text-white rounded-lg transition-colors text-sm"
                      >
                        <FaEye />
                        <span className="hidden sm:inline">View</span>
                      </button>
                      
                      <button
                        onClick={() => handleDeleteReport(report._id)}
                        disabled={actionLoading[report._id]}
                        className="flex items-center gap-2 cursor-pointer px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white rounded-lg transition-colors text-sm disabled:cursor-not-allowed"
                      >
                        {actionLoading[report._id] ? (
                          <i className="ri-loader-4-line animate-spin"></i>
                        ) : (
                          <FaTrash />
                        )}
                        <span className="hidden sm:inline">Delete Report</span>
                      </button>
                    </div>
                  </div>

                  {/* Report Details */}
                  <div className="mt-6 pt-4 border-t border-[#2a2a2a]/50">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {/* Reporter Info */}
                      <div className="bg-[#1a1a1a] rounded-lg p-4">
                        <h4 className="text-white font-medium mb-3 text-sm flex items-center gap-2">
                          <i className="ri-user-line text-[#ea4197]"></i>
                          Reported By
                        </h4>
                        <div className="flex items-center gap-3">
                          <ReporterAvatar reporter={report.reporter} />
                          <div>
                            <div className="text-white text-sm font-medium hover:text-white/80 transition-colors cursor-pointer" onClick={() => router.push(`/profile?user=${report.reporter?.username}`)}>
                              {report.reporter?.username || 'Unknown User'}
                            </div>
                            <div className="text-white/60 text-xs">
                              {report.reporter?.email || 'Email not available'}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Additional Details */}
                      <div className="bg-[#1a1a1a] rounded-lg p-4">
                        <h4 className="text-white font-medium mb-3 text-sm">Additional Details</h4>
                        {report.details ? (
                          <p className="text-white/80 text-xs leading-relaxed">
                            {report.details}
                          </p>
                        ) : (
                          <p className="text-white/40 text-xs italic">
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
