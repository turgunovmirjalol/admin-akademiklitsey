import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { Plus, Search, Edit, Trash2, X, Loader2, HelpCircle, Save, Star } from "lucide-react";
import { toast } from "sonner";
import { FAQ_URL, parseApiErrors, parseListResponse } from "../../config/api";
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
} from "../components/ui/alert-dialog";

interface FAQ {
  id: number;
  category: string;
  category_display?: string;
  is_featured: boolean;
  sort_order: number;
  is_active: boolean;
  translations: {
    uz: { question: string; answer: string };
    ru?: { question: string; answer: string };
  };
}

interface FaqFormData {
  category: string;
  is_featured: boolean;
  sort_order: number;
  is_active: boolean;
  question_uz: string;
  question_ru: string;
  answer_uz: string;
  answer_ru: string;
}

function parseFaqToForm(faq: FAQ): FaqFormData {
  return {
    category: faq.category || "general",
    is_featured: faq.is_featured ?? false,
    sort_order: faq.sort_order ?? 0,
    is_active: faq.is_active ?? true,
    question_uz: faq.translations?.uz?.question || "",
    question_ru: faq.translations?.ru?.question || "",
    answer_uz: faq.translations?.uz?.answer || "",
    answer_ru: faq.translations?.ru?.answer || "",
  };
}

function buildFaqFormData(formData: FaqFormData): FormData {
  const data = new FormData();
  data.append("category", formData.category || "general");
  data.append("is_featured", formData.is_featured ? "true" : "false");
  data.append("sort_order", String(formData.sort_order || 0));
  data.append("is_active", formData.is_active ? "true" : "false");
  data.append("question_uz", formData.question_uz.trim());
  data.append("question_ru", formData.question_ru.trim());
  data.append("answer_uz", formData.answer_uz.trim());
  data.append("answer_ru", formData.answer_ru.trim());
  return data;
}

function getFaqQuestion(faq: FAQ): string {
  return faq.translations?.uz?.question || faq.translations?.ru?.question || "";
}

function getFaqAnswer(faq: FAQ): string {
  return faq.translations?.uz?.answer || faq.translations?.ru?.answer || "";
}

