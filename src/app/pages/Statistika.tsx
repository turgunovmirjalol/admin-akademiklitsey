import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, X, Loader2, BarChart3, Save } from "lucide-react";
import { toast } from "sonner";
import { STATISTICS_URL } from "../../config/api";
import { PageSkeleton as SkeletonLoader } from "../components/PageSkeleton";

interface Statistic {
  id: number;
  key: string;
  value: number;
  translations: {
    uz: { label: string };
    ru: { label: string };
  };
  icon: string | null;
  sort_order: number;
  updated_at?: string;
}

interface StatisticFormData {
  key: string;
  value: number;
  label_uz: string;
  label_ru: string;
  sort_order: number;
}

function parseStatistic(stat: Statistic): StatisticFormData {
  return {
    key: stat.key || "",
    value: stat.value ?? 0,
    label_uz: stat.translations?.uz?.label || "",
    label_ru: stat.translations?.ru?.label || "",
    sort_order: stat.sort_order ?? 0,
  };
}

function buildStatisticPayload(formData: StatisticFormData, isEditing: boolean) {
  const payload: Record<string, string | number | null> = {
    value: formData.value,
    label_uz: formData.label_uz.trim(),
    label_ru: formData.label_ru.trim(),
    sort_order: formData.sort_order,
  };

  if (!isEditing) {
    payload.key = formData.key.trim();
  }

  return payload;
}

function parseApiErrors(errData: unknown): string {
  if (!errData || typeof errData !== "object") {
    return "Xatolik yuz berdi";
  }

  const record = errData as Record<string, unknown>;
  if (typeof record.detail === "string") {
    return record.detail;
  }

  return Object.entries(record)
    .map(([field, msgs]) => {
      const message = Array.isArray(msgs) ? msgs.join(", ") : String(msgs);
      return `${field}: ${message}`;
    })
    .join("\n") || "Xatolik yuz berdi";
}

