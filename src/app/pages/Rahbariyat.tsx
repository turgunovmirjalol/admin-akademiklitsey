import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, X, Loader2 } from "lucide-react";
import { Dialog } from "../components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "../components/ui/alert-dialog";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { ImageUpload } from "../components/ImageUpload";
import { toast } from "sonner";
import { MANAGEMENT_URL, getImageUrl, parseApiErrors, parseListResponse } from "../../config/api";
import { PageSkeleton as SkeletonLoader } from "../components/PageSkeleton";
import { SEO } from "../components/SEO";

interface ManagementTranslation {
  position: string;
  bio: string;
  reception_hours: string;
}

interface Leader {
  id: number;
  full_name: string;
  academic_degree: string | null;
  phone: string | null;
  email: string | null;
  photo: string | null;
  sort_order: number;
  is_active: boolean;
  translations: {
    uz: ManagementTranslation;
    ru?: ManagementTranslation;
  };
}

interface LeaderFormData {
  full_name: string;
  academic_degree: string;
  phone: string;
  email: string;
  sort_order: number;
  is_active: boolean;
  position_uz: string;
  position_ru: string;
  bio_uz: string;
  bio_ru: string;
  reception_hours_uz: string;
  reception_hours_ru: string;
  photo: File | string | null;
}

function parseLeaderToForm(leader: Leader): LeaderFormData {
  return {
    full_name: leader.full_name || "",
    academic_degree: leader.academic_degree || "",
    phone: leader.phone || "",
    email: leader.email || "",
    sort_order: leader.sort_order ?? 0,
    is_active: leader.is_active ?? true,
    position_uz: leader.translations?.uz?.position || "",
    position_ru: leader.translations?.ru?.position || "",
    bio_uz: leader.translations?.uz?.bio || "",
    bio_ru: leader.translations?.ru?.bio || "",
    reception_hours_uz: leader.translations?.uz?.reception_hours || "",
    reception_hours_ru: leader.translations?.ru?.reception_hours || "",
    photo: leader.photo ? getImageUrl(leader.photo) : null,
  };
}

function buildLeaderFormData(formData: LeaderFormData): FormData {
  const data = new FormData();

  data.append("full_name", formData.full_name.trim());
  data.append("academic_degree", formData.academic_degree.trim());
  data.append("phone", formData.phone.trim());
  data.append("email", formData.email.trim());
  data.append("sort_order", String(formData.sort_order || 0));
  data.append("is_active", formData.is_active ? "true" : "false");
  data.append("position_uz", formData.position_uz.trim());
  data.append("position_ru", formData.position_ru.trim());
  data.append("bio_uz", formData.bio_uz.trim());
  data.append("bio_ru", formData.bio_ru.trim());
  data.append("reception_hours_uz", formData.reception_hours_uz.trim());
  data.append("reception_hours_ru", formData.reception_hours_ru.trim());

  if (formData.photo instanceof File) {
    data.append("photo", formData.photo);
  }

  return data;
}

