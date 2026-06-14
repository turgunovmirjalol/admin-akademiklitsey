import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { Plus, Search, Edit, Trash2, X, Loader2, Users, Phone, Mail, MapPin, Check, Save } from "lucide-react";
import { toast } from "sonner";
import { DEPARTMENTS_URL, TEACHERS_URL, parseApiErrors, parseListResponse } from "../../config/api";
import { PageSkeleton as SkeletonLoader } from "../components/PageSkeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "../components/ui/alert-dialog";

interface Department {
  id: number;
  slug: string;
  translations: {
    uz: { name: string; description?: string };
    ru?: { name: string; description?: string };
  };
  head_teacher?: number | { id: number; full_name: string } | string | null;
  subjects: string[] | null;
  room_number: string | null;
  phone: string | null;
  email: string | null;
  teachers_count?: number;
  sort_order: number;
  is_active: boolean;
}

interface DepartmentFormData {
  name_uz: string;
  name_ru: string;
  description_uz: string;
  description_ru: string;
  head_teacher: string;
  subjects: string[];
  room_number: string;
  phone: string;
  email: string;
  sort_order: number;
  is_active: boolean;
}

interface Teacher {
  id: number;
  full_name: string;
}

function getDepartmentName(dept: Department): string {
  return dept.translations?.uz?.name || dept.translations?.ru?.name || "";
}

function parseHeadTeacherId(value: Department["head_teacher"]): string {
  if (!value) return "";
  if (typeof value === "number") return String(value);
  if (typeof value === "object" && "id" in value) return String(value.id);
  return "";
}

function getHeadTeacherName(dept: Department, teachers: Teacher[]): string {
  if (typeof dept.head_teacher === "object" && dept.head_teacher && "full_name" in dept.head_teacher) {
    return dept.head_teacher.full_name;
  }
  if (typeof dept.head_teacher === "number") {
    return teachers.find((t) => t.id === dept.head_teacher)?.full_name || "Tayinlanmagan";
  }
  if (typeof dept.head_teacher === "string" && dept.head_teacher) {
    return dept.head_teacher;
  }
  return "Tayinlanmagan";
}

function parseDepartmentToForm(dept: Department): DepartmentFormData {
  return {
    name_uz: dept.translations?.uz?.name || "",
    name_ru: dept.translations?.ru?.name || "",
    description_uz: dept.translations?.uz?.description || "",
    description_ru: dept.translations?.ru?.description || "",
    head_teacher: parseHeadTeacherId(dept.head_teacher),
    subjects: dept.subjects || [],
    room_number: dept.room_number || "",
    phone: dept.phone || "",
    email: dept.email || "",
    sort_order: dept.sort_order ?? 0,
    is_active: dept.is_active ?? true,
  };
}

function buildDepartmentPayload(formData: DepartmentFormData) {
  return {
    name_uz: formData.name_uz.trim(),
    name_ru: formData.name_ru.trim(),
    description_uz: formData.description_uz.trim() || null,
    description_ru: formData.description_ru.trim() || null,
    head_teacher: formData.head_teacher ? Number(formData.head_teacher) : null,
    subjects: formData.subjects,
    room_number: formData.room_number.trim() || null,
    phone: formData.phone.trim() || null,
    email: formData.email.trim() || null,
    sort_order: formData.sort_order || 0,
    is_active: formData.is_active,
  };
}

