import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { Plus, Search, Edit, Trash2, X, Loader2, BookOpen, Save } from "lucide-react";
import { toast } from "sonner";
import { SUBJECTS_URL, parseApiErrors, parseListResponse } from "../../config/api";
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

type SubjectType = "test" | "creative" | "interview";

interface Subject {
  id: number;
  subject_type: SubjectType;
  subject_type_display?: string;
  max_score: number;
  min_score?: number;
  duration_minutes?: number;
  sort_order: number;
  is_active?: boolean;
  translations: {
    uz: { name?: string; subject_name?: string; description?: string };
    ru?: { name?: string; subject_name?: string; description?: string };
  };
}

interface SubjectFormData {
  subject_type: SubjectType;
  max_score: number;
  min_score: number;
  duration_minutes: number;
  sort_order: number;
  is_active: boolean;
  name_uz: string;
  name_ru: string;
  description_uz: string;
  description_ru: string;
}

const SUBJECT_TYPES: { id: SubjectType; label: string }[] = [
  { id: "test", label: "Test" },
  { id: "creative", label: "Ijodiy" },
  { id: "interview", label: "Suhbat" },
];

function getSubjectName(subject: Subject): string {
  return (
    subject.translations?.uz?.name ||
    subject.translations?.uz?.subject_name ||
    subject.translations?.ru?.name ||
    subject.translations?.ru?.subject_name ||
    ""
  );
}

function getSubjectDescription(subject: Subject): string {
  return subject.translations?.uz?.description || subject.translations?.ru?.description || "";
}

function parseSubjectToForm(subject: Subject): SubjectFormData {
  return {
    subject_type: subject.subject_type || "test",
    max_score: subject.max_score ?? 0,
    min_score: subject.min_score ?? 0,
    duration_minutes: subject.duration_minutes ?? 0,
    sort_order: subject.sort_order ?? 0,
    is_active: subject.is_active ?? true,
    name_uz: subject.translations?.uz?.name || subject.translations?.uz?.subject_name || "",
    name_ru: subject.translations?.ru?.name || subject.translations?.ru?.subject_name || "",
    description_uz: subject.translations?.uz?.description || "",
    description_ru: subject.translations?.ru?.description || "",
  };
}

function buildSubjectFormData(form: SubjectFormData): FormData {
  const data = new FormData();
  data.append("subject_type", form.subject_type);
  data.append("max_score", String(form.max_score));
  data.append("min_score", String(form.min_score));
  data.append("duration_minutes", String(form.duration_minutes));
  data.append("sort_order", String(form.sort_order));
  data.append("is_active", form.is_active ? "true" : "false");
  data.append("subject_name_uz", form.name_uz.trim());
  data.append("subject_name_ru", form.name_ru.trim());
  data.append("description_uz", form.description_uz.trim());
  data.append("description_ru", form.description_ru.trim());
  return data;
}

