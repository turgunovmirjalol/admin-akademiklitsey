import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { Plus, Search, Edit, Trash2, Loader2, FileText, Download, Save } from "lucide-react";
import { toast } from "sonner";
import {
  API_BASE_URL,
  DARS_JADVALI_URL,
  getImageUrl,
  parseApiErrors,
  parseListResponse,
} from "../../config/api";
import { DocumentUpload } from "../components/ImageUpload";
import { PageSkeleton as SkeletonLoader } from "../components/PageSkeleton";
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";

type ScheduleType = "exam" | "lesson" | "other";

interface ScheduleTranslations {
  uz: { title: string; description?: string };
  ru?: { title: string; description?: string };
}

interface ScheduleItem {
  id: number;
  translations: ScheduleTranslations;
  file: string;
  schedule_type?: ScheduleType;
  sort_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

interface ScheduleFormData {
  title_uz: string;
  title_ru: string;
  description_uz: string;
  description_ru: string;
  schedule_type: ScheduleType;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  file: File | string | null;
}

const SCHEDULE_TYPES: { id: ScheduleType; label: string }[] = [
  { id: "lesson", label: "Dars jadvali" },
  { id: "exam", label: "Imtihon jadvali" },
  { id: "other", label: "Boshqa" },
];

const emptyFormData = (): ScheduleFormData => ({
  title_uz: "",
  title_ru: "",
  description_uz: "",
  description_ru: "",
  schedule_type: "lesson",
  sort_order: 1,
  is_active: true,
  created_at: toDateTimeInputValue(new Date().toISOString()),
  updated_at: toDateTimeInputValue(new Date().toISOString()),
  file: null,
});

function toDateTimeInputValue(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toIsoFromDateTimeInput(value: string): string {
  if (!value) return new Date().toISOString();
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return new Date().toISOString();
  return date.toISOString();
}

function normalizeScheduleItem(raw: ScheduleItem): ScheduleItem {
  let translations = raw.translations;
  if (typeof translations === "string") {
    try {
      translations = JSON.parse(translations);
    } catch {
      translations = { uz: { title: "", description: "" } };
    }
  }

  return {
    ...raw,
    translations: translations || { uz: { title: "", description: "" } },
    sort_order: raw.sort_order ?? 1,
    is_active: raw.is_active ?? true,
  };
}

function getScheduleTitle(item: ScheduleItem): string {
  return item.translations?.uz?.title || item.translations?.ru?.title || "";
}

function getScheduleDescription(item: ScheduleItem): string {
  return item.translations?.uz?.description || item.translations?.ru?.description || "";
}

function parseScheduleToForm(item: ScheduleItem): ScheduleFormData {
  const normalized = normalizeScheduleItem(item);
  const now = toDateTimeInputValue(new Date().toISOString());
  return {
    title_uz: normalized.translations?.uz?.title || "",
    title_ru: normalized.translations?.ru?.title || "",
    description_uz: normalized.translations?.uz?.description || "",
    description_ru: normalized.translations?.ru?.description || "",
    schedule_type: normalized.schedule_type || "lesson",
    sort_order: normalized.sort_order ?? 1,
    is_active: normalized.is_active ?? true,
    created_at: toDateTimeInputValue(normalized.created_at) || now,
    updated_at: now,
    file: normalized.file ? getImageUrl(normalized.file) : null,
  };
}

function buildScheduleFormData(form: ScheduleFormData): FormData {
  const data = new FormData();

  data.append("title_uz", form.title_uz.trim());
  data.append("title_ru", form.title_ru.trim());
  data.append("description_uz", form.description_uz.trim());
  data.append("description_ru", form.description_ru.trim());
  data.append("schedule_type", form.schedule_type);
  data.append("sort_order", String(Math.max(1, form.sort_order || 1)));
  data.append("is_active", form.is_active ? "true" : "false");
  data.append("created_at", toIsoFromDateTimeInput(form.created_at));
  data.append("updated_at", toIsoFromDateTimeInput(form.updated_at));

  if (form.file instanceof File) {
    data.append("file", form.file);
  }

  return data;
}

export default function DarsJadvali() {
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ScheduleItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<"uz" | "ru">("uz");
  const [formData, setFormData] = useState<ScheduleFormData>(emptyFormData());

  const languages = [
    { id: "uz", label: "O'zbekcha" },
    { id: "ru", label: "Русский" },
  ] as const;

  useEffect(() => {
    fetchSchedules();
  }, []);

  const fetchSchedules = async () => {
    setLoading(true);
    try {
      const token = sessionStorage.getItem("auth_token");
      const headers: Record<string, string> = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(DARS_JADVALI_URL, { headers });
      if (response.ok) {
        const data = await response.json();
        setSchedules(
          parseListResponse<ScheduleItem>(data)
            .map(normalizeScheduleItem)
            .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)),
        );
      } else if (response.status === 401 || response.status === 403) {
        toast.error("Jadvallarni ko'rish uchun tizimga kiring");
      } else {
        toast.error("Jadvallarni yuklashda xatolik");
      }
    } catch {
      toast.error("Jadvallarni yuklashda xatolik");
    } finally {
      setLoading(false);
    }
  };