export default function Kafedralar() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<"uz" | "ru">("uz");
  const [subjectInput, setSubjectInput] = useState("");

  const [formData, setFormData] = useState<DepartmentFormData>({
    name_uz: "",
    name_ru: "",
    description_uz: "",
    description_ru: "",
    head_teacher: "",
    subjects: [] as string[],
    room_number: "",
    phone: "",
    email: "",
    sort_order: 0,
    is_active: true,
  });

  const languages = [
    { id: "uz", label: "O'zbekcha" },
    { id: "ru", label: "Русский" },
    // { id: "en", label: "English" },
    // { id: "uz_cyrl", label: "Криллcha" },
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

      const [deptRes, teacherRes] = await Promise.all([
        fetch(DEPARTMENTS_URL, { headers }),
        fetch(TEACHERS_URL, { headers }),
      ]);

      if (deptRes.ok) {
        const data = await deptRes.json();
        setDepartments(parseListResponse<Department>(data));
      } else {
        toast.error("Kafedralarni yuklashda xatolik");
      }

      if (teacherRes.ok) {
        const data = await teacherRes.json();
        setTeachers(parseListResponse<Teacher>(data));
      }
    } catch {
      toast.error("Ma'lumotlarni yuklashda xatolik");
    } finally {
      setLoading(false);
    }
  };

  const filteredDepartments = departments.filter((d) =>
    getDepartmentName(d).toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAdd = () => {
    setEditingDept(null);
    setActiveTab("uz");
    setFormData({
      name_uz: "",
      name_ru: "",
      description_uz: "",
      description_ru: "",
      head_teacher: "",
      subjects: [],
      room_number: "",
      phone: "",
      email: "",
      sort_order: departments.length,
      is_active: true,
    });
    setSubjectInput("");
    setIsModalOpen(true);
  };

  const handleEdit = async (dept: Department) => {
    setEditingDept(dept);
    setActiveTab("uz");
    setIsModalOpen(true);

    const token = sessionStorage.getItem("auth_token");
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    try {
      const response = await fetch(`${DEPARTMENTS_URL}${dept.slug}/`, { headers });
      if (response.ok) {
        const data: Department = await response.json();
        setEditingDept(data);
        setFormData(parseDepartmentToForm(data));
      } else {
        setFormData(parseDepartmentToForm(dept));
      }
    } catch {
      setFormData(parseDepartmentToForm(dept));
    }
    setSubjectInput("");
  };

  const handleDelete = async (slug: string) => {
    const token = sessionStorage.getItem("auth_token");
    if (!token) {
      toast.error("Avtorizatsiya talab qilinadi");
      return;
    }

    try {
      const response = await fetch(`${DEPARTMENTS_URL}${slug}/`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        toast.success("Kafedra o'chirildi");
        fetchData();
      } else if (response.status === 401 || response.status === 403) {
        toast.error("Ruxsat yo'q");
      } else {
        toast.error("O'chirishda xatolik");
      }
    } catch {
      toast.error("Server xatosi");
    }
  };

  const handleAddSubject = () => {
    if (subjectInput.trim() && !formData.subjects.includes(subjectInput.trim())) {
      setFormData({
        ...formData,
        subjects: [...formData.subjects, subjectInput.trim()],
      });
      setSubjectInput("");
    }
  };

  const removeSubject = (index: number) => {
    setFormData({
      ...formData,
      subjects: formData.subjects.filter((_, i) => i !== index),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name_uz.trim() && !formData.name_ru.trim()) {
      toast.error("Kamida bitta tildagi kafedra nomi kiritilishi kerak");
      setActiveTab("uz");
      return;
    }

    const token = sessionStorage.getItem("auth_token");
    if (!token) {
      toast.error("Avtorizatsiya talab qilinadi. Qayta tizimga kiring");
      return;
    }

    setIsSubmitting(true);
    const payload = buildDepartmentPayload(formData);

    try {
      const url = editingDept
        ? `${DEPARTMENTS_URL}${editingDept.slug}/`
        : DEPARTMENTS_URL;
      const method = editingDept ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        toast.success(editingDept ? "Kafedra tahrirlandi" : "Kafedra qo'shildi");
        setIsModalOpen(false);
        fetchData();
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
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-[#1f2937] dark:text-gray-100">Kafedralar</h1>
          <p className="text-[#64748b] dark:text-gray-400 mt-1">
            Litsey kafedralarini boshqarish va mudirlarni tayinlash
          </p>
        </div>
        <button
          onClick={handleAdd}
          className="flex items-center gap-2 px-6 py-3 bg-[#0d89b1] text-white font-bold rounded-xl hover:bg-[#0a6d8f] transition-all shadow-lg shadow-[#0d89b1]/20 active:scale-[0.98]"
        >
          <Plus className="w-5 h-5" />
          Yangi kafedra
        </button>
      </div>

      {/* Search */}
      <div className="relative group max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-[#0d89b1] transition-colors" />
        <input
          type="text"
          placeholder="Kafedra nomini qidirish..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-3 bg-white dark:bg-[#1f2937] border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-4 focus:ring-[#0d89b1]/10 focus:border-[#0d89b1] outline-none transition-all shadow-sm"
        />
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredDepartments.map((dept) => (
          <div
            key={dept.id}
            className="group bg-white dark:bg-[#1f2937] border border-gray-200 dark:border-gray-700 rounded-3xl p-6 shadow-sm hover:shadow-xl hover:border-[#0d89b1]/30 transition-all relative overflow-hidden"
          >
            <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => handleEdit(dept)}
                className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl hover:bg-blue-100 transition-colors shadow-sm"
              >
                <Edit className="w-4 h-4" />
              </button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button className="p-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl hover:bg-red-100 transition-colors shadow-sm">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Kafedrani o'chirish</AlertDialogTitle>
                    <AlertDialogDescription>
                      Rostdan ham ushbu kafedrani o'chirmoqchimisiz? Bu amal ortga qaytarilmaydi.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Bekor qilish</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleDelete(dept.slug)} className="bg-red-600 hover:bg-red-700">
                      Ha, o'chirish
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>

            <div className="flex items-center gap-4 mb-6">
              <div className="p-4 bg-[#0d89b1]/10 text-[#0d89b1] rounded-2xl">
                <Users className="w-8 h-8" />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-[#1f2937] dark:text-gray-100 text-lg truncate">
                  {getDepartmentName(dept)}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`w-2 h-2 rounded-full ${dept.is_active ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span className="text-xs text-gray-400 font-medium">{dept.is_active ? 'Faol' : 'Nofaol'}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4 mb-6">
              <div className="flex items-start gap-3 text-sm text-gray-500 dark:text-gray-400">
                <Users className="w-4 h-4 mt-0.5 shrink-0 text-[#0d89b1]" />
                <span className="font-medium">
                  Mudiri: {getHeadTeacherName(dept, teachers)}
                </span>
              </div>
              <div className="flex items-start gap-3 text-sm text-gray-500 dark:text-gray-400">
                <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-[#0d89b1]" />
                <span className="font-medium">Xona: {dept.room_number || 'Kiritilmagan'}</span>
              </div>
              <div className="flex items-start gap-3 text-sm text-gray-500 dark:text-gray-400">
                <Phone className="w-4 h-4 mt-0.5 shrink-0 text-[#0d89b1]" />
                <span className="font-medium">{dept.phone || 'Telefon yo\'q'}</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-50 dark:border-gray-800">
              {dept.subjects?.slice(0, 3).map((sub, i) => (
                <span key={i} className="px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-[10px] font-bold rounded-lg uppercase tracking-wider">
                  {sub}
                </span>
              ))}
              {(dept.subjects?.length ?? 0) > 3 && (
                <span className="px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-[10px] font-bold rounded-lg">
                  +{(dept.subjects?.length ?? 0) - 3}
                </span>
              )}
            </div>
          </div>
        ))}

        {filteredDepartments.length === 0 && (
          <div className="col-span-full py-20 flex flex-col items-center justify-center bg-gray-50/50 dark:bg-gray-800/30 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl">
            <Users className="w-16 h-16 text-gray-300 mb-4" />
            <p className="text-gray-500 dark:text-gray-400 font-bold text-lg">Kafedralar topilmadi</p>
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
                {editingDept ? "Kafedrani tahrirlash" : "Yangi kafedra qo'shish"}
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
                      Kafedra nomi ({activeTab.toUpperCase()}) {activeTab === "uz" && "*"}
                    </label>
                    <input
                      type="text"
                      value={
                        activeTab === "uz" ? formData.name_uz : formData.name_ru
                      }
                      onChange={(e) => {
                        const field = `name_${activeTab}` as keyof typeof formData;
                        setFormData({ ...formData, [field]: e.target.value });
                      }}
                      className="w-full px-5 py-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-4 focus:ring-[#0d89b1]/10 focus:border-[#0d89b1] outline-none transition-all"
                      required={activeTab === "uz"}
                      placeholder={`${activeTab.toUpperCase()} tilida nomini kiriting...`}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                      Tavsif ({activeTab.toUpperCase()})
                    </label>
                    <textarea
                      value={
                        activeTab === "uz" ? formData.description_uz : formData.description_ru
                      }
                      onChange={(e) => {
                        const field = `description_${activeTab}` as keyof typeof formData;
                        setFormData({ ...formData, [field]: e.target.value });
                      }}
                      rows={3}
                      className="w-full px-5 py-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-4 focus:ring-[#0d89b1]/10 focus:border-[#0d89b1] outline-none transition-all resize-none"
                      placeholder={`${activeTab.toUpperCase()} tilida tavsif kiriting...`}
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
                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Kafedra mudiri</label>
                      <select
                        value={formData.head_teacher}
                        onChange={(e) => setFormData({ ...formData, head_teacher: e.target.value })}
                        className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-4 focus:ring-[#0d89b1]/10 focus:border-[#0d89b1] outline-none transition-all"
                      >
                        <option value="">Tanlang...</option>
                        {teachers.map((t) => (
                          <option key={t.id} value={t.id}>{t.full_name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Xona raqami</label>
                        <input
                          type="text"
                          value={formData.room_number}
                          onChange={(e) => setFormData({ ...formData, room_number: e.target.value })}
                          className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-4 focus:ring-[#0d89b1]/10 focus:border-[#0d89b1] outline-none transition-all"
                          placeholder="Masalan: 201"
                        />
                      </div>
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
                    </div>

                    <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
                      <input
                        type="checkbox"
                        id="is_active_dept"
                        checked={formData.is_active}
                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                        className="w-5 h-5 rounded-md text-[#0d89b1] focus:ring-[#0d89b1]"
                      />
                      <label htmlFor="is_active_dept" className="text-sm font-bold text-gray-700 dark:text-gray-300 cursor-pointer">
                        Faol holatda (saytda ko'rinadi)
                      </label>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <span className="w-4 h-[1px] bg-gray-300" />
                    Aloqa va Fanlar
                  </h4>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Telefon</label>
                      <input
                        type="text"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-4 focus:ring-[#0d89b1]/10 focus:border-[#0d89b1] outline-none transition-all"
                        placeholder="+998 90 123 45 67"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Email</label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-4 focus:ring-[#0d89b1]/10 focus:border-[#0d89b1] outline-none transition-all"
                        placeholder="kafedra@example.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Fanlar</label>
                      <div className="flex gap-2 mb-3">
                        <input
                          type="text"
                          value={subjectInput}
                          onChange={(e) => setSubjectInput(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSubject())}
                          className="flex-1 px-5 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-4 focus:ring-[#0d89b1]/10 outline-none"
                          placeholder="Fan nomi..."
                        />
                        <button
                          type="button"
                          onClick={handleAddSubject}
                          className="px-4 bg-[#0d89b1] text-white rounded-xl hover:bg-[#0a6d8f] transition-colors"
                        >
                          <Plus className="w-5 h-5" />
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {formData.subjects.map((sub, i) => (
                          <span key={i} className="flex items-center gap-1 px-3 py-1.5 bg-[#0d89b1]/10 text-[#0d89b1] text-xs font-bold rounded-lg border border-[#0d89b1]/20">
                            {sub}
                            <button onClick={() => removeSubject(i)} className="p-0.5 hover:bg-[#0d89b1]/20 rounded-md">
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
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
    </motion.div>
  );
}
