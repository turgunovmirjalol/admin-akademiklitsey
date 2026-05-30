import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { ArrowLeft, Camera, Image as ImageIcon, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { API_BASE_URL, getImageUrl } from "../../config/api";
import { ImageUpload } from "../components/ImageUpload";
import { PageSkeleton as SkeletonLoader } from "../components/PageSkeleton";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { SEO } from "../components/SEO";

interface Album {
  id: number;
  slug: string;
  title_uz: string;
  description_uz: string;
  cover_image: string;
  event_date: string;
}

interface AlbumPhoto {
  id: number;
  image: string;
  thumbnail?: string;
  caption?: string;
  sort_order?: number;
}

export default function AlbomRasmlari() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const [album, setAlbum] = useState<Album | null>(null);
  const [photos, setPhotos] = useState<AlbumPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    images: null as File[] | null,
    caption: "",
  });

  useEffect(() => {
    if (!slug) return;
    fetchAlbumAndPhotos(slug);
  }, [slug]);

  const fetchAlbumAndPhotos = async (albumSlug: string) => {
    setLoading(true);
    try {
      const token = sessionStorage.getItem("auth_token");

      const [albumRes, photosRes] = await Promise.all([
        fetch(`${API_BASE_URL}/gallery/albums/${albumSlug}/`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE_URL}/gallery/albums/${albumSlug}/photos`, {
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => null), // Catch network errors
      ]);

      if (albumRes.ok) {
        const albumData = await albumRes.json();
        setAlbum(albumData);
        
        // Agar rasmlar album ma'lumotlari ichida bo'lsa
        if (albumData.photos && Array.isArray(albumData.photos)) {
          setPhotos(albumData.photos);
          return;
        }
      } else {
        toast.error("Albom ma'lumotlarini yuklashda xatolik");
      }

      if (photosRes && photosRes.ok) {
        const photosData = await photosRes.json();
        const list = Array.isArray(photosData) ? photosData : photosData.results || [];
        setPhotos(list);
      } else if (photosRes && photosRes.status === 405) {
        // Agar 405 bo'lsa, demak bu endpoint GET ni qo'llab-quvvatlamaydi
        // Balki rasmlar boshqa endpointda yoki album ichidadir
        console.warn("Photos endpoint returned 405. Trying to get photos from album detail...");
      } else {
        toast.error("Rasmlar ro'yxatini yuklashda xatolik");
      }
    } catch {
      toast.error("Server bilan bog'lanishda xatolik");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slug) return;

    if (!formData.images || formData.images.length === 0) {
      toast.error("Iltimos, kamida bitta rasm tanlang");
      return;
    }

    setIsSubmitting(true);
    setUploadProgress(0);

    const token = sessionStorage.getItem("auth_token");
    const data = new FormData();

    formData.images.forEach((file) => {
      data.append("images", file);
    });
    
    if (formData.caption) {
      data.append("caption", formData.caption);
    }

    const url = `${API_BASE_URL}/gallery/albums/${slug}/photos/bulk`;

    try {
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", url);
        if (token) {
          xhr.setRequestHeader("Authorization", `Bearer ${token}`);
        }
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
                const errorResponse = JSON.parse(xhr.responseText);
                reject(new Error(errorResponse.detail || "Yuklashda xatolik"));
              } catch {
                reject(new Error("Yuklashda xatolik"));
              }
            }
          }
        };
        xhr.onerror = () => reject(new Error("Tarmoq xatosi"));
        xhr.send(data);
      });

      toast.success(`${formData.images.length} ta rasm muvaffaqiyatli qo'shildi`);
      setFormData({
        images: null,
        caption: "",
      });
      fetchAlbumAndPhotos(slug);
    } catch (error: any) {
      toast.error(error?.message || "Rasm yuklashda xatolik");
    } finally {
      setIsSubmitting(false);
      setUploadProgress(null);
    }
  };

  if (loading || !album) {
    return <SkeletonLoader type="grid" />;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto overflow-x-hidden"
    >
      <SEO 
        title={album?.title_uz || "Albom rasmlari"}
        description={album?.description_uz || "Albomdagi barcha rasmlarni ko'rish va boshqarish."}
      />
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/galereya")}
            className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-[#1f2937] dark:text-gray-100">
              {album.title_uz}
            </h1>
            <p className="text-xs text-[#64748b] dark:text-gray-400 mt-1">
              Albom rasmlarini boshqarish
            </p>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-3 text-xs text-[#64748b] dark:text-gray-400">
          <Camera className="w-4 h-4" />
          <span>{photos.length} ta rasm</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="relative w-full rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-black">
            <img
              src={getImageUrl(album.cover_image)}
              alt={album.title_uz}
              className="w-full h-64 object-cover opacity-80"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
            <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-white">{album.title_uz}</h2>
                <p className="text-xs text-gray-200 line-clamp-2 mt-1">
                  {album.description_uz}
                </p>
              </div>
              <span className="px-3 py-1 rounded-full bg-white/10 border border-white/20 text-xs text-gray-100">
                {album.event_date}
              </span>
            </div>
          </div>

          {photos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl bg-gray-50/60 dark:bg-gray-800/40">
              <ImageIcon className="w-12 h-12 text-gray-300 mb-3" />
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                Hozircha bu albomda rasm yo'q
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                O'ng tomondagi formadan foydalanib rasm qo'shing
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {photos.map((photo) => (
                <div
                  key={photo.id}
                  className="group relative rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-900"
                >
                  <ImageWithFallback
                    src={getImageUrl(photo.thumbnail || photo.image)}
                    alt={photo.caption || ""}
                    className="w-full h-40"
                    objectFit="cover"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity" />
                  {photo.caption && (
                    <div className="absolute bottom-0 left-0 right-0 p-3 text-[11px] text-gray-100 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
                      {photo.caption}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="p-6 bg-white dark:bg-[#1f2937] rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-5">
            <h3 className="text-sm font-bold text-[#1f2937] dark:text-gray-100 flex items-center gap-2">
              <span className="w-1.5 h-5 rounded-full bg-[#0d89b1]" />
              Yangi rasm qo'shish
            </h3>

            <form onSubmit={handleSubmit} className="space-y-5">
              <ImageUpload
                label="Rasmlarni tanlang *"
                value={formData.images}
                onChange={(files: File | File[] | null) => setFormData({ ...formData, images: files as File[] })}
                placeholder="Bir nechta rasm yuklash uchun bosing"
                multiple
                isUploading={isSubmitting}
                uploadProgress={uploadProgress || 0}
              />

              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                  Umumiy izoh (ixtiyoriy)
                </label>
                <input
                  type="text"
                  value={formData.caption}
                  onChange={(e) => setFormData({ ...formData, caption: e.target.value })}
                  className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs focus:ring-4 focus:ring-[#0d89b1]/10 focus:border-[#0d89b1] outline-none transition-all"
                  placeholder="Barcha rasmlar uchun umumiy tavsif"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#0d89b1] text-white text-sm font-bold rounded-xl hover:bg-[#0a6d8f] transition-all shadow-lg shadow-[#0d89b1]/20 active:scale-[0.98] disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Saqlash
              </button>
            </form>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
