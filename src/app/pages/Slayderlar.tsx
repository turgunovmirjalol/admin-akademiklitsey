import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { Plus, Search, Edit, Trash2, X, Loader2, Layout, Save } from "lucide-react";
import { toast } from "sonner";
import { API_BASE_URL, getImageUrl } from "../../config/api";
import { ImageUpload, VideoUpload } from "../components/ImageUpload";
import { PageSkeleton as SkeletonLoader } from "../components/PageSkeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "../components/ui/alert-dialog";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { SEO } from "../components/SEO";

interface Slider {
  id: number;
  image: string;
  video?: string;
  translations: {
    uz: { title: string; description: string };
    ru: { title: string; description: string };
    en?: { title: string; description: string };
    uz_cyrl?: { title: string; description: string };
  };
  sort_order: number;
  is_active: boolean;
}

export default function Slayderlar() {
  const [sliders, setSliders] = useState<Slider[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSlider, setEditingSlider] = useState<Slider | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [activeTab, setActiveTab] = useState<"uz" | "ru">("uz");

  const [formData, setFormData] = useState({
    title_uz: "",
    title_ru: "",
    description_uz: "",
    description_ru: "",
    sort_order: 0,
    is_active: true,
    image: null as File | string | null,
    video: null as File | string | null,
  });

  const languages = [
    { id: "uz", label: "O'zbekcha" },
    { id: "ru", label: "Русский" },
  ] as const;

  useEffect(() => {
    fetchSliders();
  }, []);

  const fetchSliders = async () => {
    setLoading(true);
    try {
      const token = sessionStorage.getItem("auth_token");
      const response = await fetch(`${API_BASE_URL}/sliders`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setSliders(Array.isArray(data) ? data : data.results || []);
      }
    } catch (error) {
      toast.error("Slayderlarni yuklashda xatolik");
    } finally {
      setLoading(false);
    }
  };

  const filteredSliders = sliders.filter((s) =>
    (s.translations?.uz?.title || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAdd = () => {
    setEditingSlider(null);
    setFormData({
      title_uz: "",
      title_ru: "",
      description_uz: "",
      description_ru: "",
      sort_order: sliders.length,
      is_active: true,
      image: null,
      video: null,
    });
    setIsModalOpen(true);
  };

  const handleEdit = (slider: Slider) => {
    setEditingSlider(slider);
    setFormData({
      title_uz: slider.translations?.uz?.title || "",
      title_ru: slider.translations?.ru?.title || "",
      description_uz: slider.translations?.uz?.description || "",
      description_ru: slider.translations?.ru?.description || "",
      sort_order: slider.sort_order || 0,
      is_active: slider.is_active,
      image: getImageUrl(slider.image),
      video: slider.video ? getImageUrl(slider.video) : null,
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    try {
      const token = sessionStorage.getItem("auth_token");
      const response = await fetch(`${API_BASE_URL}/sliders/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        toast.success("Slayder o'chirildi");
        fetchSliders();
      }
    } catch (error) {
      toast.error("Xatolik yuz berdi");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingSlider && !formData.image) {
      toast.error("Iltimos, slayder rasmini yuklang");
      return;
    }

    setIsSubmitting(true);
    setUploadProgress(0);

    const token = sessionStorage.getItem("auth_token");
    const data = new FormData();
    
    data.append("title_uz", formData.title_uz);
    data.append("title_ru", formData.title_ru);
    // Optional fields
    data.append("title_en", "");
    data.append("title_uz_cyrl", "");
    data.append("description_uz", formData.description_uz);
    data.append("description_ru", formData.description_ru);
    data.append("description_en", "");
    data.append("description_uz_cyrl", "");
    data.append("sort_order", String(formData.sort_order));
    data.append("is_active", formData.is_active ? "true" : "false");

    if (formData.image instanceof File) {
      data.append("image", formData.image);
    }

    if (formData.video instanceof File) {
      data.append("video", formData.video);
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
            try {
              const errorData = JSON.parse(xhr.responseText || "{}");
              let errorMsg = "Xatolik yuz berdi";
              if (errorData && typeof errorData === "object") {
                const firstKey = Object.keys(errorData)[0];
                const error = errorData[firstKey];
                errorMsg = Array.isArray(error) ? `${firstKey}: ${error[0]}` : (errorData.detail || errorMsg);
              }
              reject(new Error(errorMsg));
            } catch {
              reject(new Error("Server xatosi"));
            }
          }
        });

        xhr.addEventListener("error", () => reject(new Error("Tarmoq xatosi")));

        const url = editingSlider
          ? `${API_BASE_URL}/sliders/${editingSlider.id}/`
          : `${API_BASE_URL}/sliders/`;
        const method = editingSlider ? "PATCH" : "POST";

        xhr.open(method, url);
        xhr.setRequestHeader("Authorization", `Bearer ${token}`);
        xhr.send(data);
      });
    };

    try {
      await uploadWithXHR();
      setUploadProgress(100);
      toast.success(editingSlider ? "Slayder tahrirlandi" : "Slayder qo'shildi");
      setTimeout(() => {
        setIsModalOpen(false);
        setUploadProgress(0);
      }, 500);
      fetchSliders();
    } catch (error: any) {
      toast.error(error.message || "Server bilan bog'lanishda xatolik");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <SkeletonLoader type="list" />;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto overflow-x-hidden"
    >
      <SEO 
        title="Slayderlar" 
        description="Asosiy sahifa slayderlarini boshqarish." 
      />
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-[#1f2937] p-5 md:p-6 rounded-lg shadow-sm border border-gray-100 dark:border-gray-800">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">Hero Slayderlar</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Asosiy sahifadagi aylanib turuvchi slayderlarni boshqarish
          </p>
        </div>
        <button
          onClick={handleAdd}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#0d89b1] text-white font-bold rounded-lg hover:bg-[#0a6d8f] transition-all shadow-lg shadow-[#0d89b1]/20 active:scale-[0.98] w-full sm:w-auto justify-center text-sm md:text-base"
        >
          <Plus className="w-5 h-5" />
          Yangi slayder
        </button>
      </div>

      {/* Search */}
      <div className="relative group max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-[#0d89b1] transition-colors" />
        <input
          type="text"
          placeholder="Slayderlarni qidirish..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-2.5 bg-white dark:bg-[#1f2937] border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-4 focus:ring-[#0d89b1]/10 focus:border-[#0d89b1] outline-none transition-all shadow-sm text-sm"
        />
      </div>

      {/* List */}
      <div className="grid grid-cols-1 gap-4 md:gap-6">
        {filteredSliders.map((slider) => (
          <div
            key={slider.id}
            className="group bg-white dark:bg-[#1f2937] border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all relative flex flex-col md:flex-row"
          >
            <div className="w-full md:w-72 lg:w-96 aspect-video md:aspect-auto relative overflow-hidden">
              <ImageWithFallback
                src={getImageUrl(slider.image)}
                alt={slider.translations?.uz?.title}
                className="w-full h-full"
                objectFit="contain"
              />
              <div className="absolute inset-0 bg-black/20" />
            </div>

            <div className="flex-1 p-5 md:p-8 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-bold text-gray-900 dark:text-white text-lg md:text-xl">
                        {slider.translations?.uz?.title}
                      </h3>
                      <span className={`w-2.5 h-2.5 rounded-full ${slider.is_active ? 'bg-green-500' : 'bg-red-500'}`} />
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed line-clamp-3">
                      {slider.translations?.uz?.description || "Tavsif berilmagan."}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => handleEdit(slider)}
                      className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-md hover:bg-blue-100 transition-colors shadow-sm"
                    >
                      <Edit className="w-4 h-4 md:w-5 md:h-5" />
                    </button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button className="p-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-md hover:bg-red-100 transition-colors shadow-sm">
                          <Trash2 className="w-4 h-4 md:w-5 md:h-5" />
                        </button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Slayderni o'chirish</AlertDialogTitle>
                          <AlertDialogDescription>
                            Rostdan ham ushbu slayderni o'chirmoqchimisiz? Bu amal ortga qaytarilmaydi.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Bekor qilish</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(slider.id)} className="bg-red-600 hover:bg-red-700">
                            Ha, o'chirish
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-6 pt-4 md:pt-6 mt-4 md:mt-6 border-t border-gray-50 dark:border-gray-800">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Tartib raqami:</span>
                  <span className="text-xs md:text-sm font-bold text-gray-900 dark:text-gray-200">{slider.sort_order}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Holati:</span>
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${slider.is_active ? 'text-green-600' : 'text-red-600'}`}>
                    {slider.is_active ? 'Faol' : 'Nofaol'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}

        {filteredSliders.length === 0 && (
          <div className="py-20 flex flex-col items-center justify-center bg-gray-50/50 dark:bg-gray-800/30 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg text-sm md:text-base">
            <Layout className="w-16 h-16 text-gray-300 mb-4" />
            <p className="text-gray-500 dark:text-gray-400 font-bold">Slayderlar topilmadi</p>
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-white dark:bg-[#1f2937] w-full max-w-5xl max-h-[90vh] overflow-hidden rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 animate-in fade-in zoom-in duration-200 flex flex-col">
            <div className="sticky top-0 bg-white/80 dark:bg-[#1f2937]/80 backdrop-blur-md px-6 md:px-10 py-6 md:py-8 border-b border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 z-10">
              <h3 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
                {editingSlider ? "Slayderni tahrirlash" : "Yangi slayder qo'shish"}
              </h3>
              <div className="flex items-center gap-4 w-full sm:w-auto justify-between">
                <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                  {languages.map((lang) => (
                    <button
                      key={lang.id}
                      type="button"
                      onClick={() => setActiveTab(lang.id as "uz" | "ru")}
                      className={`px-3 md:px-4 py-1.5 md:py-2 text-xs font-bold rounded-md transition-all ${
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
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 md:w-6 md:h-6" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 md:p-10 space-y-8 md:space-y-10 overflow-y-auto">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12">
                {/* Language Specific Fields */}
                <div className="space-y-6 md:space-y-8">
                  <div className="p-6 md:p-8 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-700 space-y-6">
                    <h4 className="text-xs font-bold text-[#0d89b1] uppercase tracking-widest flex items-center gap-2">
                      <span className="w-4 h-[1px] bg-[#0d89b1]" />
                      {languages.find(l => l.id === activeTab)?.label} tilidagi ma'lumotlar
                    </h4>
                    
                    <div className="space-y-6">
                      <div>
                        <label className="block text-xs md:text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                          Sarlavha ({activeTab.toUpperCase()}) {activeTab === "uz" && "*"}
                        </label>
                        <input
                          type="text"
                          value={formData[`title_${activeTab}` as keyof typeof formData] as string}
                          onChange={(e) => {
                            const field = `title_${activeTab}` as keyof typeof formData;
                            setFormData({ ...formData, [field]: e.target.value });
                          }}
                          className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-4 focus:ring-[#0d89b1]/10 focus:border-[#0d89b1] outline-none transition-all text-sm"
                          required={activeTab === "uz"}
                          placeholder={`Sarlavha...`}
                        />
                      </div>
                      <div>
                        <label className="block text-xs md:text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                          Tavsif ({activeTab.toUpperCase()})
                        </label>
                        <textarea
                          value={formData[`description_${activeTab}` as keyof typeof formData] as string}
                          onChange={(e) => {
                            const field = `description_${activeTab}` as keyof typeof formData;
                            setFormData({ ...formData, [field]: e.target.value });
                          }}
                          rows={4}
                          className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-4 focus:ring-[#0d89b1]/10 focus:border-[#0d89b1] outline-none transition-all resize-none text-sm"
                          placeholder={`Tavsif...`}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-6">
                    <div className="flex flex-col justify-end">
                      <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700 h-[52px]">
                        <input
                          type="checkbox"
                          id="is_active_slider"
                          checked={formData.is_active}
                          onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                          className="w-5 h-5 rounded text-[#0d89b1] focus:ring-[#0d89b1]"
                        />
                        <label htmlFor="is_active_slider" className="text-sm font-bold text-gray-700 dark:text-gray-300 cursor-pointer">
                          Faol holatda
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Image & Video Upload */}
                <div className="space-y-6">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <span className="w-4 h-[1px] bg-gray-300" />
                    Slayder rasmi
                  </h4>
                  <ImageUpload
                    label="Katta o'lchamdagi rasm (1920x1080)"
                    value={formData.image}
                    onChange={(file) => setFormData({ ...formData, image: file as File })}
                    placeholder="Yuklash uchun bosing"
                    isUploading={isSubmitting}
                    uploadProgress={uploadProgress}
                  />
                  <div className="pt-2">
                    <VideoUpload
                      label="Video (ixtiyoriy)"
                      value={formData.video}
                      onChange={(file) => setFormData({ ...formData, video: file as File })}
                      placeholder="Video yuklash uchun bosing"
                      isUploading={isSubmitting}
                      uploadProgress={uploadProgress}
                    />
                  </div>
                  <div className="p-5 md:p-6 bg-[#0d89b1]/5 dark:bg-[#0d89b1]/10 rounded-lg border border-[#0d89b1]/20">
                    <p className="text-[10px] md:text-xs text-[#0d89b1] leading-relaxed font-medium">
                      Hero slayder rasmiga matn yozmaslik tavsiya etiladi, chunki sarlavha va tavsif saytda rasm ustiga avtomatik qo'yiladi.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 md:gap-4 pt-8 border-t border-gray-100 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 md:px-8 py-3 text-sm font-bold text-gray-500 hover:text-gray-700 transition-colors"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-8 md:px-12 py-3 bg-[#0d89b1] text-white font-bold rounded-lg hover:bg-[#0a6d8f] transition-all shadow-xl shadow-[#0d89b1]/20 active:scale-[0.98] disabled:opacity-50 text-sm md:text-base"
                >
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  Saqlash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </motion.div>
  );
}
