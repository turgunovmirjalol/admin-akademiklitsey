import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { Plus, Search, Trash2, X, Loader2, Image as ImageIcon, Maximize2, Edit, Save } from "lucide-react";
import { toast } from "sonner";
import {
  GALLERY_ALBUMS_URL,
  getImageUrl,
  parseApiErrors,
  parseListResponse,
  toDateInputValue,
} from "../../config/api";
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

interface AlbumTranslations {
  uz: { title: string; description?: string };
  ru?: { title: string; description?: string };
}

interface GalleryAlbum {
  id: number;
  slug: string;
  translations: AlbumTranslations;
  cover_image: string | null;
  event_date: string | null;
  photos_count?: number;
  is_active: boolean;
  sort_order: number;
}

interface AlbumFormData {
  title_uz: string;
  title_ru: string;
  description_uz: string;
  description_ru: string;
  event_date: string;
  is_active: boolean;
  sort_order: number;
  cover_image: File | string | null;
  images: File[] | null;
}

const emptyFormData = (): AlbumFormData => ({
  title_uz: "",
  title_ru: "",
  description_uz: "",
  description_ru: "",
  event_date: new Date().toISOString().split("T")[0],
  is_active: true,
  sort_order: 0,
  cover_image: null,
  images: null,
});

function getAlbumTitle(album: GalleryAlbum): string {
  return album.translations?.uz?.title || "";
}

function parseAlbumToForm(album: GalleryAlbum): AlbumFormData {
  return {
    title_uz: album.translations?.uz?.title || "",
    title_ru: album.translations?.ru?.title || "",
    description_uz: album.translations?.uz?.description || "",
    description_ru: album.translations?.ru?.description || "",
    event_date: toDateInputValue(album.event_date) || new Date().toISOString().split("T")[0],
    is_active: album.is_active ?? true,
    sort_order: album.sort_order ?? 0,
    cover_image: album.cover_image ? getImageUrl(album.cover_image) : null,
    images: null,
  };
}

function buildAlbumFormData(form: AlbumFormData, includeCover = true): FormData {
  const data = new FormData();
  data.append("title_uz", form.title_uz);
  data.append("title_ru", form.title_ru);
  data.append("description_uz", form.description_uz);
  data.append("description_ru", form.description_ru);
  data.append("event_date", form.event_date);
  data.append("is_active", form.is_active ? "true" : "false");
  data.append("sort_order", String(form.sort_order));
  if (includeCover && form.cover_image instanceof File) {
    data.append("cover_image", form.cover_image);
  }
  return data;
}

