import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { 
  Plus, Edit, Trash2, X, Loader2, FileText, CheckCircle2, 
  Settings2, BookOpen, Save, Trash, AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import {
  ADMISSION_CURRENT_URL,
  DOCUMENTS_URL,
  SUBJECTS_URL,
  getImageUrl,
  parseApiErrors,
  toDateInputValue,
} from "../../config/api";
import { PageSkeleton as SkeletonLoader } from "../components/PageSkeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "../components/ui/alert-dialog";

interface AdmissionData {
  id: number;
  academic_year: string;
  total_quota: number;
  grant_quota: number;
  contract_quota: number;
  contract_price: string;
  application_start: string;
  application_end: string;
  exam_date: string;
  results_date: string;
  online_apply_url: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

interface TranslationField {
  name?: string;
  description?: string;
  document_name?: string;
  note?: string;
  subject_name?: string;
}

interface AdmissionDocument {
  id: number;
  translations: {
    uz: TranslationField;
    ru: TranslationField;
    en?: TranslationField;
    uz_cyrl?: TranslationField;
  };
  document_file: string;
  is_required: boolean;
  sort_order: number;
}

interface AdmissionSubject {
  id: number;
  subject_type: "test" | "creative" | "interview";
  subject_type_display?: string;
  max_score: number;
  sort_order: number;
  translations: {
    uz: TranslationField;
    ru: TranslationField;
    en?: TranslationField;
    uz_cyrl?: TranslationField;
  };
}

interface AdmissionResponse {
  admission_info: AdmissionData;
  subjects: AdmissionSubject[];
  documents: AdmissionDocument[];
}

export default function Qabul() {
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    academic_year: "",
    total_quota: 0,
    grant_quota: 0,
    contract_quota: 0,
    contract_price: "",
    application_start: "",
    application_end: "",
    exam_date: "",
    results_date: "",
    online_apply_url: "",
    is_active: true,
  });

  const [currentAdmission, setCurrentAdmission] = useState<AdmissionData | null>(null);
  
  const [activeTab, setActiveTab] = useState<"uz" | "ru">("uz");

  // Documents state
  const [documents, setDocuments] = useState<AdmissionDocument[]>([]);
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<AdmissionDocument | null>(null);
  const [isDocSubmitting, setIsDocSubmitting] = useState(false);
  const [docFormData, setDocFormData] = useState({
    is_required: true,
    sort_order: 0,
    document_name_uz: "",
    document_name_ru: "",
    note_uz: "",
    note_ru: "",
    document_file: null as File | string | null,
  });

  // Subjects state
  const [subjects, setSubjects] = useState<AdmissionSubject[]>([]);
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [editingSub, setEditingSub] = useState<AdmissionSubject | null>(null);
  const [isSubSubmitting, setIsSubSubmitting] = useState(false);
  const [subFormData, setSubFormData] = useState({
    subject_type: "test" as AdmissionSubject["subject_type"],
    max_score: 10,
    sort_order: 0,
    subject_name_uz: "",
    subject_name_ru: "",
    description_uz: "",
    description_ru: "",
  });

  const languages = [
    { id: "uz", label: "O'zbekcha" },
    { id: "ru", label: "Русский" },
    // { id: "en", label: "English" },
    // { id: "uz_cyrl", label: "Криллча" },
  ] as const;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = sessionStorage.getItem("auth_token");
      const headers: Record<string, string> = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(ADMISSION_CURRENT_URL, { headers });

      if (response.ok) {
        const data: AdmissionResponse = await response.json();
        const info = data.admission_info;

        if (info) {
          setCurrentAdmission(info);
          setFormData({
            academic_year: info.academic_year || "",
            total_quota: info.total_quota ?? 0,
            grant_quota: info.grant_quota ?? 0,
            contract_quota: info.contract_quota ?? 0,
            contract_price: info.contract_price || "",
            application_start: toDateInputValue(info.application_start),
            application_end: toDateInputValue(info.application_end),
            exam_date: toDateInputValue(info.exam_date),
            results_date: toDateInputValue(info.results_date),
            online_apply_url: info.online_apply_url || "",
            is_active: info.is_active ?? true,
          });
        }

        setDocuments(data.documents || []);
        setSubjects(data.subjects || []);
      } else if (response.status === 404) {
        setCurrentAdmission(null);
        setDocuments([]);
        setSubjects([]);
      } else {
        toast.error("Ma'lumotlarni yuklashda xatolik");
      }
    } catch {
      toast.error("Ma'lumotlarni yuklashda xatolik");
    } finally {
      setLoading(false);
    }
  };

  const handleAdmissionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Basic validation
    if (Number(formData.total_quota) !== Number(formData.grant_quota) + Number(formData.contract_quota)) {
      toast.error("Jami kvota grant va kontrakt kvotalari yig'indisiga teng bo'lishi kerak");
      return;
    }

    const token = sessionStorage.getItem("auth_token");
    if (!token) {
      toast.error("Avtorizatsiya talab qilinadi");
      return;
    }

    setIsSubmitting(true);

    try {
      const method = currentAdmission ? "PUT" : "POST";
      const payload = {
        academic_year: formData.academic_year,
        total_quota: Number(formData.total_quota) || 0,
        grant_quota: Number(formData.grant_quota) || 0,
        contract_quota: Number(formData.contract_quota) || 0,
        contract_price: formData.contract_price || null,
        application_start: formData.application_start || null,
        application_end: formData.application_end || null,
        exam_date: formData.exam_date || null,
        results_date: formData.results_date || null,
        online_apply_url: formData.online_apply_url || null,
        is_active: formData.is_active,
      };

      const response = await fetch(ADMISSION_CURRENT_URL, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        toast.success(currentAdmission ? "Qabul ma'lumotlari yangilandi" : "Qabul ma'lumotlari yaratildi");
        fetchData();
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

  // Documents handlers
  const handleAddDoc = () => {
    setEditingDoc(null);
    setDocFormData({
      is_required: true,
      sort_order: documents.length,
      document_name_uz: "",
      document_name_ru: "",
      note_uz: "",
      note_ru: "",
      document_file: null,
    });
    setIsDocModalOpen(true);
  };

  const handleEditDoc = (doc: AdmissionDocument) => {
    setEditingDoc(doc);
    setDocFormData({
      is_required: doc.is_required,
      sort_order: doc.sort_order,
      document_name_uz: doc.translations.uz.name || doc.translations.uz.document_name || "",
      document_name_ru: doc.translations.ru?.name || doc.translations.ru?.document_name || "",
      note_uz: doc.translations.uz.description || doc.translations.uz.note || "",
      note_ru: doc.translations.ru?.description || doc.translations.ru?.note || "",
      document_file: getImageUrl(doc.document_file),
    });
    setIsDocModalOpen(true);
  };

  const handleDeleteDoc = async (id: number) => {
    try {
      const token = sessionStorage.getItem("auth_token");
      if (!token) {
        toast.error("Avtorizatsiya talab qilinadi");
        return;
      }
      const response = await fetch(`${DOCUMENTS_URL}${id}/`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        toast.success("Hujjat o'chirildi");
        fetchData();
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

  const handleDocSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!docFormData.document_name_uz) {
      toast.error("Hujjat nomi (UZ) majburiy");
      return;
    }

    if (!editingDoc && !(docFormData.document_file instanceof File)) {
      toast.error("Hujjat fayli majburiy");
      return;
    }

    const token = sessionStorage.getItem("auth_token");
    if (!token) {
      toast.error("Avtorizatsiya talab qilinadi");
      return;
    }

    setIsDocSubmitting(true);

    const data = new FormData();
    data.append("is_required", String(docFormData.is_required));
    data.append("sort_order", String(docFormData.sort_order));
    data.append("name_uz", docFormData.document_name_uz);
    data.append("name_ru", docFormData.document_name_ru);
    data.append("description_uz", docFormData.note_uz);
    data.append("description_ru", docFormData.note_ru);
    data.append("is_active", "true");

    if (docFormData.document_file instanceof File) {
      data.append("file", docFormData.document_file);
    }

    try {
      const url = editingDoc ? `${DOCUMENTS_URL}${editingDoc.id}/` : DOCUMENTS_URL;
      const method = editingDoc ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token}` },
        body: data,
      });

      if (response.ok) {
        toast.success(editingDoc ? "Hujjat tahrirlandi" : "Hujjat qo'shildi");
        setIsDocModalOpen(false);
        fetchData();
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
      setIsDocSubmitting(false);
    }
  };

  // Subjects handlers
  const handleAddSub = () => {
    setEditingSub(null);
    setSubFormData({
      subject_type: "test",
      max_score: 10,
      sort_order: subjects.length,
      subject_name_uz: "",
      subject_name_ru: "",
      description_uz: "",
      description_ru: "",
    });
    setIsSubModalOpen(true);
  };

  const handleEditSub = (sub: AdmissionSubject) => {
    setEditingSub(sub);
    setSubFormData({
      subject_type: sub.subject_type,
      max_score: sub.max_score,
      sort_order: sub.sort_order,
      subject_name_uz: sub.translations.uz.name || sub.translations.uz.subject_name || "",
      subject_name_ru: sub.translations.ru?.name || sub.translations.ru?.subject_name || "",
      description_uz: sub.translations.uz.description || "",
      description_ru: sub.translations.ru?.description || "",
    });
    setIsSubModalOpen(true);
  };

  const handleDeleteSub = async (id: number) => {
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
        fetchData();
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

  const handleSubSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!subFormData.subject_name_uz) {
      toast.error("Fan nomi (UZ) majburiy");
      return;
    }

    const token = sessionStorage.getItem("auth_token");
    if (!token) {
      toast.error("Avtorizatsiya talab qilinadi");
      return;
    }

    setIsSubSubmitting(true);

    const data = new FormData();
    data.append("subject_type", subFormData.subject_type);
    data.append("max_score", String(subFormData.max_score));
    data.append("sort_order", String(subFormData.sort_order));
    data.append("name_uz", subFormData.subject_name_uz);
    data.append("name_ru", subFormData.subject_name_ru);
    data.append("description_uz", subFormData.description_uz);
    data.append("description_ru", subFormData.description_ru);
    data.append("is_active", "true");

    try {
      const url = editingSub ? `${SUBJECTS_URL}${editingSub.id}/` : SUBJECTS_URL;
      const method = editingSub ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token}` },
        body: data,
      });

      if (response.ok) {
        toast.success(editingSub ? "Fan tahrirlandi" : "Fan qo'shildi");
        setIsSubModalOpen(false);
        fetchData();
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
      setIsSubSubmitting(false);
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row md:items-center justify-between gap-4 bg-white dark:bg-[#1f2937] p-5 md:p-6 rounded-lg shadow-sm border border-gray-100 dark:border-gray-800">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Settings2 className="w-6 h-6 md:w-8 md:h-8 text-[#0d89b1]" />
            Qabul boshqaruvi
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Akademik yil, kvotalar va hujjatlarni sozlash
          </p>
        </div>
        <div className="flex items-center gap-3">
          {currentAdmission && (
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${currentAdmission.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
              {currentAdmission.is_active ? 'Faol qabul' : 'Nofaol qabul'}
            </span>
          )}
          <button
            onClick={fetchData}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-[#0d89b1] transition-colors"
          >
            Ma'lumotlarni yangilash
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
        {/* Left: General Settings */}
        <div className="lg:col-span-7 space-y-6 md:space-y-8">
          <section className="bg-white dark:bg-[#1f2937] p-5 md:p-8 rounded-lg shadow-sm border border-gray-100 dark:border-gray-800">
            <h2 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white mb-6 md:mb-8 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 md:w-6 md:h-6 text-[#0d89b1]" />
              Joriy qabul sozlamalari
            </h2>

            <form onSubmit={handleAdmissionSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs md:text-sm font-semibold text-gray-700 dark:text-gray-300">Akademik yil</label>
                  <input
                    type="text"
                    value={formData.academic_year || ""}
                    onChange={(e) => setFormData({ ...formData, academic_year: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-[#0d89b1]/20 outline-none transition-all text-sm"
                    placeholder="Masalan: 2024-2025"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs md:text-sm font-semibold text-gray-700 dark:text-gray-300">Shartnoma narxi</label>
                  <input
                    type="text"
                    value={formData.contract_price || ""}
                    onChange={(e) => setFormData({ ...formData, contract_price: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-[#0d89b1]/20 outline-none transition-all text-sm"
                    placeholder="Masalan: 12 000 000 UZS"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 md:gap-4 p-4 md:p-6 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-700">
                <div className="space-y-2">
                  <label className="text-[10px] md:text-xs font-bold text-gray-500 uppercase">Jami kvota</label>
                  <input
                    type="text"
                    value={formData.total_quota ?? 0}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "" || /^\d+$/.test(val)) {
                        setFormData({ ...formData, total_quota: val === "" ? 0 : Number(val) });
                      }
                    }}
                    className="w-full px-3 md:px-4 py-2 md:py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md focus:ring-2 focus:ring-[#0d89b1]/20 outline-none text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] md:text-xs font-bold text-green-600 uppercase">Grant</label>
                  <input
                    type="text"
                    value={formData.grant_quota ?? 0}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "" || /^\d+$/.test(val)) {
                        setFormData({ ...formData, grant_quota: val === "" ? 0 : Number(val) });
                      }
                    }}
                    className="w-full px-3 md:px-4 py-2 md:py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md focus:ring-2 focus:ring-green-500/20 outline-none text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] md:text-xs font-bold text-blue-600 uppercase">Kontrakt</label>
                  <input
                    type="text"
                    value={formData.contract_quota ?? 0}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "" || /^\d+$/.test(val)) {
                        setFormData({ ...formData, contract_quota: val === "" ? 0 : Number(val) });
                      }
                    }}
                    className="w-full px-3 md:px-4 py-2 md:py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md focus:ring-2 focus:ring-blue-500/20 outline-none text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs md:text-sm font-semibold text-gray-700 dark:text-gray-300">Ro'yxatga olish boshlanishi</label>
                  <input
                    type="date"
                    value={formData.application_start}
                    onChange={(e) => setFormData({ ...formData, application_start: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-[#0d89b1]/20 outline-none text-sm"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs md:text-sm font-semibold text-gray-700 dark:text-gray-300">Ro'yxatga olish tugashi</label>
                  <input
                    type="date"
                    value={formData.application_end}
                    onChange={(e) => setFormData({ ...formData, application_end: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-[#0d89b1]/20 outline-none text-sm"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs md:text-sm font-semibold text-gray-700 dark:text-gray-300">Imtihon kuni</label>
                  <input
                    type="date"
                    value={formData.exam_date}
                    onChange={(e) => setFormData({ ...formData, exam_date: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-[#0d89b1]/20 outline-none text-sm"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs md:text-sm font-semibold text-gray-700 dark:text-gray-300">Natijalar chiqish kuni</label>
                  <input
                    type="date"
                    value={formData.results_date}
                    onChange={(e) => setFormData({ ...formData, results_date: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-[#0d89b1]/20 outline-none text-sm"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs md:text-sm font-semibold text-gray-700 dark:text-gray-300">Onlayn ariza topshirish havolasi (URL)</label>
                <input
                  type="url"
                  value={formData.online_apply_url}
                  onChange={(e) => setFormData({ ...formData, online_apply_url: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-[#0d89b1]/20 outline-none transition-all text-sm"
                  placeholder="https://example.uz/apply"
                />
              </div>

              <div className="flex items-center gap-3 pt-4">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-5 h-5 rounded text-[#0d89b1] focus:ring-[#0d89b1]"
                />
                <label htmlFor="is_active" className="text-sm font-bold text-gray-700 dark:text-gray-300 cursor-pointer">
                  Qabulni faollashtirish (Saytda ko'rinadi)
                </label>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 md:py-4 bg-[#0d89b1] text-white font-bold rounded-lg hover:bg-[#0a6d8f] transition-all shadow-lg shadow-[#0d89b1]/20 flex items-center justify-center gap-2 text-sm md:text-base"
              >
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                Qabul ma'lumotlarini saqlash
              </button>
            </form>
          </section>

          {/* Subjects Section */}
          <section className="bg-white dark:bg-[#1f2937] p-5 md:p-8 rounded-lg shadow-sm border border-gray-100 dark:border-gray-800">
            <div className="flex items-center justify-between mb-6 md:mb-8 pb-4 border-b border-gray-50 dark:border-gray-800">
              <h2 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 md:w-6 md:h-6 text-[#0d89b1]" />
                Imtihon fanlari
              </h2>
              <button
                onClick={handleAddSub}
                className="flex items-center gap-2 px-3 md:px-4 py-2 bg-[#0d89b1]/10 text-[#0d89b1] font-bold rounded-lg hover:bg-[#0d89b1]/20 transition-all text-xs md:text-sm"
              >
                <Plus className="w-4 h-4" />
                Fan qo'shish
              </button>
            </div>

            <div className="space-y-4">
              {subjects.map((sub) => (
                <div key={sub.id} className="flex items-center justify-between p-4 md:p-5 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-700 hover:border-[#0d89b1]/30 transition-all group">
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 md:w-10 md:h-10 bg-white dark:bg-gray-800 rounded-lg flex items-center justify-center text-[#0d89b1] font-bold border border-gray-100 dark:border-gray-700 shadow-sm text-sm md:text-base">
                      {sub.sort_order}
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 dark:text-white text-sm md:text-base">{sub.translations.uz.name || sub.translations.uz.subject_name}</h4>
                      <p className="text-[10px] md:text-xs text-gray-500 font-medium uppercase tracking-wider">
                        {sub.subject_type} • Max: {sub.max_score} ball
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleEditSub(sub)} className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDeleteSub(sub.id)} className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
              {subjects.length === 0 && (
                <div className="text-center py-10 text-gray-400 font-medium border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-lg text-sm">
                  Fanlar hali qo'shilmagan
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Right: Documents List */}
        <div className="lg:col-span-5">
          <section className="bg-white dark:bg-[#1f2937] p-5 md:p-8 rounded-lg shadow-sm border border-gray-100 dark:border-gray-800 sticky top-6">
            <div className="flex items-center justify-between mb-6 md:mb-8 pb-4 border-b border-gray-50 dark:border-gray-800">
              <h2 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <FileText className="w-5 h-5 md:w-6 md:h-6 text-[#0d89b1]" />
                Kerakli hujjatlar
              </h2>
              <button
                onClick={handleAddDoc}
                className="flex items-center gap-2 px-3 md:px-4 py-2 bg-[#0d89b1]/10 text-[#0d89b1] font-bold rounded-lg hover:bg-[#0d89b1]/20 transition-all text-xs md:text-sm"
              >
                <Plus className="w-4 h-4" />
                Hujjat qo'shish
              </button>
            </div>

            <div className="space-y-4">
              {documents.map((doc) => (
                <div key={doc.id} className="p-4 md:p-5 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-700 hover:border-[#0d89b1]/30 transition-all group">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {doc.is_required ? (
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-gray-400" />
                      )}
                      <h4 className="font-bold text-gray-900 dark:text-white leading-tight text-sm md:text-base">{doc.translations.uz.name || doc.translations.uz.document_name}</h4>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleEditDoc(doc)} className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDeleteDoc(doc.id)} className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  {(doc.translations.uz.description || doc.translations.uz.note) && (
                    <p className="text-xs md:text-sm text-gray-500 line-clamp-2 pl-8">{doc.translations.uz.description || doc.translations.uz.note}</p>
                  )}
                </div>
              ))}
              {documents.length === 0 && (
                <div className="text-center py-10 text-gray-400 font-medium border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-lg text-sm">
                  Hujjatlar hali qo'shilmagan
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      {/* Document Modal */}
      {isDocModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsDocModalOpen(false)} />
          <div className="relative bg-white dark:bg-[#1f2937] w-full max-w-2xl rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 animate-in fade-in zoom-in duration-200 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="sticky top-0 bg-white/80 dark:bg-[#1f2937]/80 backdrop-blur-md px-6 md:px-8 py-5 md:py-6 border-b border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 z-10">
              <h3 className="text-lg md:text-xl font-bold text-[#1f2937] dark:text-gray-100">
                {editingDoc ? "Hujjatni tahrirlash" : "Yangi hujjat qo'shish"}
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
                  onClick={() => setIsDocModalOpen(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 md:w-6 md:h-6" />
                </button>
              </div>
            </div>

            <form onSubmit={handleDocSubmit} className="p-6 md:p-8 space-y-6 md:space-y-8 overflow-y-auto">
              <div className="grid grid-cols-1 gap-6 md:gap-8">
                {/* Single language section that switches */}
                <div className="space-y-6">
                  <div className="p-5 md:p-6 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-700">
                    <h4 className="text-xs font-bold text-[#0d89b1] uppercase tracking-widest flex items-center gap-2 mb-6">
                      <span className="w-4 h-[1px] bg-[#0d89b1]" />
                      {languages.find(l => l.id === activeTab)?.label} tilidagi ma'lumotlar
                    </h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                          Hujjat nomi ({activeTab.toUpperCase()}) {activeTab === "uz" && "*"}
                        </label>
                        <input
                          type="text"
                          value={
                            activeTab === "uz" ? docFormData.document_name_uz :
                            docFormData.document_name_ru
                          }
                          onChange={(e) => {
                            const field = `document_name_${activeTab}` as keyof typeof docFormData;
                            setDocFormData({ ...docFormData, [field]: e.target.value });
                          }}
                          className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-[#0d89b1]/20 outline-none transition-all text-sm"
                          required={activeTab === "uz"}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                          Izoh ({activeTab.toUpperCase()})
                        </label>
                        <textarea
                          value={
                            activeTab === "uz" ? docFormData.note_uz :
                            docFormData.note_ru
                          }
                          onChange={(e) => {
                            const field = `note_${activeTab}` as keyof typeof docFormData;
                            setDocFormData({ ...docFormData, [field]: e.target.value });
                          }}
                          rows={1}
                          className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-[#0d89b1]/20 outline-none transition-all resize-none text-sm"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 pt-4 border-t border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="is_required"
                    checked={docFormData.is_required}
                    onChange={(e) => setDocFormData({ ...docFormData, is_required: e.target.checked })}
                    className="w-5 h-5 rounded text-[#0d89b1] focus:ring-[#0d89b1]"
                  />
                  <label htmlFor="is_required" className="text-sm font-bold text-gray-700 dark:text-gray-300 cursor-pointer">Majburiy hujjat</label>
                </div>
              </div>

              <div className="flex justify-end gap-3 md:gap-4">
                <button
                  type="button"
                  onClick={() => setIsDocModalOpen(false)}
                  className="px-6 py-2.5 text-sm font-bold text-gray-500 hover:text-gray-700 transition-colors"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={isDocSubmitting}
                  className="px-8 md:px-10 py-2.5 md:py-3 bg-[#0d89b1] text-white font-bold rounded-lg hover:bg-[#0a6d8f] transition-all shadow-lg shadow-[#0d89b1]/20 disabled:opacity-50 text-sm"
                >
                  {isDocSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Hujjatni saqlash"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Subject Modal */}
      {isSubModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsSubModalOpen(false)} />
          <div className="relative bg-white dark:bg-[#1f2937] w-full max-w-2xl rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 animate-in fade-in zoom-in duration-200 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="sticky top-0 bg-white/80 dark:bg-[#1f2937]/80 backdrop-blur-md px-6 md:px-8 py-5 md:py-6 border-b border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 z-10">
              <h3 className="text-lg md:text-xl font-bold text-[#1f2937] dark:text-gray-100">
                {editingSub ? "Fanni tahrirlash" : "Yangi fan qo'shish"}
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
                  onClick={() => setIsSubModalOpen(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 md:w-6 md:h-6" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubSubmit} className="p-6 md:p-8 space-y-6 md:space-y-8 overflow-y-auto">
              <div className="grid grid-cols-1 gap-6 md:gap-8">
                <div className="space-y-6">
                  <div className="p-5 md:p-6 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-700">
                    <h4 className="text-xs font-bold text-[#0d89b1] uppercase tracking-widest flex items-center gap-2 mb-6">
                      <span className="w-4 h-[1px] bg-[#0d89b1]" />
                      {languages.find(l => l.id === activeTab)?.label} tilidagi ma'lumotlar
                    </h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                          Fan nomi ({activeTab.toUpperCase()}) {activeTab === "uz" && "*"}
                        </label>
                        <input
                          type="text"
                          value={
                            activeTab === "uz" ? subFormData.subject_name_uz :
                            subFormData.subject_name_ru
                          }
                          onChange={(e) => {
                            const field = `subject_name_${activeTab}` as keyof typeof subFormData;
                            setSubFormData({ ...subFormData, [field]: e.target.value });
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
                          value={
                            activeTab === "uz" ? subFormData.description_uz :
                            subFormData.description_ru
                          }
                          onChange={(e) => {
                            const field = `description_${activeTab}` as keyof typeof subFormData;
                            setSubFormData({ ...subFormData, [field]: e.target.value });
                          }}
                          rows={1}
                          className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-[#0d89b1]/20 outline-none transition-all resize-none text-sm"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6 pt-4 border-t border-gray-100 dark:border-gray-700">
                <div>
                  <label className="block text-[10px] md:text-xs font-bold text-gray-500 uppercase mb-1.5">Turi</label>
                  <select
                    value={subFormData.subject_type}
                    onChange={(e) => setSubFormData({ ...subFormData, subject_type: e.target.value as any })}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md text-sm"
                  >
                    <option value="test">Test</option>
                    <option value="creative">Ijodiy</option>
                    <option value="interview">Suhbat</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] md:text-xs font-bold text-gray-500 uppercase mb-1.5">Maks. ball</label>
                  <input
                    type="text"
                    value={subFormData.max_score}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "" || /^\d+$/.test(val)) {
                        setSubFormData({ ...subFormData, max_score: val === "" ? 0 : Number(val) });
                      }
                    }}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md text-sm"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 md:gap-4">
                <button
                  type="button"
                  onClick={() => setIsSubModalOpen(false)}
                  className="px-6 py-2.5 text-sm font-bold text-gray-500 hover:text-gray-700 transition-colors"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={isSubSubmitting}
                  className="px-8 md:px-10 py-2.5 md:py-3 bg-[#0d89b1] text-white font-bold rounded-lg hover:bg-[#0a6d8f] transition-all shadow-lg shadow-[#0d89b1]/20 disabled:opacity-50 text-sm"
                >
                  {isSubSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Fanni saqlash"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </motion.div>
  );
}
