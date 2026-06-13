import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { Save, Loader2, Globe, Phone, Mail, MapPin, Share2, Building, Calendar, Key, Eye, EyeOff, Lock } from "lucide-react";
import { ImageUpload } from "../components/ImageUpload";
import { toast } from "sonner";
import { API_BASE_URL, SETTINGS_URL, getImageUrl } from "../../config/api";
import { useSettings } from "../context/SettingsContext";
import { PageSkeleton as SkeletonLoader } from "../components/PageSkeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../components/ui/dialog";

interface Settings {
  id: number;
  established_year: number;
  phone: string;
  email: string;
  website: string;
  logo: string | null;
  telegram: string | null;
  instagram: string | null;
  facebook: string | null;
  youtube: string | null;
  translations: {
    uz: {
      short_name: string;
      full_name: string;
      address: string;
    };
    ru: {
      short_name: string;
      full_name: string;
      address: string;
    };
  };
}

function buildSettingsFormData(formData: {
  translations: {
    uz: { short_name: string; full_name: string; address: string };
    ru: { short_name: string; full_name: string; address: string };
  };
  established_year: number;
  phone: string;
  email: string;
  website: string;
  logo: File | string | null;
  telegram: string;
  instagram: string;
  facebook: string;
  youtube: string;
}) {
  const data = new FormData();

  data.append("short_name_uz", formData.translations.uz.short_name || "");
  data.append("full_name_uz", formData.translations.uz.full_name || "");
  data.append("address_uz", formData.translations.uz.address || "");
  data.append("short_name_ru", formData.translations.ru.short_name || "");
  data.append("full_name_ru", formData.translations.ru.full_name || "");
  data.append("address_ru", formData.translations.ru.address || "");

  if (formData.established_year > 0) {
    data.append("established_year", String(formData.established_year));
  }
  data.append("phone", formData.phone || "");
  data.append("email", formData.email || "");
  data.append("website", formData.website || "");
  data.append("telegram", formData.telegram || "");
  data.append("instagram", formData.instagram || "");
  data.append("facebook", formData.facebook || "");
  data.append("youtube", formData.youtube || "");

  if (formData.logo instanceof File) {
    data.append("logo", formData.logo);
  }

  return data;
}