export default function Galereya() {
  const [albums, setAlbums] = useState<GalleryAlbum[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAlbum, setEditingAlbum] = useState<GalleryAlbum | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [formData, setFormData] = useState<AlbumFormData>(emptyFormData());

  useEffect(() => {
    fetchAlbums();
  }, []);

  const fetchAlbums = async () => {
    setLoading(true);
    try {
      const token = sessionStorage.getItem("auth_token");
      const headers: Record<string, string> = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
      const response = await fetch(GALLERY_ALBUMS_URL, { headers });
      if (response.ok) {
        const data = await response.json();
        setAlbums(parseListResponse<GalleryAlbum>(data));
      } else {
        toast.error("Albomlarni yuklashda xatolik");
      }
    } catch {
      toast.error("Albomlarni yuklashda xatolik");
    } finally {
      setLoading(false);
    }
  };

  const filteredAlbums = albums.filter((album) =>
    getAlbumTitle(album).toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleAdd = () => {
    setEditingAlbum(null);
    setFormData({ ...emptyFormData(), sort_order: albums.length });
    setIsModalOpen(true);
  };

  const handleEdit = async (album: GalleryAlbum) => {
    const token = sessionStorage.getItem("auth_token");
    if (!token) {
      toast.error("Avtorizatsiya talab qilinadi");
      return;
    }

    try {
      const response = await fetch(`${GALLERY_ALBUMS_URL}${album.slug}/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data: GalleryAlbum = await response.json();
        setEditingAlbum(data);
        setFormData(parseAlbumToForm(data));
        setIsModalOpen(true);
      } else {
        toast.error("Albom ma'lumotlarini yuklashda xatolik");
      }
    } catch {
      toast.error("Server bilan bog'lanishda xatolik");
    }
  };

  const handleDelete = async (slug: string) => {
    try {
      const token = sessionStorage.getItem("auth_token");
      if (!token) {
        toast.error("Avtorizatsiya talab qilinadi");
        return;
      }
      const response = await fetch(`${GALLERY_ALBUMS_URL}${slug}/`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        toast.success("Albom o'chirildi");
        fetchAlbums();
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
      toast.error("Xatolik yuz berdi");
    }
  };

  const uploadBulkPhotos = async (slug: string, files: File[], token: string) => {
    const data = new FormData();
    files.forEach((file) => data.append("images", file));

    const response = await fetch(`${GALLERY_ALBUMS_URL}${slug}/photos/bulk/`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: data,
    });

    if (!response.ok) {
      let errData: unknown;
      try {
        errData = await response.json();
      } catch {
        errData = null;
      }
      throw new Error(parseApiErrors(errData));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title_uz) {
      toast.error("Sarlavha (UZ) majburiy");
      return;
    }

    const token = sessionStorage.getItem("auth_token");
    if (!token) {
      toast.error("Avtorizatsiya talab qilinadi");
      return;
    }

    if (!editingAlbum) {
      const images = formData.images || [];
      const coverFile =
        formData.cover_image instanceof File
          ? formData.cover_image
          : images[0] || null;

      if (!coverFile) {
        toast.error("Iltimos, kamida bitta rasm tanlang");
        return;
      }

      setIsSubmitting(true);
      setUploadProgress(10);

      try {
        const createData = buildAlbumFormData({ ...formData, cover_image: coverFile });
        createData.set("cover_image", coverFile);

        const response = await fetch(GALLERY_ALBUMS_URL, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: createData,
        });

        if (!response.ok) {
          let errData: unknown;
          try {
            errData = await response.json();
          } catch {
            errData = null;
          }
          toast.error(parseApiErrors(errData));
          return;
        }

        const album: GalleryAlbum = await response.json();
        setUploadProgress(50);

        const extraImages = images.filter((img) => img !== coverFile);
        if (extraImages.length > 0) {
          await uploadBulkPhotos(album.slug, extraImages, token);
        }

        setUploadProgress(100);
        toast.success("Albom yaratildi");
        setIsModalOpen(false);
        setFormData(emptyFormData());
        fetchAlbums();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Yuklashda xatolik");
      } finally {
        setIsSubmitting(false);
        setUploadProgress(0);
      }
      return;
    }

    setIsSubmitting(true);
    try {
      const data = buildAlbumFormData(formData);
      const response = await fetch(`${GALLERY_ALBUMS_URL}${editingAlbum.slug}/`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
        body: data,
      });

      if (response.ok) {
        if (formData.images && formData.images.length > 0) {
          await uploadBulkPhotos(editingAlbum.slug, formData.images, token);
        }
        toast.success("Albom yangilandi");
        setIsModalOpen(false);
        fetchAlbums();
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
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Saqlashda xatolik");
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

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Fotosuratlar</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Rasmlar galereyasini boshqarish</p>
        </div>
        <button
          onClick={handleAdd}
          className="flex items-center gap-2 px-6 py-2.5 bg-[#0d89b1] text-white font-bold rounded-lg hover:bg-[#0a6d8f] transition-all shadow-md active:scale-95"
        >
          <Plus className="w-5 h-5" />
          Albom qo'shish
        </button>
      </div>

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

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        <AnimatePresence>
          {filteredAlbums.map((album) => (
            <motion.div
              key={album.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="group relative aspect-square bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700"
            >
              <ImageWithFallback
                src={getImageUrl(album.cover_image)}
                alt={getAlbumTitle(album) || "Fotosurat"}
                className="w-full h-full cursor-pointer transition-transform duration-300 group-hover:scale-105"
                objectFit="contain"
                onClick={() => setSelectedPhoto(getImageUrl(album.cover_image))}
              />

              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                <button
                  onClick={() => setSelectedPhoto(getImageUrl(album.cover_image))}
                  className="p-2 bg-white/20 backdrop-blur-md text-white rounded-lg hover:bg-white/30 transition-colors"
                >
                  <Maximize2 className="w-5 h-5" />
                </button>
                <button
                  onClick={() => handleEdit(album)}
                  className="p-2 bg-white/20 backdrop-blur-md text-white rounded-lg hover:bg-white/30 transition-colors"
                >
                  <Edit className="w-5 h-5" />
                </button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button className="p-2 bg-red-500/80 backdrop-blur-md text-white rounded-lg hover:bg-red-600 transition-colors">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Albomni o'chirish</AlertDialogTitle>
                      <AlertDialogDescription>
                        Rostdan ham ushbu albomni o'chirmoqchimisiz?
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Bekor qilish</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDelete(album.slug)}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Ha, o'chirish
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>

              <div className="absolute bottom-2 left-2 right-2 flex justify-between items-end gap-2">
                <div className="px-2 py-0.5 bg-black/50 backdrop-blur-md text-[10px] text-white rounded truncate max-w-[70%]">
                  {getAlbumTitle(album) || "Nomsiz"}
                </div>
                {album.event_date && (
                  <div className="px-2 py-0.5 bg-black/50 backdrop-blur-md text-[10px] text-white rounded shrink-0">
                    {album.event_date}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {filteredAlbums.length === 0 && !loading && (
          <div className="col-span-full py-20 flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
            <ImageIcon className="w-12 h-12 mb-2 opacity-20" />
            <p>Albomlar topilmadi</p>
          </div>
        )}
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingAlbum ? "Albomni tahrirlash" : "Yangi albom qo'shish"}</DialogTitle>
            <DialogDescription>
              Albom ma'lumotlarini kiriting va rasmlarni yuklang.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Sarlavha (UZ) *</label>
                <input
                  type="text"
                  value={formData.title_uz}
                  onChange={(e) => setFormData({ ...formData, title_uz: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-[#0d89b1]/20 focus:border-[#0d89b1]"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Sarlavha (RU)</label>
                <input
                  type="text"
                  value={formData.title_ru}
                  onChange={(e) => setFormData({ ...formData, title_ru: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-[#0d89b1]/20 focus:border-[#0d89b1]"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Sana</label>
              <input
                type="date"
                value={formData.event_date}
                onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-[#0d89b1]/20 focus:border-[#0d89b1]"
              />
            </div>

            {editingAlbum ? (
              <ImageUpload
                label="Muqova rasmi (ixtiyoriy)"
                value={formData.cover_image}
                onChange={(file) => setFormData({ ...formData, cover_image: file as File })}
                placeholder="Yangi muqova yuklash"
                isUploading={isSubmitting}
              />
            ) : null}

            <ImageUpload
              label={editingAlbum ? "Qo'shimcha rasmlar" : "Rasmlarni tanlang *"}
              multiple
              value={formData.images}
              onChange={(files) => setFormData({ ...formData, images: files as File[] })}
              placeholder={editingAlbum ? "Albomga qo'shimcha rasmlar" : "Bir nechta rasm yuklashingiz mumkin"}
              isUploading={isSubmitting}
            />

            {isSubmitting && uploadProgress > 0 && (
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

            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-6 py-2 text-sm font-bold text-gray-500 hover:text-gray-700"
              >
                Bekor qilish
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2 px-8 py-2 bg-[#0d89b1] text-white font-bold rounded-lg hover:bg-[#0a6d8f] disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {editingAlbum ? "Saqlash" : "Yuklash"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 overflow-hidden bg-transparent border-none shadow-none flex items-center justify-center">
          <DialogHeader className="sr-only">
            <DialogTitle>Rasm ko'rish</DialogTitle>
            <DialogDescription>Tanlangan rasmni to'liq o'lchamda ko'rish</DialogDescription>
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
