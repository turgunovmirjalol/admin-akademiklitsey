import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { Plus, Search, Edit, Trash2, X, Loader2, Film, Save, Play, Maximize2 } from "lucide-react";
import { toast } from "sonner";
import { VIDEOS_URL, getImageUrl, parseApiErrors, parseListResponse } from "../../config/api";
import { PageSkeleton as SkeletonLoader } from "../components/PageSkeleton";
import { VideoUpload, ImageUpload } from "../components/ImageUpload";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { SEO } from "../components/SEO";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../components/ui/dialog";

interface VideoItem {
  id: number;
  translations: {
    uz: { title: string; description: string };
    ru?: { title: string; description: string };
  };
  video_file: string;
  thumbnail?: string;
  is_active?: boolean;
  sort_order?: number;
}

export default function Videolar() {
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVideo, setEditingVideo] = useState<VideoItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"uz" | "ru">("uz");
  const [playingVideo, setPlayingVideo] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title_uz: "",
    title_ru: "",
    description_uz: "",
    description_ru: "",
    is_active: true,
    sort_order: 0,
    video_file: null as File | string | null,
    thumbnail: null as File | string | null,
  });

  const languages = [
    { id: "uz", label: "O'zbekcha" },
    { id: "ru", label: "Русский" },
  ] as const;

  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    setLoading(true);
    try {
      const token = sessionStorage.getItem("auth_token");
      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const response = await fetch(VIDEOS_URL, { headers });
      if (response.ok) {
        const data = await response.json();
        const list = parseListResponse<VideoItem>(data)
          .map((v) => ({
            ...v,
            video_file: getImageUrl(v.video_file),
            thumbnail: v.thumbnail ? getImageUrl(v.thumbnail) : undefined,
          }))
          .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
        setVideos(list);
      }
    } catch {
      toast.error("Videolarni yuklashda xatolik");
    } finally {
      setLoading(false);
    }
  };

  const filteredVideos = videos.filter((v) =>
    (v.translations.uz.title || "").toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleAdd = () => {
    setEditingVideo(null);
    setFormData({
      title_uz: "",
      title_ru: "",
      description_uz: "",
      description_ru: "",
      is_active: true,
      sort_order: videos.length,
      video_file: null,
      thumbnail: null,
    });
    setUploadProgress(null);
    setIsModalOpen(true);
  };

  const handleEdit = async (video: VideoItem) => {
    const token = sessionStorage.getItem("auth_token");
    if (!token) {
      toast.error("Avtorizatsiya talab qilinadi");
      return;
    }

    try {
      const response = await fetch(`${VIDEOS_URL}${video.id}/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        toast.error("Video ma'lumotlarini yuklashda xatolik");
        return;
      }

      const data: VideoItem = await response.json();
      setEditingVideo(data);
      setFormData({
        title_uz: data.translations?.uz?.title || "",
        title_ru: data.translations?.ru?.title || "",
        description_uz: data.translations?.uz?.description || "",
        description_ru: data.translations?.ru?.description || "",
        is_active: data.is_active !== false,
        sort_order: data.sort_order || 0,
        video_file: data.video_file ? getImageUrl(data.video_file) : null,
        thumbnail: data.thumbnail ? getImageUrl(data.thumbnail) : null,
      });
      setUploadProgress(null);
      setIsModalOpen(true);
    } catch {
      toast.error("Server bilan bog'lanishda xatolik");
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const token = sessionStorage.getItem("auth_token");
      if (!token) {
        toast.error("Avtorizatsiya talab qilinadi");
        return;
      }
      const response = await fetch(`${VIDEOS_URL}${id}/`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        toast.success("Video o'chirildi");
        fetchVideos();
      } else if (response.status === 401 || response.status === 403) {
        toast.error("Ruxsat yo'q");
      } else {
        let errData: unknown;
        try {
          errData = await response.json();
        } catch {
          errData = null;
        }
        toast.error(parseApiErrors(errData));
      }
    } catch {
      toast.error("Server bilan bog'lanishda xatolik");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title_uz) {
      toast.error("Sarlavha (UZ) majburiy");
      return;
    }

    if (!editingVideo && !formData.video_file) {
      toast.error("Iltimos, video fayl yuklang");
      return;
    }

    setIsSubmitting(true);
    setUploadProgress(0);

    const token = sessionStorage.getItem("auth_token");
    if (!token) {
      toast.error("Avtorizatsiya talab qilinadi");
      return;
    }

    const data = new FormData();
    data.append("title_uz", formData.title_uz);
    data.append("title_ru", formData.title_ru);
    data.append("description_uz", formData.description_uz);
    data.append("description_ru", formData.description_ru);
    data.append("is_active", formData.is_active ? "true" : "false");
    data.append("sort_order", String(formData.sort_order));

    if (formData.video_file instanceof File) {
      data.append("video_file", formData.video_file);
    }
    if (formData.thumbnail instanceof File) {
      data.append("thumbnail", formData.thumbnail);
    }

    const url = editingVideo ? `${VIDEOS_URL}${editingVideo.id}/` : VIDEOS_URL;
    const method = editingVideo ? "PATCH" : "POST";

    try {
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open(method, url);
        xhr.setRequestHeader("Authorization", `Bearer ${token}`);
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            setUploadProgress(percent);
          }
        };
        xhr.onreadystatechange = () => {
          if (xhr.readyState === 4) {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve();
            } else {
              try {
                const errorData = JSON.parse(xhr.responseText || "{}");
                reject(new Error(parseApiErrors(errorData)));
              } catch {
                reject(new Error("Server xatosi"));
              }
            }
          }
        };
        xhr.onerror = () => reject(new Error("Tarmoq xatosi"));
        xhr.send(data);
      });

      toast.success(editingVideo ? "Video tahrirlandi" : "Video qo'shildi");
      setUploadProgress(100);
      setTimeout(() => {
        setIsModalOpen(false);
        setUploadProgress(null);
      }, 500);
      fetchVideos();
    } catch (error: any) {
      toast.error(error?.message || "Video yuklashda xatolik");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <SkeletonLoader type="grid" />;
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto overflow-x-hidden">
      <SEO 
        title="Videolar" 
        description="FDTU Akademik Litseyi videolavhalari." 
      />
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Video lavhalar</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Galereyadagi videolarni boshqarish
          </p>
        </div>
        <button
          onClick={handleAdd}
          className="flex items-center gap-2 px-6 py-2.5 bg-[#0d89b1] text-white font-bold rounded-lg hover:bg-[#0a6d8f] transition-all shadow-md active:scale-95"
        >
          <Plus className="w-5 h-5" />
          Yangi video
        </button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Videolarni qidirish..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-[#0d89b1]/20 focus:border-[#0d89b1] transition-all"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence>
          {filteredVideos.map((video) => (
            <motion.div
              key={video.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="group bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all"
            >
              <div className="aspect-video bg-black relative overflow-hidden group/player">
                {video.thumbnail ? (
                  <ImageWithFallback
                    src={video.thumbnail}
                    alt={video.translations?.uz?.title || "Video"}
                    className="w-full h-full"
                    objectFit="contain"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-900">
                    <Film className="w-12 h-12 text-gray-300" />
                  </div>
                )}
                
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                  <button
                    onClick={() => setPlayingVideo(video.video_file)}
                    className="p-4 bg-white/20 backdrop-blur-md text-white rounded-full hover:bg-[#0d89b1] transition-all transform scale-90 group-hover:scale-100"
                  >
                    <Play className="w-8 h-8 fill-current" />
                  </button>
                </div>

                <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleEdit(video)}
                    className="p-2 bg-white/90 dark:bg-gray-800/90 text-[#0d89b1] rounded-lg hover:bg-white transition-colors shadow-lg"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button className="p-2 bg-white/90 dark:bg-gray-800/90 text-red-600 rounded-lg hover:bg-white transition-colors shadow-lg">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Videoni o'chirish</AlertDialogTitle>
                        <AlertDialogDescription>
                          Rostdan ham ushbu videoni o'chirmoqchimisiz?
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Bekor qilish</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(video.id)}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Ha, o'chirish
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
              
              <div className="p-5 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-bold text-gray-900 dark:text-white text-lg line-clamp-1">
                    {video.translations?.uz?.title || "Nomsiz video"}
                  </h3>
                  <span className={`w-2 h-2 rounded-full ${video.is_active ? 'bg-green-500' : 'bg-red-500'}`} />
                </div>
                {video.translations?.uz?.description && (
                  <p className="text-gray-500 dark:text-gray-400 text-sm line-clamp-2">
                    {video.translations.uz.description}
                  </p>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {filteredVideos.length === 0 && !loading && (
          <div className="col-span-full py-20 flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
            <Film className="w-16 h-16 mb-4 opacity-20" />
            <p className="font-medium">Videolar topilmadi</p>
          </div>
        )}
      </div>

      {/* Upload/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingVideo ? "Videoni tahrirlash" : "Yangi video qo'shish"}
            </DialogTitle>
            <DialogDescription>
              Video haqidagi ma'lumotlarni kiriting va faylni yuklang.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-8 py-4">
            <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg w-fit">
              {languages.map((lang) => (
                <button
                  key={lang.id}
                  type="button"
                  onClick={() => setActiveTab(lang.id)}
                  className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${
                    activeTab === lang.id
                      ? "bg-white dark:bg-gray-700 text-[#0d89b1] shadow-sm"
                      : "text-gray-500 hover:text-gray-700 dark:text-gray-400"
                  }`}
                >
                  {lang.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                    Sarlavha ({activeTab.toUpperCase()}) *
                  </label>
                  <input
                    type="text"
                    value={formData[`title_${activeTab}` as keyof typeof formData] as string}
                    onChange={(e) => {
                      setFormData({ ...formData, [`title_${activeTab}`]: e.target.value });
                    }}
                    className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-[#0d89b1]/20 focus:border-[#0d89b1]"
                    placeholder={`Video nomi (${activeTab.toUpperCase()})`}
                    required={activeTab === "uz"}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                    Tavsif ({activeTab.toUpperCase()})
                  </label>
                  <textarea
                    value={formData[`description_${activeTab}` as keyof typeof formData] as string}
                    onChange={(e) => {
                      setFormData({ ...formData, [`description_${activeTab}`]: e.target.value });
                    }}
                    rows={4}
                    className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-[#0d89b1]/20 focus:border-[#0d89b1] resize-none"
                    placeholder={`Video tavsifi (${activeTab.toUpperCase()})`}
                  />
                </div>
                
                <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                  <input
                    type="checkbox"
                    id="is_active_video"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-5 h-5 rounded text-[#0d89b1] focus:ring-[#0d89b1]"
                  />
                  <label htmlFor="is_active_video" className="text-sm font-bold text-gray-700 dark:text-gray-300 cursor-pointer">
                    Faol holatda (Saytda ko'rinadi)
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                    Tartib raqami
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={formData.sort_order}
                    onChange={(e) => setFormData({ ...formData, sort_order: Number(e.target.value) || 0 })}
                    className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-[#0d89b1]/20 focus:border-[#0d89b1]"
                  />
                </div>
              </div>

              <div className="space-y-6">
                <VideoUpload
                  label="Video fayl *"
                  value={formData.video_file}
                  onChange={(file) => setFormData({ ...formData, video_file: file as File })}
                  placeholder="Video yuklash uchun bosing"
                  maxSizeMB={1000}
                  isUploading={isSubmitting}
                  uploadProgress={uploadProgress || 0}
                />
                
                <ImageUpload
                  label="Muqova rasmi (Thumbnail)"
                  value={formData.thumbnail}
                  onChange={(file) => setFormData({ ...formData, thumbnail: file as File })}
                  placeholder="Video muqovasi (ixtiyoriy)"
                  isUploading={isSubmitting}
                />
              </div>
            </div>

            {isSubmitting && uploadProgress !== null && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold text-[#0d89b1]">
                  <span>Video yuklanmoqda...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2 overflow-hidden border border-gray-200 dark:border-gray-700">
                  <motion.div
                    className="h-full bg-[#0d89b1] rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${uploadProgress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-6 border-t border-gray-100 dark:border-gray-700">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-6 py-2 text-sm font-bold text-gray-500 hover:text-gray-700 transition-colors"
              >
                Bekor qilish
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2 px-10 py-2 bg-[#0d89b1] text-white font-bold rounded-lg hover:bg-[#0a6d8f] transition-all disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                {editingVideo ? "Saqlash" : "Yuklash"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Video Player Modal */}
      <Dialog open={!!playingVideo} onOpenChange={() => setPlayingVideo(null)}>
        <DialogContent className="sm:max-w-5xl p-0 overflow-hidden bg-black border-none shadow-2xl">
          <DialogHeader className="sr-only">
            <DialogTitle>Video Player</DialogTitle>
            <DialogDescription>Video tomosha qilish</DialogDescription>
          </DialogHeader>
          {playingVideo && (
            <div className="relative aspect-video w-full flex items-center justify-center">
              <video
                src={playingVideo}
                controls
                autoPlay
                className="w-full h-full"
              />
              <button
                onClick={() => setPlayingVideo(null)}
                className="absolute top-4 right-4 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors z-50"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
