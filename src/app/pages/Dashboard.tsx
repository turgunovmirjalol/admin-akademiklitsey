import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { Users, UserCog, Newspaper, Bell, Plus, Eye, Loader2, ShieldCheck } from "lucide-react";
import { API_BASE_URL } from "../../config/api";
import { Link } from "react-router";
import { PageSkeleton as SkeletonLoader } from "../components/PageSkeleton";
import { SEO } from "../components/SEO";

interface StatItem {
  label: string;
  value: number | string;
  icon: any;
  color: string;
  path: string;
}

export default function Dashboard() {
  const [stats, setStats] = useState<StatItem[]>([
    { label: "O'qituvchilar", value: "...", icon: UserCog, color: "#0d89b1", path: "/oqituvchilar" },
    { label: "Yangiliklar", value: "...", icon: Newspaper, color: "#0d89b1", path: "/yangiliklar" },
    { label: "E'lonlar", value: "...", icon: Bell, color: "#0d89b1", path: "/elonlar" },
    { label: "Rahbariyat", value: "...", icon: ShieldCheck, color: "#0d89b1", path: "/rahbariyat" },
  ]);

  const [recentNews, setRecentNews] = useState<any[]>([]);
  const [recentAnnouncements, setRecentAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [teachersRes, newsRes, announcementsRes, managementRes] = await Promise.all([
        fetch(`${API_BASE_URL}/teachers`),
        fetch(`${API_BASE_URL}/news`),
        fetch(`${API_BASE_URL}/announcements`),
        fetch(`${API_BASE_URL}/management`),
      ]);

      const [teachersData, newsData, announcementsData, managementData] = await Promise.all([
        teachersRes.json(),
        newsRes.json(),
        announcementsRes.json(),
        managementRes.json(),
      ]);

      const getCount = (data: any) => {
        if (Array.isArray(data)) return data.length;
        if (data && typeof data === 'object' && Array.isArray(data.results)) return data.count || data.results.length;
        return 0;
      };

      const getRecent = (data: any) => {
        const items = Array.isArray(data) ? data : (data?.results || []);
        return items.slice(0, 5);
      };

      setStats([
        { label: "O'qituvchilar", value: getCount(teachersData), icon: UserCog, color: "#0d89b1", path: "/oqituvchilar" },
        { label: "Yangiliklar", value: getCount(newsData), icon: Newspaper, color: "#0d89b1", path: "/yangiliklar" },
        { label: "E'lonlar", value: getCount(announcementsData), icon: Bell, color: "#0d89b1", path: "/elonlar" },
        { label: "Rahbariyat", value: getCount(managementData), icon: ShieldCheck, color: "#0d89b1", path: "/rahbariyat" },
      ]);

      setRecentNews(getRecent(newsData));
      setRecentAnnouncements(getRecent(announcementsData));
    } catch (error) {
      console.error("Dashboard data fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <SkeletonLoader type="dashboard" />;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto overflow-x-hidden"
    >
      <SEO 
        title="Dashboard" 
        description="FDTU Akademik Litseyi boshqaruv paneli asosiy sahifasi. Statistika va so'nggi ma'lumotlar." 
      />
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1f2937] dark:text-gray-100">Dashboard</h1>
          <p className="text-[#64748b] dark:text-gray-400 mt-1">
            Litsey boshqaruv paneliga xush kelibsiz
          </p>
        </div>
        <button 
          onClick={fetchDashboardData}
          className="p-2 text-[#0d89b1] hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Eye className="w-5 h-5" />}
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            to={stat.path}
            className="bg-white dark:bg-[#1f2937] rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md dark:hover:shadow-gray-900 transition-all group"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#64748b] dark:text-gray-400 text-sm font-medium">{stat.label}</p>
                <p className="text-3xl font-bold text-[#1f2937] dark:text-gray-100 mt-2">
                  {stat.value}
                </p>
              </div>
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110"
                style={{ backgroundColor: `${stat.color}15` }}
              >
                <stat.icon className="w-6 h-6" style={{ color: stat.color }} />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-white dark:bg-[#1f2937] rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-[#1f2937] dark:text-gray-100 mb-4">
          Tezkor harakatlar
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link to="/yangiliklar" className="flex items-center gap-3 px-4 py-3 bg-[#0d89b1] text-white rounded-lg hover:bg-[#0a6d8f] transition-colors shadow-sm">
            <Plus className="w-5 h-5" />
            <span className="text-sm font-medium">Yangilik qo'shish</span>
          </Link>
          <Link to="/elonlar" className="flex items-center gap-3 px-4 py-3 bg-[#0d89b1] text-white rounded-lg hover:bg-[#0a6d8f] transition-colors shadow-sm">
            <Plus className="w-5 h-5" />
            <span className="text-sm font-medium">E'lon qo'shish</span>
          </Link>
          <Link to="/oqituvchilar" className="flex items-center gap-3 px-4 py-3 bg-[#0d89b1] text-white rounded-lg hover:bg-[#0a6d8f] transition-colors shadow-sm">
            <Plus className="w-5 h-5" />
            <span className="text-sm font-medium">O'qituvchi qo'shish</span>
          </Link>
          <Link to="/rahbariyat" className="flex items-center gap-3 px-4 py-3 bg-[#0d89b1] text-white rounded-lg hover:bg-[#0a6d8f] transition-colors shadow-sm">
            <Plus className="w-5 h-5" />
            <span className="text-sm font-medium">Rahbar qo'shish</span>
          </Link>
        </div>
      </div>

      {/* Recent Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent News */}
        <div className="bg-white dark:bg-[#1f2937] rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-[#1f2937] dark:text-gray-100 mb-4">
            So'ngi yangiliklar
          </h2>
          <div className="space-y-3">
            {recentNews.length > 0 ? (
              recentNews.map((news) => (
                <div
                  key={news.id}
                  className="flex items-start justify-between p-3 bg-[#f8fafc] dark:bg-gray-800/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-[#1f2937] dark:text-gray-100 line-clamp-1">
                      {news.translations?.uz?.title || "Sarlavha yo'q"}
                    </h3>
                    <p className="text-xs text-[#64748b] dark:text-gray-400 mt-1">
                      {new Date(news.created_at || news.published_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded ${
                    news.status === "published" 
                    ? "bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400" 
                    : "bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400"
                  }`}>
                    {news.status === "published" ? "Faol" : "Qoralama"}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-[#64748b] dark:text-gray-400 text-center py-4">Yangiliklar topilmadi</p>
            )}
          </div>
        </div>

        {/* Recent Announcements */}
        <div className="bg-white dark:bg-[#1f2937] rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-[#1f2937] dark:text-gray-100 mb-4">
            So'ngi e'lonlar
          </h2>
          <div className="space-y-3">
            {recentAnnouncements.length > 0 ? (
              recentAnnouncements.map((announcement) => (
                <div
                  key={announcement.id}
                  className="flex items-start justify-between p-3 bg-[#f8fafc] dark:bg-gray-800/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-[#1f2937] dark:text-gray-100 line-clamp-1">
                      {announcement.translations?.uz?.title || "Sarlavha yo'q"}
                    </h3>
                    <p className="text-xs text-[#64748b] dark:text-gray-400 mt-1">
                      {new Date(announcement.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  {announcement.is_important && (
                    <span className="px-2 py-1 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-xs rounded">
                      Muhim
                    </span>
                  )}
                </div>
              ))
            ) : (
              <p className="text-sm text-[#64748b] dark:text-gray-400 text-center py-4">E'lonlar topilmadi</p>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