export default function Fanlar() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<"uz" | "ru">("uz");

  const [formData, setFormData] = useState<SubjectFormData>({
    subject_type: "test",
    max_score: 10,
    min_score: 0,
    duration_minutes: 0,
    sort_order: 0,
    is_active: true,
    name_uz: "",
    name_ru: "",
    description_uz: "",
    description_ru: "",
  });

  const languages = [
    { id: "uz", label: "O'zbekcha" },
    { id: "ru", label: "Русский" },
  ] as const;

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    setLoading(true);
    try {
      const token = sessionStorage.getItem("auth_token");
      const headers: Record<string, string> = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(SUBJECTS_URL, { headers });
      if (response.ok) {
        const data = await response.json();
        setSubjects(
          parseListResponse<Subject>(data).sort(
            (a, b) => (a.sort_order || 0) - (b.sort_order || 0),
          ),
        );
      } else {
        toast.error("Fanlarni yuklashda xatolik");
      }
    } catch {
      toast.error("Fanlarni yuklashda xatolik");
    } finally {
      setLoading(false);
    }
  };

  const filteredSubjects = subjects.filter((subject) =>
    getSubjectName(subject).toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleAdd = () => {
    setEditingSubject(null);
    setActiveTab("uz");
    setFormData({
      subject_type: "test",
      max_score: 10,
      min_score: 0,
      duration_minutes: 0,
      sort_order: subjects.length,
      is_active: true,
      name_uz: "",
      name_ru: "",
      description_uz: "",
      description_ru: "",
    });
    setIsModalOpen(true);
  };

  const handleEdit = async (subject: Subject) => {
    const token = sessionStorage.getItem("auth_token");
    if (!token) {
      toast.error("Avtorizatsiya talab qilinadi");
      return;
    }

    try {
      const response = await fetch(`${SUBJECTS_URL}${subject.id}/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        toast.error("Fan ma'lumotlarini yuklashda xatolik");
        return;
      }

      const data: Subject = await response.json();
      setEditingSubject(data);
      setFormData(parseSubjectToForm(data));
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

      const response = await fetch(`${SUBJECTS_URL}${id}/`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        toast.success("Fan o'chirildi");
        fetchSubjects();
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

    if (!formData.name_uz.trim()) {
      toast.error("Fan nomi (UZ) majburiy");
      return;
    }

    const token = sessionStorage.getItem("auth_token");
    if (!token) {
      toast.error("Avtorizatsiya talab qilinadi");
      return;
    }

    setIsSubmitting(true);

    try {
      const url = editingSubject ? `${SUBJECTS_URL}${editingSubject.id}/` : SUBJECTS_URL;
      const method = editingSubject ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token}` },
        body: buildSubjectFormData(formData),
      });

      if (response.ok) {
        toast.success(editingSubject ? "Fan tahrirlandi" : "Fan qo'shildi");
        setIsModalOpen(false);
        fetchSubjects();
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
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <BookOpen className="w-6 h-6 md:w-8 md:h-8 text-[#0d89b1]" />
            Imtihon fanlari
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Qabul imtihonidagi fanlarni boshqarish
          </p>
        </div>
        <button
          onClick={handleAdd}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#0d89b1] text-white font-bold rounded-lg hover:bg-[#0a6d8f] transition-all shadow-lg shadow-[#0d89b1]/20 active:scale-[0.98] w-full sm:w-auto justify-center"
        >
          <Plus className="w-5 h-5" />
          Fan qo'shish
        </button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Fanlarni qidirish..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-[#0d89b1]/20 focus:border-[#0d89b1] transition-all"
        />
      </div>

      <div className="space-y-4">
        {filteredSubjects.map((subject) => (
          <div
            key={subject.id}
            className="flex items-center justify-between p-4 md:p-5 bg-white dark:bg-[#1f2937] rounded-lg border border-gray-100 dark:border-gray-800 hover:border-[#0d89b1]/30 transition-all group shadow-sm"
          >
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-10 h-10 bg-[#0d89b1]/10 text-[#0d89b1] rounded-lg flex items-center justify-center font-bold border border-[#0d89b1]/20 shrink-0">
                {subject.sort_order}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-bold text-gray-900 dark:text-white text-sm md:text-base truncate">
                    {getSubjectName(subject)}
                  </h4>
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      subject.is_active !== false ? "bg-green-500" : "bg-red-500"
                    }`}
                  />
                </div>
                <p className="text-[10px] md:text-xs text-gray-500 font-medium uppercase tracking-wider mt-0.5">
                  {subject.subject_type_display || subject.subject_type} • Max: {subject.max_score} ball
                  {subject.duration_minutes ? ` • ${subject.duration_minutes} daqiqa` : ""}
                </p>
                {getSubjectDescription(subject) && (
                  <p className="text-xs text-gray-400 mt-1 line-clamp-1">
                    {getSubjectDescription(subject)}
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0">
              <button
                onClick={() => handleEdit(subject)}
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
                    <AlertDialogTitle>Fanni o'chirish</AlertDialogTitle>
                    <AlertDialogDescription>
                      Rostdan ham ushbu fanni o'chirmoqchimisiz?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Bekor qilish</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleDelete(subject.id)}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Ha, o'chirish
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        ))}

        {filteredSubjects.length === 0 && (
          <div className="text-center py-20 text-gray-400 font-medium border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
            <BookOpen className="w-12 h-12 mx-auto mb-2 opacity-20" />
            <p>Fanlar topilmadi</p>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-white dark:bg-[#1f2937] w-full max-w-2xl rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 animate-in fade-in zoom-in duration-200 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="sticky top-0 bg-white/80 dark:bg-[#1f2937]/80 backdrop-blur-md px-6 md:px-8 py-5 md:py-6 border-b border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 z-10">
              <h3 className="text-lg md:text-xl font-bold text-[#1f2937] dark:text-gray-100">
                {editingSubject ? "Fanni tahrirlash" : "Yangi fan qo'shish"}
              </h3>
              <div className="flex items-center gap-2 w-full sm:w-auto justify-between">
                <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                  {languages.map((lang) => (
                    <button
                      key={lang.id}
                      type="button"
                      onClick={() => setActiveTab(lang.id)}
                      className={`px-3 md:px-4 py-1 md:py-1.5 text-xs font-bold rounded-md transition-all ${
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

            <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6 md:space-y-8 overflow-y-auto">
              <div className="p-5 md:p-6 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-700">
                <h4 className="text-xs font-bold text-[#0d89b1] uppercase tracking-widest flex items-center gap-2 mb-6">
                  <span className="w-4 h-[1px] bg-[#0d89b1]" />
                  {languages.find((l) => l.id === activeTab)?.label} tilidagi ma'lumotlar
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                      Fan nomi ({activeTab.toUpperCase()}) {activeTab === "uz" && "*"}
                    </label>
                    <input
                      type="text"
                      value={activeTab === "uz" ? formData.name_uz : formData.name_ru}
                      onChange={(e) => {
                        const field = activeTab === "uz" ? "name_uz" : "name_ru";
                        setFormData({ ...formData, [field]: e.target.value });
                      }}
                      className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-[#0d89b1]/20 outline-none transition-all text-sm"
                      required={activeTab === "uz"}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                      Tavsif ({activeTab.toUpperCase()})
                    </label>
                    <textarea
                      value={activeTab === "uz" ? formData.description_uz : formData.description_ru}
                      onChange={(e) => {
                        const field = activeTab === "uz" ? "description_uz" : "description_ru";
                        setFormData({ ...formData, [field]: e.target.value });
                      }}
                      rows={2}
                      className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-[#0d89b1]/20 outline-none transition-all resize-none text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-[10px] md:text-xs font-bold text-gray-500 uppercase mb-1.5">
                    Turi
                  </label>
                  <select
                    value={formData.subject_type}
                    onChange={(e) =>
                      setFormData({ ...formData, subject_type: e.target.value as SubjectType })
                    }
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md text-sm"
                  >
                    {SUBJECT_TYPES.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] md:text-xs font-bold text-gray-500 uppercase mb-1.5">
                    Maks. ball
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={formData.max_score}
                    onChange={(e) =>
                      setFormData({ ...formData, max_score: Number(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md text-sm"
                  />
                </div>
                <div>
                  <label className="block text-[10px] md:text-xs font-bold text-gray-500 uppercase mb-1.5">
                    Min. ball
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={formData.min_score}
                    onChange={(e) =>
                      setFormData({ ...formData, min_score: Number(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md text-sm"
                  />
                </div>
                <div>
                  <label className="block text-[10px] md:text-xs font-bold text-gray-500 uppercase mb-1.5">
                    Davomiylik (daq)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={formData.duration_minutes}
                    onChange={(e) =>
                      setFormData({ ...formData, duration_minutes: Number(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] md:text-xs font-bold text-gray-500 uppercase mb-1.5">
                    Tartib raqami
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={formData.sort_order}
                    onChange={(e) =>
                      setFormData({ ...formData, sort_order: Number(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md text-sm"
                  />
                </div>
                <div className="flex items-center gap-3 pt-5">
                  <input
                    type="checkbox"
                    id="is_active_subject"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-5 h-5 rounded text-[#0d89b1] focus:ring-[#0d89b1]"
                  />
                  <label
                    htmlFor="is_active_subject"
                    className="text-sm font-bold text-gray-700 dark:text-gray-300 cursor-pointer"
                  >
                    Faol holatda
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 md:gap-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-2.5 text-sm font-bold text-gray-500 hover:text-gray-700 transition-colors"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-8 md:px-10 py-2.5 md:py-3 bg-[#0d89b1] text-white font-bold rounded-lg hover:bg-[#0a6d8f] transition-all shadow-lg shadow-[#0d89b1]/20 disabled:opacity-50 text-sm"
                >
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  Fanni saqlash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </motion.div>
  );
}
