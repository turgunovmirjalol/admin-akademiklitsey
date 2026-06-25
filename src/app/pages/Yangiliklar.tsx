import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { Plus, Search, Edit, Trash2, X, Loader2 } from "lucide-react";
import { Dialog } from "../components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "../components/ui/alert-dialog";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { ImageUpload } from "../components/ImageUpload";
import { toast } from "sonner";
import { API_BASE_URL, getImageUrl } from "../../config/api";
import { PageSkeleton as SkeletonLoader, TableRowSkeleton } from "../components/PageSkeleton";
import { SEO } from "../components/SEO";

interface NewsTranslation {
  title: string;
  content: string;
}

interface News {
  id: number;
  slug: string;
  translations: {
    uz: NewsTranslation;
    uz_cyrl: NewsTranslation;
    ru: NewsTranslation;
  };
  image: string;
  views_count: number;
  status: "draft" | "published";
  status_display: string;
  published_at: string;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export default function Yangiliklar() {
  const [news, setNews] = useState<News[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNews, setEditingNews] = useState<News | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [activeTab, setActiveTab] = useState<"uz" | "ru">("uz");
  
  const [formData, setFormData] = useState({
    status: "published",
    published_at: new Date().toISOString().split("T")[0],
    title_uz: "",
    title_ru: "",
    content_uz: "",
    content_ru: "",
    image: null as File | string | null,
  });

  const languages = [
    { id: "uz", label: "O'zbekcha" },
    { id: "ru", label: "Русский" },
  ] as const;

  useEffect(() => {
    fetchNews();
  }, []);

  const fetchNews = async () => {
    setLoading(true);
    try {
      const token = sessionStorage.getItem("auth_token");
      const response = await fetch(`${API_BASE_URL}/news`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      
      if (response.ok) {
        // API javobi massiv bo'lsa uni ishlatamiz, agar pagination bo'lsa results maydonini olamiz
        if (Array.isArray(data)) {
          setNews(data);
        } else if (data && typeof data === "object" && Array.isArray(data.results)) {
          setNews(data.results);
        } else {
          console.warn("API response format error (not array or results):", data);
          setNews([]);
        }
      } else {
        console.error("API error response:", data);
        toast.error(data.detail || "Yangiliklarni yuklashda xatolik");
        setNews([]);
      }
    } catch (error) {
      console.error("Network or parsing error:", error);
      toast.error("Server bilan bog'lanishda xatolik");
      setNews([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredNews = Array.isArray(news) 
    ? news.filter((item) => {
        const title = item?.translations?.uz?.title || "";
        return title.toLowerCase().includes(searchQuery.toLowerCase());
      })
    : [];

  const handleAdd = () => {
    setEditingNews(null);
    setFormData({
      status: "published",
      published_at: new Date().toISOString().split("T")[0],
      title_uz: "",
      title_ru: "",
      content_uz: "",
      content_ru: "",
      image: null,
    });
    setIsModalOpen(true);
  };

  const handleEdit = (item: News) => {
    setEditingNews(item);
    setFormData({
      status: item.status,
      published_at: item.published_at ? item.published_at.split("T")[0] : new Date().toISOString().split("T")[0],
      title_uz: item.translations?.uz?.title || "",
      title_ru: item.translations?.ru?.title || "",
      content_uz: item.translations?.uz?.content || "",
      content_ru: item.translations?.ru?.content || "",
      image: getImageUrl(item.image),
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (slug: string) => {
    try {
      const token = sessionStorage.getItem("auth_token");
      const response = await fetch(`${API_BASE_URL}/news/${slug}/`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        toast.success("Yangilik o'chirildi");
        fetchNews();
      } else {
        toast.error("O'chirishda xatolik yuz berdi");
      }
    } catch (error) {
      toast.error("Server bilan bog'lanishda xatolik");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setUploadProgress(0);

    const token = sessionStorage.getItem("auth_token");
    const data = new FormData();

    data.append("status", formData.status);

    // published_at ISO format (Backend uchun ISO string)
    const publishedAt = new Date(formData.published_at);
    if (!isNaN(publishedAt.getTime())) {
      data.append("published_at", publishedAt.toISOString());
    }

    // Required field title_uz
    if (formData.title_uz) data.append("title_uz", formData.title_uz);
    if (formData.title_ru) data.append("title_ru", formData.title_ru);

    if (formData.content_uz) data.append("content_uz", formData.content_uz);
    if (formData.content_ru) data.append("content_ru", formData.content_ru);

    if (formData.image instanceof File) {
      data.append("image", formData.image);
    }

    const uploadWithXHR = () => {
      return new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        
        xhr.upload.addEventListener("progress", (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded / event.total) * 100);
            setUploadProgress(progress);
          }
        });

        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            const errorData = JSON.parse(xhr.responseText || "{}");
            reject(new Error(errorData.detail || "Server xatosi"));
          }
        });

        xhr.addEventListener("error", () => reject(new Error("Tarmoq xatosi")));

        const url = editingNews
          ? `${API_BASE_URL}/news/${editingNews.slug}/`
          : `${API_BASE_URL}/news/`;
        const method = editingNews ? "PATCH" : "POST";

        xhr.open(method, url);
        xhr.setRequestHeader("Authorization", `Bearer ${token}`);
        xhr.send(data);
      });
    };

    try {
      await uploadWithXHR();
      setUploadProgress(100);
      toast.success(editingNews ? "Yangilik tahrirlandi" : "Yangilik qo'shildi");
      setTimeout(() => {
        setIsModalOpen(false);
        setUploadProgress(0);
      }, 500);
      fetchNews();
    } catch (error: any) {
      toast.error(error.message || "Server bilan bog'lanishda xatolik");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <SkeletonLoader type="table" />;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto overflow-x-hidden"
    >
      <SEO 
        title="Yangiliklar" 
        description="FDTU Akademik Litseyining so'nggi yangiliklari va muhim voqealari." 
        keywords="Yangiliklar, Litsey, FDTU, Voqealar"
      />
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1f2937] dark:text-gray-100">Yangiliklar</h1>
          <p className="text-[#64748b] dark:text-gray-400 mt-1">Yangiliklar boshqaruvi</p>
        </div>
        <button
          onClick={handleAdd}
          className="flex items-center gap-2 px-4 py-2 bg-[#0d89b1] text-white rounded-lg hover:bg-[#0a6d8f] transition-colors"
        >
          <Plus className="w-5 h-5" />
          Yangi yangilik qo'shish
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white dark:bg-[#1f2937] rounded-lg border border-gray-200 dark:border-gray-700 p-4 transition-colors">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#64748b] dark:text-gray-400" />
            <input
              type="text"
              placeholder="Yangilik qidirish..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[#f8fafc] dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:border-[#0d89b1] dark:text-gray-100 dark:placeholder-gray-500"
            />
          </div>
        </div>
      </div>

      {/* News Table */}
      <div className="bg-white dark:bg-[#1f2937] rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden transition-colors">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#f8fafc] dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-[#64748b] dark:text-gray-400 uppercase tracking-wider">
                  Rasm
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-[#64748b] dark:text-gray-400 uppercase tracking-wider">
                  Sarlavha (UZ)
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-[#64748b] dark:text-gray-400 uppercase tracking-wider">
                  Sana
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-[#64748b] dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-[#64748b] dark:text-gray-400 uppercase tracking-wider">
                  Harakatlar
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <TableRowSkeleton columns={5} />
              ) : filteredNews.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center">
                    <p className="text-sm text-[#64748b] dark:text-gray-400">Yangiliklar topilmadi</p>
                  </td>
                </tr>
              ) : (
                filteredNews.map((item) => (
                  <tr key={item.id} className="hover:bg-[#f8fafc] dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <ImageWithFallback
                        src={getImageUrl(item.image)}
                        alt={item.translations?.uz?.title}
                        className="w-16 h-12 object-cover rounded"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-[#1f2937] dark:text-gray-100">
                        {item.translations?.uz?.title}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-[#64748b] dark:text-gray-400">
                        {item.published_at ? new Date(item.published_at).toLocaleDateString() : "-"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 text-xs rounded ${
                          item.status === "published"
                            ? "bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400"
                            : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400"
                        }`}
                      >
                        {item.status === "published" ? "Nashr qilingan" : "Qoralama"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEdit(item)}
                          className="p-2 text-[#0d89b1] hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <button className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Yangilikni o'chirish</AlertDialogTitle>
                              <AlertDialogDescription>
                                Rostdan ham ushbu yangilikni o'chirmoqchimisiz? Bu amal ortga qaytarilmaydi.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Bekor qilish</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(item.slug)} className="bg-red-600 hover:bg-red-700">
                                Ha, o'chirish
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-[#1f2937] rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto border dark:border-gray-700 shadow-2xl transition-all animate-in fade-in zoom-in duration-200">
              <div className="sticky top-0 bg-white/80 dark:bg-[#1f2937]/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-700 px-8 py-6 flex items-center justify-between z-10">
                <h2 className="text-2xl font-bold text-[#1f2937] dark:text-gray-100">
                  {editingNews ? "Yangilikni tahrirlash" : "Yangi yangilik qo'shish"}
                </h2>
                <div className="flex items-center gap-4">
                  <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
                    {languages.map((lang) => (
                      <button
                        key={lang.id}
                        type="button"
                        onClick={() => setActiveTab(lang.id as "uz" | "ru")}
                        className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                          activeTab === lang.id
                            ? "bg-white dark:bg-gray-700 text-[#0d89b1] shadow-sm"
                            : "text-gray-500 hover:text-gray-700 dark:text-gray-400"
                        }`}
                      >
                        {lang.label}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors text-[#64748b] dark:text-gray-400"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>
              
              <form onSubmit={handleSubmit} className="p-8 space-y-8">

                {/* Language Specific Fields */}
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                      Sarlavha ({activeTab.toUpperCase()}) {activeTab === "uz" && "*"}
                    </label>
                    <input
                      type="text"
                      value={activeTab === "uz" ? formData.title_uz : formData.title_ru}
                      onChange={(e) => {
                        const field = `title_${activeTab}` as keyof typeof formData;
                        setFormData({ ...formData, [field]: e.target.value });
                      }}
                      className="w-full px-5 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-4 focus:ring-[#0d89b1]/10 focus:border-[#0d89b1] outline-none transition-all dark:text-gray-100"
                      required={activeTab === "uz"}
                      placeholder={`${activeTab.toUpperCase()} tilida sarlavha...`}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                      To'liq matn ({activeTab.toUpperCase()}) {activeTab === "uz" && "*"}
                    </label>
                    <textarea
                      value={activeTab === "uz" ? formData.content_uz : formData.content_ru}
                      onChange={(e) => {
                        const field = `content_${activeTab}` as keyof typeof formData;
                        setFormData({ ...formData, [field]: e.target.value });
                      }}
                      rows={8}
                      className="w-full px-5 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-4 focus:ring-[#0d89b1]/10 focus:border-[#0d89b1] outline-none transition-all dark:text-gray-100"
                      required={activeTab === "uz"}
                      placeholder={`${activeTab.toUpperCase()} tilida to'liq matn...`}
                    />
                  </div>
                </div>

                <div className="pt-4">
                  <ImageUpload
                    label="Asosiy rasm"
                    value={formData.image}
                    onChange={(file) => setFormData({ ...formData, image: file as File })}
                    placeholder="Yangilik rasmini yuklash uchun bosing"
                    isUploading={isSubmitting}
                    uploadProgress={uploadProgress}
                  />
                </div>

                <div className="flex justify-end gap-4 pt-8 border-t border-gray-100 dark:border-gray-700">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-8 py-3 text-sm font-bold text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                  >
                    Bekor qilish
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex items-center gap-2 px-12 py-3 bg-[#0d89b1] text-white font-bold rounded-xl hover:bg-[#0a6d8f] transition-all shadow-xl shadow-[#0d89b1]/20 active:scale-[0.98] disabled:opacity-50"
                  >
                    {isSubmitting && <Loader2 className="w-5 h-5 animate-spin" />}
                    {editingNews ? "Saqlash" : "Qo'shish"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </Dialog>
      )}
    </motion.div>
  );
}