export default function Sozlamalar() {
  const { refreshSettings } = useSettings();
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState<Settings | null>(null);

  const [activeTab, setActiveTab] = useState<"uz" | "ru">("uz");

  const [formData, setFormData] = useState({
    translations: {
      uz: { short_name: "", full_name: "", address: "" },
      ru: { short_name: "", full_name: "", address: "" },
    },
    established_year: 0,
    phone: "",
    email: "",
    website: "",
    logo: null as File | string | null,
    telegram: "",
    instagram: "",
    facebook: "",
    youtube: "",
  });

  // Password change state
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [passwordData, setPasswordData] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const languages = [
    { id: "uz", label: "O'zbekcha" },
    { id: "ru", label: "Русский" },
  ] as const;

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const token = sessionStorage.getItem("auth_token");
      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(SETTINGS_URL, { headers });
      if (response.status === 404) {
        setLoading(false);
        return;
      }

      const data = await response.json();
      if (response.ok) {
        // Handle direct object or list response
        const settingsData = Array.isArray(data) ? data[0] : (data.results ? data.results[0] : data);

        if (settingsData && settingsData.id) {
          setSettings(settingsData);
          setFormData({
            translations: {
              uz: settingsData.translations?.uz || { short_name: "", full_name: "", address: "" },
              ru: settingsData.translations?.ru || { short_name: "", full_name: "", address: "" },
            },
            established_year: settingsData.established_year || 0,
            phone: settingsData.phone || "",
            email: settingsData.email || "",
            website: settingsData.website || "",
            logo: settingsData.logo ? getImageUrl(settingsData.logo) : null,
            telegram: settingsData.telegram || "",
            instagram: settingsData.instagram || "",
            facebook: settingsData.facebook || "",
            youtube: settingsData.youtube || "",
          });
        }
      }
    } catch (error) {
      console.error("Fetch settings error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.translations.uz.short_name.trim() || !formData.translations.uz.full_name.trim()) {
      toast.error("O'zbekcha qisqa nom va to'liq nom majburiy");
      setActiveTab("uz");
      return;
    }

    const token = sessionStorage.getItem("auth_token");
    if (!token) {
      toast.error("Avtorizatsiya talab qilinadi. Qayta tizimga kiring");
      return;
    }

    setIsSaving(true);
    const data = buildSettingsFormData(formData);
    const method = settings ? "PATCH" : "PUT";

    try {
      const response = await fetch(SETTINGS_URL, {
        method,
        headers: { Authorization: `Bearer ${token}` },
        body: data,
      });

      if (response.ok) {
        toast.success("Sozlamalar muvaffaqiyatli saqlandi");
        await fetchSettings();
        await refreshSettings();
      } else if (response.status === 401 || response.status === 403) {
        toast.error("Ruxsat yo'q. Qayta tizimga kiring");
      } else {
        let errData: unknown;
        try {
          errData = await response.json();
        } catch {
          errData = null;
        }
        if (errData && typeof errData === "object") {
          const errorMessages = Object.entries(errData)
            .map(([field, msgs]) => {
              const message = Array.isArray(msgs) ? msgs.join(", ") : String(msgs);
              return `${field}: ${message}`;
            })
            .join("\n");
          toast.error(errorMessages || "Xatolik yuz berdi");
        } else {
          toast.error("Xatolik yuz berdi");
        }
      }
    } catch {
      toast.error("Server bilan bog'lanishda xatolik");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (passwordData.new_password !== passwordData.confirm_password) {
      toast.error("Yangi parol va tasdiqlash paroli bir-biriga mos kelmadi");
      return;
    }

    if (passwordData.new_password.length < 6) {
      toast.error("Yangi parol kamida 6 belgidan iborat bo'lishi kerak");
      return;
    }

    setIsChangingPassword(true);
    const token = sessionStorage.getItem("auth_token");

    try {
      const response = await fetch(`${API_BASE_URL}/change-password/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          old_password: passwordData.current_password,
          new_password: passwordData.new_password,
          confirm_password: passwordData.confirm_password,
        }),
      });

      if (response.ok) {
        toast.success("Parol muvaffaqiyatli o'zgartirildi");
        setPasswordModalOpen(false);
        setPasswordData({
          current_password: "",
          new_password: "",
          confirm_password: "",
        });
      } else {
        const errData = await response.json();
        if (errData && typeof errData === 'object') {
          const errorMessages = Object.entries(errData)
            .map(([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs.join(', ') : msgs}`)
            .join('\n');
          toast.error(errorMessages || "Xatolik yuz berdi");
        } else {
          toast.error("Joriy parol noto'g'ri yoki xatolik yuz berdi");
        }
      }
    } catch (error) {
      toast.error("Server bilan bog'lanishda xatolik");
    } finally {
      setIsChangingPassword(false);
    }
  };

  const resetPasswordModal = () => {
    setPasswordModalOpen(false);
    setPasswordData({
      current_password: "",
      new_password: "",
      confirm_password: "",
    });
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
  };

  if (loading) {
    return <SkeletonLoader type="form" />;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="p-4 md:p-6 max-w-7xl mx-auto space-y-6 overflow-x-hidden"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#1f2937] p-5 md:p-6 rounded-lg shadow-sm border border-gray-100 dark:border-gray-800">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold text-gray-900 dark:text-white flex items-center gap-3">
            <Building className="w-6 h-6 md:w-8 md:h-8 text-[#0d89b1]" />
            Sozlamalar
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Litseyning umumiy ma'lumotlari va ijtimoiy tarmoqlarini boshqaring
          </p>
        </div>
        <button
          type="submit"
          form="settings-form"
          disabled={isSaving}
          className="flex items-center justify-center gap-2 px-6 py-2.5 bg-[#0d89b1] text-white rounded-lg hover:bg-[#0a6d8f] transition-all shadow-lg hover:shadow-[#0d89b1]/20 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none font-semibold text-sm md:text-base w-full sm:w-auto"
        >
          {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          {isSaving ? "Saqlanmoqda..." : "Saqlash"}
        </button>
      </div>

      <form id="settings-form" onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 pb-12">
        {/* Left Column: General & Logo */}
        <div className="lg:col-span-8 space-y-6 md:space-y-8">
          {/* Brand Identity */}
          <section className="bg-white dark:bg-[#1f2937] p-5 md:p-8 rounded-lg shadow-sm border border-gray-100 dark:border-gray-800 transition-all hover:shadow-md">
            <div className="flex items-center gap-3 mb-6 md:mb-8 pb-4 border-b border-gray-50 dark:border-gray-800">
              <Globe className="w-5 h-5 md:w-6 md:h-6 text-[#0d89b1]" />
              <h2 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white">Brend ma'lumotlari</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
              <div className="md:col-span-1 space-y-3">
                <label className="text-xs md:text-sm font-semibold text-gray-700 dark:text-gray-300">Litsey logotipi</label>
                <ImageUpload
                  label="Logo"
                  value={formData.logo}
                  onChange={(value) =>
                    setFormData({
                      ...formData,
                      logo: Array.isArray(value) ? value[0] ?? null : value,
                    })
                  }
                  placeholder="Yuklash"
                  isUploading={isSaving}
                />
              </div>
              <div className="md:col-span-2 space-y-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                    {languages.map((lang) => (
                      <button
                        key={lang.id}
                        type="button"
                        onClick={() => setActiveTab(lang.id as "uz" | "ru")}
                        className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                          activeTab === lang.id 
                            ? "bg-white dark:bg-gray-700 text-[#0d89b1] shadow-sm" 
                            : "text-gray-500 hover:text-gray-700 dark:text-gray-400"
                        }`}
                      >
                        {lang.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs md:text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                      Qisqa nomi ({activeTab.toUpperCase()}) {activeTab === "uz" && <span className="text-red-500">*</span>}
                    </label>
                    <input
                      type="text"
                      value={formData.translations[activeTab]?.short_name || ""}
                      onChange={(e) => {
                        setFormData({
                          ...formData,
                          translations: {
                            ...formData.translations,
                            [activeTab]: {
                              ...formData.translations[activeTab],
                              short_name: e.target.value
                            }
                          }
                        });
                      }}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-[#0d89b1]/20 focus:border-[#0d89b1] outline-none transition-all dark:text-white text-sm"
                      placeholder={`Qisqa nomi...`}
                      required={activeTab === "uz"}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs md:text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                      <Calendar className="w-4 h-4" /> Tashkil etilgan yil
                    </label>
                    <input
                      type="text"
                      value={formData.established_year || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === "" || /^\d+$/.test(val)) {
                          setFormData({ ...formData, established_year: val === "" ? 0 : Number(val) });
                        }
                      }}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-[#0d89b1]/20 focus:border-[#0d89b1] outline-none transition-all dark:text-white text-sm"
                      placeholder="2000"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs md:text-sm font-semibold text-gray-700 dark:text-gray-300">
                    To'liq nomi ({activeTab.toUpperCase()}) {activeTab === "uz" && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type="text"
                    value={formData.translations[activeTab]?.full_name || ""}
                    onChange={(e) => {
                      setFormData({
                        ...formData,
                        translations: {
                          ...formData.translations,
                          [activeTab]: {
                            ...formData.translations[activeTab],
                            full_name: e.target.value
                          }
                        }
                      });
                    }}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-[#0d89b1]/20 focus:border-[#0d89b1] outline-none transition-all dark:text-white font-medium text-sm"
                    placeholder={`Litseyning to'liq nomi...`}
                    required={activeTab === "uz"}
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Contact Information */}
          <section className="bg-white dark:bg-[#1f2937] p-5 md:p-8 rounded-lg shadow-sm border border-gray-100 dark:border-gray-800 transition-all hover:shadow-md">
            <div className="flex items-center gap-3 mb-6 md:mb-8 pb-4 border-b border-gray-50 dark:border-gray-800">
              <Phone className="w-5 h-5 md:w-6 md:h-6 text-[#0d89b1]" />
              <h2 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white">Aloqa ma'lumotlari</h2>
            </div>
            
            <div className="space-y-6 md:space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                <div className="space-y-2">
                  <label className="text-xs md:text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <MapPin className="w-4 h-4" /> Manzil ({activeTab.toUpperCase()})
                  </label>
                  <input
                    type="text"
                    value={formData.translations[activeTab]?.address || ""}
                    onChange={(e) => {
                      setFormData({
                        ...formData,
                        translations: {
                          ...formData.translations,
                          [activeTab]: {
                            ...formData.translations[activeTab],
                            address: e.target.value
                          }
                        }
                      });
                    }}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-[#0d89b1]/20 focus:border-[#0d89b1] outline-none transition-all dark:text-white text-sm"
                    placeholder={`Manzil...`}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs md:text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <Globe className="w-4 h-4" /> Veb-sayt
                  </label>
                  <input
                    type="text"
                    value={formData.website || ""}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-[#0d89b1]/20 focus:border-[#0d89b1] outline-none transition-all dark:text-white text-sm"
                    placeholder="www.litsey.uz"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 pt-4 border-t border-gray-50 dark:border-gray-800">
                <div className="space-y-2">
                  <label className="text-xs md:text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <Phone className="w-4 h-4" /> Telefon raqami
                  </label>
                  <input
                    type="tel"
                    value={formData.phone || ""}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-[#0d89b1]/20 focus:border-[#0d89b1] outline-none transition-all dark:text-white text-sm"
                    placeholder="+998 90 123 45 67"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs md:text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <Mail className="w-4 h-4" /> Email manzili
                  </label>
                  <input
                    type="email"
                    value={formData.email || ""}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-[#0d89b1]/20 focus:border-[#0d89b1] outline-none transition-all dark:text-white text-sm"
                    placeholder="info@litsey.uz"
                  />
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Right Column: Social Networks & Password */}
        <div className="lg:col-span-4 space-y-6 md:space-y-8">
          {/* Social Networks */}
          <section className="bg-white dark:bg-[#1f2937] p-5 md:p-8 rounded-lg shadow-sm border border-gray-100 dark:border-gray-800 transition-all hover:shadow-md">
            <div className="flex items-center gap-3 mb-6 md:mb-8 pb-4 border-b border-gray-50 dark:border-gray-800">
              <Share2 className="w-5 h-5 md:w-6 md:h-6 text-[#0d89b1]" />
              <h2 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white">Ijtimoiy tarmoqlar</h2>
            </div>
            
            <div className="space-y-5 md:space-y-6">
              <div className="space-y-2">
                <label className="text-xs md:text-sm font-semibold text-gray-700 dark:text-gray-300">Telegram</label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.telegram || ""}
                    onChange={(e) => setFormData({ ...formData, telegram: e.target.value })}
                    className="w-full pl-4 pr-10 py-2.5 md:py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:border-[#0d89b1] outline-none transition-all dark:text-white text-sm"
                    placeholder="t.me/litsey"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <Share2 className="w-4 h-4" />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs md:text-sm font-semibold text-gray-700 dark:text-gray-300">Instagram</label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.instagram || ""}
                    onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                    className="w-full pl-4 pr-10 py-2.5 md:py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:border-[#0d89b1] outline-none transition-all dark:text-white text-sm"
                    placeholder="instagram.com/litsey"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <Share2 className="w-4 h-4" />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs md:text-sm font-semibold text-gray-700 dark:text-gray-300">Facebook</label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.facebook || ""}
                    onChange={(e) => setFormData({ ...formData, facebook: e.target.value })}
                    className="w-full pl-4 pr-10 py-2.5 md:py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:border-[#0d89b1] outline-none transition-all dark:text-white text-sm"
                    placeholder="facebook.com/litsey"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <Share2 className="w-4 h-4" />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs md:text-sm font-semibold text-gray-700 dark:text-gray-300">YouTube</label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.youtube || ""}
                    onChange={(e) => setFormData({ ...formData, youtube: e.target.value })}
                    className="w-full pl-4 pr-10 py-2.5 md:py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:border-[#0d89b1] outline-none transition-all dark:text-white text-sm"
                    placeholder="youtube.com/@litsey"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <Share2 className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 md:mt-10 p-4 bg-amber-50 dark:bg-amber-900/10 rounded-lg border border-amber-100 dark:border-amber-900/20">
              <p className="text-[10px] md:text-xs text-amber-700 dark:text-amber-500 leading-relaxed font-medium">
                Ijtimoiy tarmoqlar saytning footer qismida va aloqa sahifasida ko'rinadi. URL manzillarni to'liq ko'rinishda kiritishingiz tavsiya etiladi.
              </p>
            </div>
          </section>

          {/* Password Change Section */}
          <section className="bg-white dark:bg-[#1f2937] p-5 md:p-8 rounded-lg shadow-sm border border-gray-100 dark:border-gray-800 transition-all hover:shadow-md">
            <div className="flex items-center gap-3 mb-6 md:mb-8 pb-4 border-b border-gray-50 dark:border-gray-800">
              <Lock className="w-5 h-5 md:w-6 md:h-6 text-[#0d89b1]" />
              <h2 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white">Xavfsizlik</h2>
            </div>

            <div className="space-y-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Hisobingiz xavfsizligi uchun parolingizni muntazam yangilab turing.
              </p>
              <button
                type="button"
                onClick={() => setPasswordModalOpen(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-all border border-gray-200 dark:border-gray-700 font-semibold text-sm active:scale-[0.98]"
              >
                <Key className="w-4 h-4" />
                Parolni o'zgartirish
              </button>
            </div>

            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-100 dark:border-blue-900/20">
              <p className="text-[10px] md:text-xs text-blue-700 dark:text-blue-500 leading-relaxed font-medium">
                Parol kamida 6 belgidan iborat bo'lishi va murakkab bo'lishi tavsiya etiladi.
              </p>
            </div>
          </section>
        </div>
      </form>

      {/* Password Change Modal */}
      <Dialog open={passwordModalOpen} onOpenChange={(open) => {
        if (!open) resetPasswordModal();
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
              <Key className="w-5 h-5 text-[#0d89b1]" />
              Parolni o'zgartirish
            </DialogTitle>
            <DialogDescription className="text-gray-500 dark:text-gray-400">
              Hisobingiz xavfsizligi uchun joriy parolingizni tasdiqlang va yangi parolni kiriting.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handlePasswordChange} className="space-y-5 pt-2">
            {/* Current Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                Joriy parol
              </label>
              <div className="relative">
                <input
                  type={showCurrentPassword ? "text" : "password"}
                  value={passwordData.current_password}
                  onChange={(e) => setPasswordData({ ...passwordData, current_password: e.target.value })}
                  className="w-full px-4 pr-12 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-[#0d89b1]/20 focus:border-[#0d89b1] outline-none transition-all dark:text-white text-sm"
                  placeholder="Joriy parolni kiriting"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                Yangi parol
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? "text" : "password"}
                  value={passwordData.new_password}
                  onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                  className="w-full px-4 pr-12 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-[#0d89b1]/20 focus:border-[#0d89b1] outline-none transition-all dark:text-white text-sm"
                  placeholder="Yangi parolni kiriting"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm New Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                Yangi parolni tasdiqlang
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={passwordData.confirm_password}
                  onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                  className="w-full px-4 pr-12 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-[#0d89b1]/20 focus:border-[#0d89b1] outline-none transition-all dark:text-white text-sm"
                  placeholder="Yangi parolni qayta kiriting"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={resetPasswordModal}
                disabled={isChangingPassword}
                className="px-4 py-2 text-sm font-semibold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-all disabled:opacity-50"
              >
                Bekor qilish
              </button>
              <button
                type="submit"
                disabled={isChangingPassword}
                className="flex items-center justify-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-[#0d89b1] hover:bg-[#0a6d8f] rounded-lg transition-all shadow-lg hover:shadow-[#0d89b1]/20 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
              >
                {isChangingPassword ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    O'zgartirilmoqda...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    O'zgartirish
                  </>
                )}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}