export default function Savollar() {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState<FAQ | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [faqToDelete, setFaqToDelete] = useState<FAQ | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState<"uz" | "ru">("uz");

  const [formData, setFormData] = useState<FaqFormData>({
    category: "general",
    is_featured: false,
    sort_order: 0,
    is_active: true,
    question_uz: "",
    question_ru: "",
    answer_uz: "",
    answer_ru: "",
  });

  const languages = [
    { id: "uz", label: "O'zbekcha" },
    { id: "ru", label: "Русский" },
    // { id: "en", label: "English" },
    // { id: "uz_cyrl", label: "Криллча" },
  ] as const;

  const categories = [
    { id: "general", label: "Umumiy" },
    { id: "admission", label: "Qabul" },
    { id: "education", label: "Ta'lim" },
    { id: "payment", label: "To'lov" },
  ];

  useEffect(() => {
    fetchFaqs();
  }, []);

  const fetchFaqs = async () => {
    setLoading(true);
    try {
      const token = sessionStorage.getItem("auth_token");
      const headers: Record<string, string> = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(FAQ_URL, { headers });
      if (response.ok) {
        const data = await response.json();
        setFaqs(parseListResponse<FAQ>(data));
      } else {
        toast.error("Savollarni yuklashda xatolik");
      }
    } catch {
      toast.error("Savollarni yuklashda xatolik");
    } finally {
      setLoading(false);
    }
  };

  const filteredFaqs = faqs.filter((f) =>
    getFaqQuestion(f).toLowerCase().includes(searchQuery.toLowerCase()) ||
    (f.category || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAdd = () => {
    setEditingFaq(null);
    setActiveTab("uz");
    setFormData({
      category: "general",
      is_featured: false,
      sort_order: faqs.length,
      is_active: true,
      question_uz: "",
      question_ru: "",
      answer_uz: "",
      answer_ru: "",
    });
    setIsModalOpen(true);
  };

  const handleEdit = async (faq: FAQ) => {
    setEditingFaq(faq);
    setActiveTab("uz");
    setIsModalOpen(true);

    const token = sessionStorage.getItem("auth_token");
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    try {
      const response = await fetch(`${FAQ_URL}${faq.id}/`, { headers });
      if (response.ok) {
        const data: FAQ = await response.json();
        setEditingFaq(data);
        setFormData(parseFaqToForm(data));
      } else {
        setFormData(parseFaqToForm(faq));
      }
    } catch {
      setFormData(parseFaqToForm(faq));
    }
  };

  const handleDelete = async () => {
    if (!faqToDelete) return;

    const token = sessionStorage.getItem("auth_token");
    if (!token) {
      toast.error("Avtorizatsiya talab qilinadi");
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch(`${FAQ_URL}${faqToDelete.id}/`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        toast.success("Savol o'chirildi");
        setIsDeleteDialogOpen(false);
        setFaqToDelete(null);
        fetchFaqs();
      } else if (response.status === 401 || response.status === 403) {
        toast.error("Ruxsat yo'q");
      } else {
        toast.error("O'chirishda xatolik");
      }
    } catch {
      toast.error("Server bilan bog'lanishda xatolik");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.question_uz.trim() && !formData.question_ru.trim()) {
      toast.error("Kamida bitta tildagi savol kiritilishi kerak");
      setActiveTab("uz");
      return;
    }

    if (!formData.answer_uz.trim() && !formData.answer_ru.trim()) {
      toast.error("Kamida bitta tildagi javob kiritilishi kerak");
      setActiveTab("uz");
      return;
    }

    const token = sessionStorage.getItem("auth_token");
    if (!token) {
      toast.error("Avtorizatsiya talab qilinadi. Qayta tizimga kiring");
      return;
    }

    setIsSubmitting(true);
    const data = buildFaqFormData(formData);

    try {
      const url = editingFaq
        ? `${FAQ_URL}${editingFaq.id}/`
        : FAQ_URL;
      const method = editingFaq ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token}` },
        body: data,
      });

      if (response.ok) {
        toast.success(editingFaq ? "Savol tahrirlandi" : "Savol qo'shildi");
        setIsModalOpen(false);
        fetchFaqs();
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
    return <SkeletonLoader type="list" />;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto overflow-x-hidden"
    >
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-[#1f2937] dark:text-gray-100">Savol-Javoblar</h1>
          <p className="text-[#64748b] dark:text-gray-400 mt-1">
            Ko'p beriladigan savollar (FAQ) bo'limini boshqarish
          </p>
        </div>
        <button
          onClick={handleAdd}
          className="flex items-center gap-2 px-6 py-3 bg-[#0d89b1] text-white font-bold rounded-xl hover:bg-[#0a6d8f] transition-all shadow-lg shadow-[#0d89b1]/20 active:scale-[0.98]"
        >
          <Plus className="w-5 h-5" />
          Yangi savol
        </button>
      </div>

      {/* Search */}
      <div className="relative group max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-[#0d89b1] transition-colors" />
        <input
          type="text"
          placeholder="Savollarni qidirish..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-3 bg-white dark:bg-[#1f2937] border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-4 focus:ring-[#0d89b1]/10 focus:border-[#0d89b1] outline-none transition-all shadow-sm"
        />
      </div>

      {/* List */}
      <div className="space-y-4">
        {filteredFaqs.map((faq) => (
          <div
            key={faq.id}
            className="group bg-white dark:bg-[#1f2937] border border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all relative"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-[#0d89b1]/10 text-[#0d89b1] rounded-xl shrink-0">
                  <HelpCircle className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-bold text-[#1f2937] dark:text-gray-100 text-lg">
                      {getFaqQuestion(faq)}
                    </h3>
                    {faq.is_featured && (
                      <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-600 text-[10px] font-bold rounded-full uppercase tracking-wider">
                        <Star className="w-3 h-3 fill-current" />
                        Saralangan
                      </span>
                    )}
                  </div>
                  <p className="text-gray-500 dark:text-gray-400 text-sm line-clamp-2">
                    {getFaqAnswer(faq)}
                  </p>
                  <div className="flex items-center gap-3 pt-2">
                    <span className="px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-[10px] font-bold rounded-lg uppercase tracking-wider">
                      {categories.find(c => c.id === faq.category)?.label}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${faq.is_active ? 'bg-green-500' : 'bg-red-500'}`} />
                      <span className="text-[10px] text-gray-400 font-bold uppercase">{faq.is_active ? 'Faol' : 'Nofaol'}</span>
                    </div>
                    <span className="text-[10px] text-gray-400 font-bold uppercase">Tartib: {faq.sort_order}</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <button
                  onClick={() => handleEdit(faq)}
                  className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl hover:bg-blue-100 transition-colors shadow-sm"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setFaqToDelete(faq);
                    setIsDeleteDialogOpen(true);
                  }}
                  className="p-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl hover:bg-red-100 transition-colors shadow-sm"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {filteredFaqs.length === 0 && (
          <div className="py-20 flex flex-col items-center justify-center bg-gray-50/50 dark:bg-gray-800/30 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl">
            <HelpCircle className="w-16 h-16 text-gray-300 mb-4" />
            <p className="text-gray-500 dark:text-gray-400 font-bold text-lg">Savollar topilmadi</p>
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-white dark:bg-[#1f2937] w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 animate-in fade-in zoom-in duration-200">
            <div className="sticky top-0 bg-white/80 dark:bg-[#1f2937]/80 backdrop-blur-md px-10 py-8 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center z-10">
              <h3 className="text-2xl font-bold text-[#1f2937] dark:text-gray-100">
                {editingFaq ? "Savolni tahrirlash" : "Yangi savol qo'shish"}
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

            <form onSubmit={handleSubmit} className="p-10 space-y-10">
              {/* Language Specific Fields */}
              <div className="p-8 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700 space-y-6">
                <h4 className="text-xs font-bold text-[#0d89b1] uppercase tracking-widest flex items-center gap-2">
                  <span className="w-4 h-[1px] bg-[#0d89b1]" />
                  {languages.find(l => l.id === activeTab)?.label} tilidagi ma'lumotlar
                </h4>
                
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                      Savol ({activeTab.toUpperCase()}) {activeTab === "uz" && "*"}
                    </label>
                    <input
                      type="text"
                      value={
                        activeTab === "uz" ? formData.question_uz : formData.question_ru
                      }
                      onChange={(e) => {
                        const field = `question_${activeTab}` as keyof typeof formData;
                        setFormData({ ...formData, [field]: e.target.value });
                      }}
                      className="w-full px-5 py-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-4 focus:ring-[#0d89b1]/10 focus:border-[#0d89b1] outline-none transition-all"
                      required={activeTab === "uz"}
                      placeholder={`${activeTab.toUpperCase()} tilida savolni kiriting...`}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                      Javob ({activeTab.toUpperCase()}) {activeTab === "uz" && "*"}
                    </label>
                    <textarea
                      value={
                        activeTab === "uz" ? formData.answer_uz : formData.answer_ru
                      }
                      onChange={(e) => {
                        const field = `answer_${activeTab}` as keyof typeof formData;
                        setFormData({ ...formData, [field]: e.target.value });
                      }}
                      rows={4}
                      className="w-full px-5 py-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-4 focus:ring-[#0d89b1]/10 focus:border-[#0d89b1] outline-none transition-all resize-none"
                      required={activeTab === "uz"}
                      placeholder={`${activeTab.toUpperCase()} tilida javobni kiriting...`}
                    />
                  </div>
                </div>
              </div>

              {/* General Settings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                <div className="space-y-6">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <span className="w-4 h-[1px] bg-gray-300" />
                    Asosiy sozlamalar
                  </h4>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Kategoriya</label>
                      <select
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-4 focus:ring-[#0d89b1]/10 focus:border-[#0d89b1] outline-none transition-all"
                      >
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>{c.label}</option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Tartib raqami</label>
                        <input
                          type="text"
                          value={formData.sort_order}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === "" || /^\d+$/.test(val)) {
                              setFormData({ ...formData, sort_order: val === "" ? 0 : Number(val) });
                            }
                          }}
                          className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-4 focus:ring-[#0d89b1]/10 focus:border-[#0d89b1] outline-none transition-all"
                          placeholder="0"
                        />
                      </div>
                      <div className="flex flex-col justify-end">
                        <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 h-[60px]">
                          <input
                            type="checkbox"
                            id="is_featured"
                            checked={formData.is_featured}
                            onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
                            className="w-5 h-5 rounded-md text-[#0d89b1] focus:ring-[#0d89b1]"
                          />
                          <label htmlFor="is_featured" className="text-sm font-bold text-gray-700 dark:text-gray-300 cursor-pointer">
                            Saralangan
                          </label>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
                      <input
                        type="checkbox"
                        id="is_active_faq"
                        checked={formData.is_active}
                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                        className="w-5 h-5 rounded-md text-[#0d89b1] focus:ring-[#0d89b1]"
                      />
                      <label htmlFor="is_active_faq" className="text-sm font-bold text-gray-700 dark:text-gray-300 cursor-pointer">
                        Faol holatda (saytda ko'rinadi)
                      </label>
                    </div>
                  </div>
                </div>

                <div className="space-y-6 flex flex-col justify-center p-8 bg-[#0d89b1]/5 dark:bg-[#0d89b1]/10 rounded-2xl border border-[#0d89b1]/20">
                  <div className="p-4 bg-white dark:bg-gray-800 rounded-2xl shadow-sm mb-4 self-center">
                    <HelpCircle className="w-12 h-12 text-[#0d89b1]" />
                  </div>
                  <h4 className="text-lg font-bold text-[#0d89b1] text-center mb-2">Maslahat</h4>
                  <p className="text-sm text-[#0d89b1]/80 dark:text-[#0d89b1]/90 text-center leading-relaxed">
                    Savol va javoblarni imkon qadar qisqa va tushunarli qilib yozing. 
                    Saralangan savollar asosiy sahifada yuqori qismda ko'rsatiladi.
                  </p>
                </div>
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

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Savolni o'chirish</AlertDialogTitle>
            <AlertDialogDescription>
              Haqiqatan ham ushbu savolni o'chirmoqchimisiz? Bu amalni ortga qaytarib bo'lmaydi.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setFaqToDelete(null)}>
              Bekor qilish
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 text-white hover:bg-red-700"
              disabled={isDeleting}
            >
              {isDeleting ? "O'chirilmoqda..." : "Ha, o'chirish"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