export default function Rahbariyat() {
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLeader, setEditingLeader] = useState<Leader | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<"uz" | "ru">("uz");

  const [formData, setFormData] = useState<LeaderFormData>({
    full_name: "",
    academic_degree: "",
    phone: "",
    email: "",
    sort_order: 0,
    is_active: true,
    position_uz: "",
    position_ru: "",
    bio_uz: "",
    bio_ru: "",
    reception_hours_uz: "",
    reception_hours_ru: "",
    photo: null as File | string | null,
  });

  const languages = [
    { id: "uz", label: "O'zbekcha" },
    { id: "ru", label: "Русский" },
  ] as const;

  useEffect(() => {
    fetchLeaders();
  }, []);

  const fetchLeaders = async () => {
    setLoading(true);
    try {
      const token = sessionStorage.getItem("auth_token");
      const headers: Record<string, string> = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(MANAGEMENT_URL, { headers });
      const data = await response.json();
      if (response.ok) {
        setLeaders(parseListResponse<Leader>(data));
      } else {
        toast.error("Rahbariyat ma'lumotlarini yuklashda xatolik");
      }
    } catch {
      toast.error("Server bilan bog'lanishda xatolik");
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingLeader(null);
    setActiveTab("uz");
    setFormData({
      full_name: "",
      academic_degree: "",
      phone: "",
      email: "",
      sort_order: leaders.length,
      is_active: true,
      position_uz: "",
      position_ru: "",
      bio_uz: "",
      bio_ru: "",
      reception_hours_uz: "",
      reception_hours_ru: "",
      photo: null,
    });
    setIsModalOpen(true);
  };

  const handleEdit = async (leader: Leader) => {
    setEditingLeader(leader);
    setActiveTab("uz");
    setIsModalOpen(true);

    const token = sessionStorage.getItem("auth_token");
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    try {
      const response = await fetch(`${MANAGEMENT_URL}${leader.id}/`, { headers });
      if (response.ok) {
        const data: Leader = await response.json();
        setEditingLeader(data);
        setFormData(parseLeaderToForm(data));
      } else {
        setFormData(parseLeaderToForm(leader));
      }
    } catch {
      setFormData(parseLeaderToForm(leader));
    }
  };

  const handleDelete = async (id: number) => {
    const token = sessionStorage.getItem("auth_token");
    if (!token) {
      toast.error("Avtorizatsiya talab qilinadi");
      return;
    }

    try {
      const response = await fetch(`${MANAGEMENT_URL}${id}/`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        toast.success("Muvaffaqiyatli o'chirildi");
        fetchLeaders();
      } else if (response.status === 401 || response.status === 403) {
        toast.error("Ruxsat yo'q");
      } else {
        toast.error("O'chirishda xatolik");
      }
    } catch {
      toast.error("Server bilan bog'lanishda xatolik");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.full_name.trim()) {
      toast.error("To'liq ism majburiy");
      return;
    }

    if (!formData.position_uz.trim() && !formData.position_ru.trim()) {
      toast.error("Kamida bitta tildagi lavozim kiritilishi kerak");
      setActiveTab("uz");
      return;
    }

    const token = sessionStorage.getItem("auth_token");
    if (!token) {
      toast.error("Avtorizatsiya talab qilinadi. Qayta tizimga kiring");
      return;
    }

    setIsSubmitting(true);
    const data = buildLeaderFormData(formData);

    try {
      const url = editingLeader
        ? `${MANAGEMENT_URL}${editingLeader.id}/`
        : MANAGEMENT_URL;
      const method = editingLeader ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token}` },
        body: data,
      });

      if (response.ok) {
        toast.success(editingLeader ? "Muvaffaqiyatli tahrirlandi" : "Muvaffaqiyatli qo'shildi");
        setIsModalOpen(false);
        fetchLeaders();
      } else if (response.status === 401 || response.status === 403) {
        toast.error("Ruxsat yo'q. Qayta tizimga kiring");
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
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <SkeletonLoader type="grid" />;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="p-6 space-y-6"
    >
      <SEO 
        title="Rahbariyat" 
        description="FDTU Akademik Litseyi rahbariyati haqida ma'lumot." 
        keywords="Rahbariyat, Direktor, Litsey, FDTU"
      />
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1f2937] dark:text-gray-100">Rahbariyat</h1>
          <p className="text-[#64748b] dark:text-gray-400 mt-1">Litsey rahbariyati boshqaruvi</p>
        </div>
        <button
          onClick={handleAdd}
          className="flex items-center gap-2 px-4 py-2 bg-[#0d89b1] text-white rounded-lg hover:bg-[#0a6d8f] transition-colors"
        >
          <Plus className="w-5 h-5" />
          Yangi rahbar qo'shish
        </button>
      </div>

      {/* Leaders Display */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {leaders.map((leader) => (
            <div
              key={leader.id}
              className="bg-white dark:bg-[#1f2937] rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md dark:hover:shadow-gray-900 transition-all flex flex-col"
            >
              <div className="p-6 flex-1">
                {/* Photo and basic info */}
                <div className="flex flex-col items-center text-center">
                  <ImageWithFallback
                    src={getImageUrl(leader.photo)}
                    alt={leader.full_name}
                    className="w-32 h-32 rounded-full object-cover border-4 border-[#0d89b1]/10 dark:border-[#0d89b1]/20"
                  />
                  <h3 className="text-lg font-semibold text-[#1f2937] dark:text-gray-100 mt-4">
                    {leader.full_name}
                  </h3>
                  <p className="text-sm text-[#0d89b1] font-medium mt-1">
                    {leader.translations?.uz?.position}
                  </p>
                </div>

                {/* Bio */}
                {leader.translations?.uz?.bio && (
                  <div className="mt-4 p-4 bg-[#f8fafc] dark:bg-gray-800/50 rounded-lg transition-colors">
                    <p className="text-sm text-[#64748b] dark:text-gray-400 leading-relaxed line-clamp-3">
                      {leader.translations.uz.bio}
                    </p>
                  </div>
                )}

                {/* Contact Info */}
                <div className="mt-4 space-y-2">
                  <div className="flex items-start gap-2 text-sm">
                    <span className="text-[#64748b] dark:text-gray-400 font-medium min-w-[80px]">
                      Qabul:
                    </span>
                    <span className="text-[#1f2937] dark:text-gray-200">
                      {leader.translations?.uz?.reception_hours || "Ko'rsatilmagan"}
                    </span>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <span className="text-[#64748b] dark:text-gray-400 font-medium min-w-[80px]">
                      Telefon:
                    </span>
                    <span className="text-[#1f2937] dark:text-gray-200">{leader.phone || "Ko'rsatilmagan"}</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <span className="text-[#64748b] dark:text-gray-400 font-medium min-w-[80px]">
                      Email:
                    </span>
                    <span className="text-[#1f2937] dark:text-gray-200">{leader.email || "Ko'rsatilmagan"}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-700 flex gap-2">
                <button
                  onClick={() => handleEdit(leader)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[#0d89b1] text-white rounded-lg hover:bg-[#0a6d8f] transition-colors"
                >
                  <Edit className="w-4 h-4" />
                  Tahrirlash
                </button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button className="px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Rahbar ma'lumotlarini o'chirish</AlertDialogTitle>
                      <AlertDialogDescription>
                        Rostdan ham ushbu rahbar ma'lumotlarini o'chirmoqchimisiz? Bu amal ortga qaytarilmaydi.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Bekor qilish</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDelete(leader.id)} className="bg-red-600 hover:bg-red-700">
                        Ha, o'chirish
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
        ))}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-[#1f2937] rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto border dark:border-gray-700 shadow-2xl transition-all animate-in fade-in zoom-in duration-200">
              <div className="sticky top-0 bg-white/80 dark:bg-[#1f2937]/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-700 px-8 py-6 flex items-center justify-between z-10">
                <h2 className="text-2xl font-bold text-[#1f2937] dark:text-gray-100">
                  {editingLeader ? "Rahbar ma'lumotlarini tahrirlash" : "Yangi rahbar qo'shish"}
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
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                  {/* Left Column: Photo and Basic Info */}
                  <div className="space-y-8">
                    <div className="p-6 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700 space-y-6">
                      <ImageUpload
                        label="Fotosurat"
                        value={formData.photo}
                        onChange={(value) =>
                          setFormData({
                            ...formData,
                            photo: Array.isArray(value) ? value[0] ?? null : value,
                          })
                        }
                        placeholder="Rasm yuklash"
                        isUploading={isSubmitting}
                      />
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                            To'liq ismi *
                          </label>
                          <input
                            type="text"
                            value={formData.full_name}
                            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                            className="w-full px-5 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-4 focus:ring-[#0d89b1]/10 focus:border-[#0d89b1] outline-none transition-all dark:text-gray-100"
                            required
                            placeholder="F.I.Sh."
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                            Ilmiy daraja
                          </label>
                          <input
                            type="text"
                            value={formData.academic_degree}
                            onChange={(e) => setFormData({ ...formData, academic_degree: e.target.value })}
                            className="w-full px-5 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-4 focus:ring-[#0d89b1]/10 focus:border-[#0d89b1] outline-none transition-all dark:text-gray-100"
                            placeholder="Masalan: Fan doktori"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                            Tartib raqami
                          </label>
                          <input
                            type="text"
                            value={formData.sort_order}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === "" || /^\d+$/.test(val)) {
                                setFormData({ ...formData, sort_order: val === "" ? 0 : Number(val) });
                              }
                            }}
                            className="w-full px-5 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-4 focus:ring-[#0d89b1]/10 focus:border-[#0d89b1] outline-none transition-all dark:text-gray-100"
                            placeholder="0"
                          />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                              Telefon
                            </label>
                            <input
                              type="tel"
                              value={formData.phone}
                              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                              placeholder="+998 90 123 45 67"
                              className="w-full px-5 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-4 focus:ring-[#0d89b1]/10 focus:border-[#0d89b1] outline-none transition-all dark:text-gray-100"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                              Email
                            </label>
                            <input
                              type="email"
                              value={formData.email}
                              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                              placeholder="example@mail.com"
                              className="w-full px-5 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-4 focus:ring-[#0d89b1]/10 focus:border-[#0d89b1] outline-none transition-all dark:text-gray-100"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 px-6 py-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
                      <div className="flex items-center gap-3">
                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Holati:</label>
                        <select
                          value={String(formData.is_active)}
                          onChange={(e) => setFormData({ ...formData, is_active: e.target.value === "true" })}
                          className="px-3 py-1.5 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-[#0d89b1]/20 outline-none dark:text-white"
                        >
                          <option value="true">Faol</option>
                          <option value="false">Nofaol</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Translations */}
                  <div className="space-y-8">
                    <div className="p-6 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700 space-y-6">
                      <h3 className="text-xs font-bold text-[#0d89b1] uppercase tracking-widest flex items-center gap-2">
                        <span className="w-4 h-[1px] bg-[#0d89b1]" />
                        {languages.find(l => l.id === activeTab)?.label} tilidagi ma'lumotlar
                      </h3>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                            Lavozimi ({activeTab.toUpperCase()}) *
                          </label>
                          <input
                            type="text"
                            value={activeTab === "uz" ? formData.position_uz : formData.position_ru}
                            onChange={(e) => {
                              const field = `position_${activeTab}` as keyof typeof formData;
                              setFormData({ ...formData, [field]: e.target.value });
                            }}
                            className="w-full px-5 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-4 focus:ring-[#0d89b1]/10 focus:border-[#0d89b1] outline-none transition-all dark:text-gray-100"
                            required={activeTab === "uz"}
                            placeholder="Masalan: Direktor o'rinbosari"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                            Qabul vaqti ({activeTab.toUpperCase()})
                          </label>
                          <input
                            type="text"
                            value={activeTab === "uz" ? formData.reception_hours_uz : formData.reception_hours_ru}
                            onChange={(e) => {
                              const field = `reception_hours_${activeTab}` as keyof typeof formData;
                              setFormData({ ...formData, [field]: e.target.value });
                            }}
                            className="w-full px-5 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-4 focus:ring-[#0d89b1]/10 focus:border-[#0d89b1] outline-none transition-all dark:text-gray-100"
                            placeholder="Masalan: Chorshanba, 10:00 - 12:00"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                            Biografiya ({activeTab.toUpperCase()})
                          </label>
                          <textarea
                            value={activeTab === "uz" ? formData.bio_uz : formData.bio_ru}
                            onChange={(e) => {
                              const field = `bio_${activeTab}` as keyof typeof formData;
                              setFormData({ ...formData, [field]: e.target.value });
                            }}
                            rows={6}
                            className="w-full px-5 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-4 focus:ring-[#0d89b1]/10 focus:border-[#0d89b1] outline-none transition-all dark:text-gray-100 resize-none"
                            placeholder="Rahbar haqida ma'lumot..."
                          />
                        </div>
                      </div>
                    </div>
                  </div>
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
                    {editingLeader ? "Saqlash" : "Qo'shish"}
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