export default function Statistika() {
  const [stats, setStats] = useState<Statistic[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStat, setEditingStat] = useState<Statistic | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<"uz" | "ru">("uz");

  const [formData, setFormData] = useState<StatisticFormData>({
    key: "",
    value: 0,
    label_uz: "",
    label_ru: "",
    sort_order: 1,
  });

  const languages = [
    { id: "uz", label: "O'zbekcha" },
    { id: "ru", label: "Русский" },
  ] as const;

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const token = sessionStorage.getItem("auth_token");
      const headers: Record<string, string> = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(STATISTICS_URL, { headers });
      if (response.ok) {
        const data = await response.json();
        setStats(Array.isArray(data) ? data : data.results || []);
      } else {
        toast.error("Statistikalarni yuklashda xatolik");
      }
    } catch {
      toast.error("Statistikalarni yuklashda xatolik");
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingStat(null);
    setActiveTab("uz");
    setFormData({
      key: "",
      value: 0,
      label_uz: "",
      label_ru: "",
      sort_order: stats.length + 1,
    });
    setIsModalOpen(true);
  };

  const handleEdit = (stat: Statistic) => {
    setEditingStat(stat);
    setActiveTab("uz");
    setFormData(parseStatistic(stat));
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    const token = sessionStorage.getItem("auth_token");
    if (!token) {
      toast.error("Avtorizatsiya talab qilinadi");
      return;
    }

    try {
      const response = await fetch(`${STATISTICS_URL}${id}/`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        toast.success("Statistika o'chirildi");
        fetchStats();
      } else if (response.status === 401 || response.status === 403) {
        toast.error("Ruxsat yo'q");
      } else {
        toast.error("O'chirishda xatolik yuz berdi");
      }
    } catch {
      toast.error("Server bilan bog'lanishda xatolik");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingStat && !formData.key.trim()) {
      toast.error("Unikal key majburiy");
      return;
    }

    if (!formData.label_uz.trim() && !formData.label_ru.trim()) {
      toast.error("Kamida bitta tildagi nom kiritilishi kerak");
      return;
    }

    const token = sessionStorage.getItem("auth_token");
    if (!token) {
      toast.error("Avtorizatsiya talab qilinadi. Qayta tizimga kiring");
      return;
    }

    setIsSubmitting(true);

    try {
      const url = editingStat
        ? `${STATISTICS_URL}${editingStat.id}/`
        : STATISTICS_URL;
      const method = editingStat ? "PATCH" : "POST";
      const payload = buildStatisticPayload(formData, !!editingStat);

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        toast.success(editingStat ? "Statistika tahrirlandi" : "Statistika qo'shildi");
        setIsModalOpen(false);
        fetchStats();
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
      className="p-6 space-y-6 max-w-[1400px] mx-auto"
    >
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-[#1f2937] dark:text-gray-100">Statistika</h1>
          <p className="text-[#64748b] dark:text-gray-400 mt-1">
            Litsey yutuqlari va faoliyati statistikasini boshqarish
          </p>
        </div>
        <button
          onClick={handleAdd}
          className="flex items-center gap-2 px-6 py-3 bg-[#0d89b1] text-white font-bold rounded-xl hover:bg-[#0a6d8f] transition-all shadow-lg shadow-[#0d89b1]/20 active:scale-[0.98]"
        >
          <Plus className="w-5 h-5" />
          Yangi statistika
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div
            key={stat.id}
            className="group bg-white dark:bg-[#1f2937] border border-gray-200 dark:border-gray-700 rounded-3xl p-8 shadow-sm hover:shadow-xl transition-all relative overflow-hidden"
          >
            <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => handleEdit(stat)}
                className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl hover:bg-blue-100 transition-colors shadow-sm"
              >
                <Edit className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDelete(stat.id)}
                className="p-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl hover:bg-red-100 transition-colors shadow-sm"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col items-center text-center space-y-4">
              <div>
                <div className="text-4xl font-black text-[#1f2937] dark:text-gray-100 mb-1">
                  {stat.value}+
                </div>
                <div className="text-sm font-bold text-[#0d89b1] uppercase tracking-wider">
                  {stat.translations?.uz?.label || stat.translations?.ru?.label || stat.key}
                </div>
              </div>
              <div className="pt-4 border-t border-gray-50 dark:border-gray-800 w-full">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                  Key: {stat.key}
                </span>
              </div>
            </div>
          </div>
        ))}

        {stats.length === 0 && (
          <div className="col-span-full py-20 flex flex-col items-center justify-center bg-gray-50/50 dark:bg-gray-800/30 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl">
            <BarChart3 className="w-16 h-16 text-gray-300 mb-4" />
            <p className="text-gray-500 dark:text-gray-400 font-bold text-lg">Statistikalar topilmadi</p>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-white dark:bg-[#1f2937] w-full max-w-2xl rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 animate-in fade-in zoom-in duration-200">
            <div className="sticky top-0 bg-white/80 dark:bg-[#1f2937]/80 backdrop-blur-md px-10 py-8 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center z-10">
              <h3 className="text-2xl font-bold text-[#1f2937] dark:text-gray-100">
                {editingStat ? "Statistikani tahrirlash" : "Yangi statistika qo'shish"}
              </h3>
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
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-10 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                    Unikal Key (Lotincha)
                  </label>
                  <input
                    type="text"
                    value={formData.key}
                    onChange={(e) => setFormData({ ...formData, key: e.target.value })}
                    className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-4 focus:ring-[#0d89b1]/10 outline-none transition-all"
                    placeholder="Masalan: students_count"
                    required={!editingStat}
                    disabled={!!editingStat}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                    Soni (Raqamda)
                  </label>
                  <input
                    type="text"
                    value={formData.value}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "" || /^\d+$/.test(val)) {
                        setFormData({ ...formData, value: val === "" ? 0 : Number(val) });
                      }
                    }}
                    className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-4 focus:ring-[#0d89b1]/10 outline-none transition-all"
                    required
                  />
                </div>
              </div>

              <div className="p-8 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700 space-y-6">
                <h4 className="text-xs font-bold text-[#0d89b1] uppercase tracking-widest flex items-center gap-2">
                  <span className="w-4 h-[1px] bg-[#0d89b1]" />
                  {languages.find((l) => l.id === activeTab)?.label} tilidagi nomi
                </h4>

                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                    Nomi ({activeTab.toUpperCase()})
                  </label>
                  <input
                    type="text"
                    value={activeTab === "uz" ? formData.label_uz : formData.label_ru}
                    onChange={(e) => {
                      const field = activeTab === "uz" ? "label_uz" : "label_ru";
                      setFormData({ ...formData, [field]: e.target.value });
                    }}
                    className="w-full px-5 py-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-4 focus:ring-[#0d89b1]/10 outline-none transition-all"
                    placeholder="Masalan: O'quvchilar"
                  />
                </div>
              </div>

              <div className="max-w-xs">
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
                  className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-4 focus:ring-[#0d89b1]/10 outline-none transition-all"
                  placeholder="1"
                />
              </div>

              <div className="flex justify-end gap-4 pt-8 border-t border-gray-100 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-8 py-4 text-sm font-bold text-gray-500 hover:text-gray-700 transition-colors"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-12 py-4 bg-[#0d89b1] text-white font-bold rounded-2xl hover:bg-[#0a6d8f] transition-all shadow-xl shadow-[#0d89b1]/20 active:scale-[0.98] disabled:opacity-50"
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