  const filteredSchedules = schedules.filter((item) =>
    getScheduleTitle(item).toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleAdd = () => {
    setEditingItem(null);
    setActiveTab("uz");
    setFormData({
      ...emptyFormData(),
      sort_order: Math.max(1, schedules.length + 1),
    });
    setIsModalOpen(true);
  };

  const handleEdit = async (item: ScheduleItem) => {
    const token = sessionStorage.getItem("auth_token");
    if (!token) {
      toast.error("Avtorizatsiya talab qilinadi");
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/dars-jadvali/${item.id}/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        toast.error("Jadval ma'lumotlarini yuklashda xatolik");
        return;
      }

      const data = normalizeScheduleItem(await response.json());
      setEditingItem(data);
      setFormData(parseScheduleToForm(data));
      setActiveTab("uz");
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

      const response = await fetch(`${API_BASE_URL}/dars-jadvali/${id}/`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        toast.success("Jadval o'chirildi");
        fetchSchedules();
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title_uz.trim()) {
      toast.error("Sarlavha (UZ) majburiy");
      setActiveTab("uz");
      return;
    }

    if (!formData.created_at || !formData.updated_at) {
      toast.error("Yaratilgan va yangilangan sanalar majburiy");
      return;
    }

    if (!editingItem && !(formData.file instanceof File)) {
      toast.error("Jadval fayli (PDF yoki rasm) majburiy");
      return;
    }

    const token = sessionStorage.getItem("auth_token");
    if (!token) {
      toast.error("Avtorizatsiya talab qilinadi. Qayta tizimga kiring");
      return;
    }

    setIsSubmitting(true);

    const body = buildScheduleFormData(formData);
    const url = editingItem ? `${API_BASE_URL}/dars-jadvali/${editingItem.id}/` : DARS_JADVALI_URL;
    const method = editingItem ? "PATCH" : "POST";

    try {
      const response = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token}` },
        body,
      });

      if (response.ok) {
        toast.success(editingItem ? "Jadval tahrirlandi" : "Jadval qo'shildi");
        setIsModalOpen(false);
        setFormData(emptyFormData());
        setEditingItem(null);
        fetchSchedules();
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
      className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto overflow-x-hidden"
    >
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-[#1f2937] p-5 md:p-6 rounded-lg shadow-sm border border-gray-100 dark:border-gray-800">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">Dars jadvali</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Sinf va guruhlar uchun PDF yoki rasm jadvallarni boshqarish
          </p>
        </div>
        <button
          onClick={handleAdd}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#0d89b1] text-white font-bold rounded-lg hover:bg-[#0a6d8f] transition-all shadow-lg shadow-[#0d89b1]/20 active:scale-[0.98] w-full sm:w-auto justify-center"
        >
          <Plus className="w-5 h-5" />
          Yangi jadval
        </button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Jadvallarni qidirish..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-[#0d89b1]/20 focus:border-[#0d89b1] transition-all"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {filteredSchedules.map((item) => (
          <div
            key={item.id}
            className="bg-white dark:bg-[#1f2937] border border-gray-100 dark:border-gray-800 rounded-lg p-5 md:p-6 shadow-sm hover:shadow-md transition-all group"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg">
                  <FileText className="w-5 h-5 md:w-6 md:h-6" />
                </div>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300 rounded-full uppercase tracking-wider">
                  {SCHEDULE_TYPES.find((t) => t.id === item.schedule_type)?.label || item.schedule_type || "Jadval"}
                </span>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => handleEdit(item)}
                  className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Jadvalni o'chirish</AlertDialogTitle>
                      <AlertDialogDescription>
                        Rostdan ham ushbu jadvalni o'chirmoqchimisiz?
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Bekor qilish</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDelete(item.id)}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Ha, o'chirish
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>

            <h3 className="font-bold text-gray-900 dark:text-white mb-2 line-clamp-1">
              {getScheduleTitle(item)}
            </h3>
            {getScheduleDescription(item) && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 line-clamp-2 min-h-[40px]">
                {getScheduleDescription(item)}
              </p>
            )}

            <div className="flex items-center justify-between mb-4">
              <span className="text-xs text-gray-400">Tartib: {item.sort_order}</span>
              <span
                className={`w-2 h-2 rounded-full ${item.is_active ? "bg-green-500" : "bg-red-500"}`}
              />
            </div>

            <a
              href={getImageUrl(item.file)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-2 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-semibold rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border border-gray-100 dark:border-gray-700 text-sm"
            >
              <Download className="w-4 h-4" />
              Faylni ko'rish
            </a>
          </div>
        ))}

        {filteredSchedules.length === 0 && (
          <div className="col-span-full py-20 flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
            <FileText className="w-12 h-12 mb-2 opacity-20" />
            <p>Jadvallar topilmadi</p>
          </div>
        )}
      </div>

      <Dialog
        open={isModalOpen}
        onOpenChange={(open) => {
          if (!isSubmitting) {
            setIsModalOpen(open);
            if (!open) {
              setEditingItem(null);
              setFormData(emptyFormData());
            }
          }
        }}
      >
        <DialogContent className="sm:max-w-2xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "Jadvalni tahrirlash" : "Yangi jadval qo'shish"}
            </DialogTitle>
            <DialogDescription>
              Barcha majburiy maydonlarni to'ldiring: sarlavha, sanalar va jadval fayli.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6" noValidate>
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

            <div className="p-5 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700 space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                  Sarlavha ({activeTab.toUpperCase()}) {activeTab === "uz" && "*"}
                </label>
                <input
                  type="text"
                  value={activeTab === "uz" ? formData.title_uz : formData.title_ru}
                  onChange={(e) => {
                    const field = activeTab === "uz" ? "title_uz" : "title_ru";
                    setFormData({ ...formData, [field]: e.target.value });
                  }}
                  placeholder={`Masalan: 10-A sinf dars jadvali (${activeTab})`}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-4 focus:ring-[#0d89b1]/10 focus:border-[#0d89b1] outline-none transition-all text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                  Tavsif ({activeTab.toUpperCase()})
                </label>
                <textarea
                  value={activeTab === "uz" ? formData.description_uz : formData.description_ru}
                  onChange={(e) => {
                    const field = activeTab === "uz" ? "description_uz" : "description_ru";
                    setFormData({ ...formData, [field]: e.target.value });
                  }}
                  placeholder="Jadval haqida qisqacha ma'lumot..."
                  rows={2}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-4 focus:ring-[#0d89b1]/10 focus:border-[#0d89b1] outline-none transition-all resize-none text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                  Jadval turi
                </label>
                <select
                  value={formData.schedule_type}
                  onChange={(e) =>
                    setFormData({ ...formData, schedule_type: e.target.value as ScheduleType })
                  }
                  className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm"
                >
                  {SCHEDULE_TYPES.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                  Tartib raqami
                </label>
                <input
                  type="number"
                  min={1}
                  value={formData.sort_order}
                  onChange={(e) =>
                    setFormData({ ...formData, sort_order: Math.max(1, Number(e.target.value) || 1) })
                  }
                  className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-5 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700">
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                  Yaratilgan sana va vaqt *
                </label>
                <input
                  type="datetime-local"
                  value={formData.created_at}
                  onChange={(e) => setFormData({ ...formData, created_at: e.target.value })}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                  Yangilangan sana va vaqt *
                </label>
                <input
                  type="datetime-local"
                  value={formData.updated_at}
                  onChange={(e) => setFormData({ ...formData, updated_at: e.target.value })}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm"
                  required
                />
              </div>
            </div>

            <DocumentUpload
              label={editingItem ? "Yangi fayl (ixtiyoriy)" : "Jadval fayli (PDF yoki rasm) *"}
              value={formData.file}
              onChange={(file) => setFormData({ ...formData, file: file as File })}
              placeholder="PDF yoki rasm yuklash uchun bosing yoki torting"
              isUploading={isSubmitting}
              maxSizeMB={50}
            />

            <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <input
                type="checkbox"
                id="is_active_schedule"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="w-5 h-5 rounded text-[#0d89b1] focus:ring-[#0d89b1]"
              />
              <label
                htmlFor="is_active_schedule"
                className="text-sm font-bold text-gray-700 dark:text-gray-300 cursor-pointer"
              >
                Faol holatda (saytda ko'rinadi)
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-gray-100 dark:border-gray-700">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                disabled={isSubmitting}
                className="px-6 py-2.5 text-sm font-bold text-gray-500 hover:text-gray-700 transition-colors disabled:opacity-50"
              >
                Bekor qilish
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2 px-8 py-2.5 bg-[#0d89b1] text-white font-bold rounded-lg hover:bg-[#0a6d8f] transition-all shadow-xl shadow-[#0d89b1]/20 active:scale-[0.98] disabled:opacity-50 text-sm"
              >
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                {editingItem ? "Saqlash" : "Qo'shish"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
