import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { Plus, Search, Trash2, X, Loader2, Image as ImageIcon, Maximize2 } from "lucide-react";
import { toast } from "sonner";
import { API_BASE_URL, getImageUrl } from "../../config/api";
import { ImageUpload } from "../components/ImageUpload";
import { PageSkeleton as SkeletonLoader } from "../components/PageSkeleton";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../components/ui/dialog";

interface Photo {
  id: number;
  slug: string;
  title_uz: string;
  cover_image: string;
  event_date: string;
  is_active: boolean;
}

export default function Galereya() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [formData, setFormData] = useState({
    images: null as File[] | null,
    event_date: new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    fetchPhotos();
  }, []);

  const fetchPhotos = async () => {
    setLoading(true);
    try {
      const token = sessionStorage.getItem("auth_token");
      const response = await fetch(`${API_BASE_URL}/gallery/albums/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setPhotos(Array.isArray(data) ? data : data.results || []);
      }
    } catch (error) {
      toast.error("Rasmlarni yuklashda xatolik");
    } finally {
      setLoading(false);
    }
  };

  const filteredPhotos = photos.filter((p) =>
    (p.title_uz || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDelete = async (slug: string) => {
    try {
      const token = sessionStorage.getItem("auth_token");
      const response = await fetch(`${API_BASE_URL}/gallery/albums/${slug}/`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        toast.success("Rasm o'chirildi");
        fetchPhotos();
      } else {
        const errData = await response.json().catch(() => ({}));
        toast.error(errData.detail || "O'chirishda xatolik yuz berdi");
      }
    } catch (error) {
      toast.error("Xatolik yuz berdi");
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.images || formData.images.length === 0) {
      toast.error("Iltimos, rasm tanlang");
      return;
    }

    setIsSubmitting(true);
    setUploadProgress(0);
    const token = sessionStorage.getItem("auth_token");
    let successCount = 0;

    const uploadFile = (file: File, index: number, total: number) => {
      return new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        const data = new FormData();
        data.append("title_uz", "Fotosurat");
        data.append("title_ru", "Фотография");
        data.append("title_en", "Photo");
        data.append("title_uz_cyrl", "Фотосурат");
        data.append("description_uz", "");
        data.append("description_ru", "");
        data.append("description_en", "");
        data.append("description_uz_cyrl", "");
        data.append("event_date", formData.event_date);
        data.append("is_active", "true");
        data.append("sort_order", "0");
        data.append("cover_image", file);

        xhr.upload.addEventListener("progress", (event) => {
          if (event.lengthComputable) {
            // Calculate progress for the current file and add it to the base progress
            const fileProgress = (event.loaded / event.total) * 100;
            const overallProgress = Math.round(((index / total) * 100) + (fileProgress / total));
            setUploadProgress(overallProgress);
          }
        });

        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            successCount++;
            resolve();
          } else {
            const errorData = JSON.parse(xhr.responseText || "{}");
            console.error("Upload error details:", errorData);
            reject(new Error(errorData.detail || "Server xatosi"));
          }
        });

        xhr.addEventListener("error", () => reject(new Error("Tarmoq xatosi")));
        
        xhr.open("POST", `${API_BASE_URL}/gallery/albums/`);
        xhr.setRequestHeader("Authorization", `Bearer ${token}`);
        xhr.send(data);
      });
    };

    try {
      const total = formData.images.length;
      for (let i = 0; i < total; i++) {
        await uploadFile(formData.images[i], i, total);
      }

      if (successCount > 0) {
        setUploadProgress(100);
        toast.success(`${successCount} ta rasm yuklandi`);
        setTimeout(() => {
          setIsUploadModalOpen(false);
          setUploadProgress(0);
        }, 500);
        setFormData({
          images: null,
          event_date: new Date().toISOString().split("T")[0],
        });
        fetchPhotos();
      }
    } catch (error: any) {
      toast.error(error.message || "Yuklashda xatolik");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <SkeletonLoader type="grid" />;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <SEO 
        title="Galereya" 
        description="FDTU Akademik Litseyi hayotidan yorqin lavhalar va fotogalereya." 
        keywords="Galereya, Rasmlar, Litsey, FDTU"
      />
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Fotosuratlar
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Rasmlar galereyasini boshqarish
          </p>
        </div>
        <button
          onClick={() => setIsUploadModalOpen(true)}
          className="flex items-center gap-2 px-6 py-2.5 bg-[#0d89b1] text-white font-bold rounded-lg hover:bg-[#0a6d8f] transition-all shadow-md active:scale-95"
        >
          <Plus className="w-5 h-5" />
          Rasm qo'shish
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Qidirish..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-[#0d89b1]/20 focus:border-[#0d89b1] transition-all"
        />
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        <AnimatePresence>
          {filteredPhotos.map((photo) => (
            <motion.div
              key={photo.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="group relative aspect-square bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700"
            >
              <ImageWithFallback
                src={getImageUrl(photo.cover_image)}
                alt="Fotosurat"
                className="w-full h-full cursor-pointer transition-transform duration-300 group-hover:scale-105"
                objectFit="contain"
                onClick={() => setSelectedPhoto(getImageUrl(photo.cover_image))}
              />

              {/* Overlay Actions */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                <button
                  onClick={() =>
                    setSelectedPhoto(getImageUrl(photo.cover_image))
                  }
                  className="p-2 bg-white/20 backdrop-blur-md text-white rounded-lg hover:bg-white/30 transition-colors"
                >
                  <Maximize2 className="w-5 h-5" />
                </button>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button className="p-2 bg-red-500/80 backdrop-blur-md text-white rounded-lg hover:bg-red-600 transition-colors">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Rasmni o'chirish</AlertDialogTitle>
                      <AlertDialogDescription>
                        Rostdan ham ushbu rasmni o'chirmoqchimisiz?
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Bekor qilish</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDelete(photo.slug)}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Ha, o'chirish
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>

              <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/50 backdrop-blur-md text-[10px] text-white rounded">
                {photo.event_date}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {filteredPhotos.length === 0 && !loading && (
          <div className="col-span-full py-20 flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
            <ImageIcon className="w-12 h-12 mb-2 opacity-20" />
            <p>Rasmlar topilmadi</p>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      <Dialog open={isUploadModalOpen} onOpenChange={setIsUploadModalOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Yangi rasm yuklash</DialogTitle>
            <DialogDescription>
              Galereyaga yangi rasmlarni qo'shish uchun quyidagi formani to'ldiring.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <form onSubmit={handleUpload} className="space-y-6">
              <ImageUpload
                label="Rasmlarni tanlang"
                multiple
                value={formData.images}
                onChange={(files) =>
                  setFormData({ ...formData, images: files as File[] })
                }
                placeholder="Bir nechta rasm yuklashingiz mumkin"
                isUploading={isSubmitting}
              />

              {isSubmitting && (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold text-[#0d89b1]">
                    <span>Yuklanmoqda...</span>
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

              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 dark:text-gray-300">
                  Sana
                </label>
                <input
                  type="date"
                  value={formData.event_date}
                  onChange={(e) =>
                    setFormData({ ...formData, event_date: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-[#0d89b1]/20 focus:border-[#0d89b1]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-6 py-2 text-sm font-bold text-gray-500 hover:text-gray-700"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-8 py-2 bg-[#0d89b1] text-white font-bold rounded-lg hover:bg-[#0a6d8f] disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Yuklash"
                  )}
                </button>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      {/* Image Preview Modal */}
      <Dialog
        open={!!selectedPhoto}
        onOpenChange={() => setSelectedPhoto(null)}
      >
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 overflow-hidden bg-transparent border-none shadow-none flex items-center justify-center">
          <DialogHeader className="sr-only">
            <DialogTitle>Rasm ko'rish</DialogTitle>
            <DialogDescription>
              Tanlangan rasmni to'liq o'lchamda ko'rish
            </DialogDescription>
          </DialogHeader>
          {selectedPhoto && (
            <div className="relative w-full h-full flex items-center justify-center p-4">
              <ImageWithFallback
                src={selectedPhoto}
                alt="Kattalashtirilgan rasm"
                className="max-w-full max-h-[90vh] rounded-lg shadow-2xl"
                objectFit="contain"
              />
              <button
                onClick={() => setSelectedPhoto(null)}
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
