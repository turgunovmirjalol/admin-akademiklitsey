import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { Plus, Search, Edit, Trash2, X, Grid3x3, List, Loader2 } from "lucide-react";
import { Dialog } from "../components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "../components/ui/alert-dialog";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { ImageUpload } from "../components/ImageUpload";
import { toast } from "sonner";
import { API_BASE_URL, getImageUrl } from "../../config/api";
import { PageSkeleton as SkeletonLoader } from "../components/PageSkeleton";
import { SEO } from "../components/SEO";

interface TeacherTranslation {
  position: string;
  subject?: string;
  bio?: string;
  achievements?: string;
}

interface Department {
  id: number;
  slug: string;
  name_uz: string;
  name_ru?: string;
}

interface Teacher {
  id: number;
  slug: string;
  full_name: string;
  academic_degree: string;
  academic_rank: string;
  category: string;
  experience_years: number;
  sort_order: number;
  department: number | Department;
  email: string;
  phone?: string;
  photo: string;
  is_active: boolean;
  translations: {
    uz: TeacherTranslation;
    ru?: TeacherTranslation;
  };
}

export default function Oqituvchilar() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<"uz" | "ru">("uz");

  const [formData, setFormData] = useState({
    full_name: "",
    academic_degree: "Yo'q",
    academic_rank: "Yo'q",
    category: "none",
    experience_years: 0,
    sort_order: 0,
    email: "",
    phone: "",
    is_active: true,
    position_uz: "",
    position_ru: "",
    subject_uz: "",
    subject_ru: "",
    bio_uz: "",
    bio_ru: "",
    achievements_uz: "",
    achievements_ru: "",
    department: "",
    photo: null as File | string | null,
  });

  const languages = [
    { id: "uz", label: "O'zbekcha" },
    { id: "ru", label: "Русский" },
  ] as const;

  useEffect(() => {
    fetchTeachers();
  }, []);

  const fetchTeachers = async () => {
    setLoading(true);
    try {
      const token = sessionStorage.getItem("auth_token");
      const [teacherRes, deptRes] = await Promise.all([
        fetch(`${API_BASE_URL}/teachers`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE_URL}/departments`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (teacherRes.ok) {
        const data = await teacherRes.json();
        setTeachers(Array.isArray(data) ? data : data.results || []);
      } else {
        toast.error("O'qituvchilarni yuklashda xatolik");
      }

      if (deptRes.ok) {
        const data = await deptRes.json();
        setDepartments(Array.isArray(data) ? data : data.results || []);
      }
    } catch (error) {
      toast.error("Server bilan bog'lanishda xatolik");
    } finally {
      setLoading(false);
    }
  };

  const filteredTeachers = Array.isArray(teachers)
    ? teachers.filter((t) =>
        t.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  const handleAdd = () => {
    setEditingTeacher(null);
    setFormData({
      full_name: "",
      academic_degree: "Yo'q",
      academic_rank: "Yo'q",
      category: "none",
      experience_years: 0,
      sort_order: 0,
      email: "",
      phone: "",
      is_active: true,
      position_uz: "",
      position_ru: "",
      subject_uz: "",
      subject_ru: "",
      bio_uz: "",
      bio_ru: "",
      achievements_uz: "",
      achievements_ru: "",
      department: "",
      photo: null,
    });
    setIsModalOpen(true);
  };

  const handleEdit = (teacher: Teacher) => {
    setEditingTeacher(teacher);
    setFormData({
      full_name: teacher.full_name || "",
      academic_degree: teacher.academic_degree || "Yo'q",
      academic_rank: teacher.academic_rank || "Yo'q",
      category: teacher.category || "none",
      experience_years: teacher.experience_years,
      sort_order: teacher.sort_order || 0,
      email: teacher.email,
      phone: teacher.phone || "",
      is_active: teacher.is_active,
      position_uz: teacher.translations.uz.position || "",
      position_ru: teacher.translations?.ru?.position || "",
      subject_uz: teacher.translations?.uz?.subject || "",
      subject_ru: teacher.translations?.ru?.subject || "",
      bio_uz: teacher.translations?.uz?.bio || "",
      bio_ru: teacher.translations?.ru?.bio || "",
      achievements_uz: teacher.translations?.uz?.achievements || "",
      achievements_ru: teacher.translations?.ru?.achievements || "",
      department: (teacher.department && typeof teacher.department === 'object') ? String(teacher.department.id) : String(teacher.department || ""),
      photo: getImageUrl(teacher.photo),
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (slug: string) => {
    try {
      const token = sessionStorage.getItem("auth_token");
      const response = await fetch(`${API_BASE_URL}/teachers/${slug}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        toast.success("O'qituvchi o'chirildi");
        fetchTeachers();
      } else {
        toast.error("O'chirishda xatolik");
      }
    } catch (error) {
      toast.error("Server bilan bog'lanishda xatolik");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.full_name || !formData.position_uz) {
      toast.error("Iltimos, barcha majburiy maydonlarni to'ldiring");
      return;
    }

    setIsSubmitting(true);

    const token = sessionStorage.getItem("auth_token");
    const data = new FormData();

    // Required fields based on API docs
    data.append("full_name", formData.full_name);
    data.append("academic_degree", formData.academic_degree || "Yo'q");
    data.append("academic_rank", formData.academic_rank || "Yo'q");
    data.append("category", formData.category || "none");
    data.append("experience_years", String(formData.experience_years || 0));
    data.append("sort_order", String(formData.sort_order || 0));
    data.append("email", formData.email || "");
    if (formData.phone) {
      data.append("phone", formData.phone);
    }
    data.append("is_active", String(formData.is_active));
    
    // Translation fields
    data.append("position_uz", formData.position_uz);
    if (formData.position_ru) data.append("position_ru", formData.position_ru);
    if (formData.subject_uz) data.append("subject_uz", formData.subject_uz);
    if (formData.subject_ru) data.append("subject_ru", formData.subject_ru);
    if (formData.bio_uz) data.append("bio_uz", formData.bio_uz);
    if (formData.bio_ru) data.append("bio_ru", formData.bio_ru);
    if (formData.achievements_uz) data.append("achievements_uz", formData.achievements_uz);
    if (formData.achievements_ru) data.append("achievements_ru", formData.achievements_ru);
    
    if (formData.department && formData.department !== "") {
      data.append("department", String(formData.department));
    }

    if (formData.photo instanceof File) {
      data.append("photo", formData.photo);
    }

    try {
      const url = editingTeacher
        ? `${API_BASE_URL}/teachers/${editingTeacher.slug}`
        : `${API_BASE_URL}/teachers`;
      const method = editingTeacher ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token}` },
        body: data,
      });

      if (response.ok) {
        toast.success(editingTeacher ? "O'qituvchi tahrirlandi" : "O'qituvchi qo'shildi");
        setIsModalOpen(false);
        fetchTeachers();
      } else {
        const errData = await response.json();
        if (errData && typeof errData === 'object') {
          const errorMessages = Object.entries(errData)
            .map(([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs.join(', ') : msgs}`)
            .join('\n');
          toast.error(errorMessages || "Xatolik yuz berdi");
        } else {
          toast.error("Xatolik yuz berdi");
        }
      }
    } catch (error) {
      toast.error("Server bilan bog'lanishda xatolik");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <SkeletonLoader type={viewMode === "table" ? "table" : "grid"} />;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto overflow-x-hidden"
    >
      <SEO 
        title="O'qituvchilar" 
        description="FDTU Akademik Litseyi professor-o'qituvchilari haqida ma'lumot." 
        keywords="O'qituvchilar, Ustozlar, Litsey, FDTU"
      />
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1f2937] dark:text-gray-100">O'qituvchilar</h1>
          <p className="text-[#64748b] dark:text-gray-400 mt-1">O'qituvchilar boshqaruvi</p>
        </div>
        <button
          onClick={handleAdd}
          className="flex items-center gap-2 px-4 py-2 bg-[#0d89b1] text-white rounded-lg hover:bg-[#0a6d8f] transition-colors"
        >
          <Plus className="w-5 h-5" />
          Yangi o'qituvchi qo'shish
        </button>
      </div>

      {/* Search and View Toggle */}
      <div className="bg-white dark:bg-[#1f2937] rounded-lg border border-gray-200 dark:border-gray-700 p-4 transition-colors">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#64748b] dark:text-gray-400" />
            <input
              type="text"
              placeholder="O'qituvchi qidirish..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[#f8fafc] dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:border-[#0d89b1] dark:text-gray-100 dark:placeholder-gray-500"
            />
          </div>
          <div className="flex items-center gap-1 bg-[#f8fafc] dark:bg-gray-800/50 rounded-lg p-1">
            <button
              onClick={() => setViewMode("table")}
              className={`p-2 rounded ${
                viewMode === "table"
                  ? "bg-white dark:bg-gray-700 text-[#0d89b1] shadow-sm"
                  : "text-[#64748b] dark:text-gray-400"
              } transition-all`}
            >
              <List className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 rounded ${
                viewMode === "grid"
                  ? "bg-white dark:bg-gray-700 text-[#0d89b1] shadow-sm"
                  : "text-[#64748b] dark:text-gray-400"
              } transition-all`}
            >
              <Grid3x3 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Teachers Display */}
      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="w-8 h-8 text-[#0d89b1] animate-spin" />
        </div>
      ) : viewMode === "table" ? (
        <div className="bg-white dark:bg-[#1f2937] rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden transition-colors">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#f8fafc] dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[#64748b] dark:text-gray-400 uppercase tracking-wider">
                    Foto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[#64748b] dark:text-gray-400 uppercase tracking-wider">
                    F.I.O
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[#64748b] dark:text-gray-400 uppercase tracking-wider">
                    Lavozim
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[#64748b] dark:text-gray-400 uppercase tracking-wider">
                    Kafedra
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[#64748b] dark:text-gray-400 uppercase tracking-wider">
                    Tajriba
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[#64748b] dark:text-gray-400 uppercase tracking-wider">
                    Harakatlar
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredTeachers.map((teacher) => (
                  <tr key={teacher.id} className="hover:bg-[#f8fafc] dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <ImageWithFallback
                        src={getImageUrl(teacher.photo)}
                        alt={teacher.full_name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-[#1f2937] dark:text-gray-100">
                        {teacher.full_name}
                      </div>
                      <div className="text-xs text-[#64748b] dark:text-gray-400 mt-1">
                        {teacher.email}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-[#64748b] dark:text-gray-400">
                        {teacher.translations?.uz?.position}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-[#64748b] dark:text-gray-400">
                        {teacher.department && typeof teacher.department === 'object' ? teacher.department.name_uz : 
                         (teacher.department ? departments.find(d => d.id === teacher.department)?.name_uz : null) || "Kafedrasiz"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-[#64748b] dark:text-gray-400">
                        {teacher.experience_years} yil
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEdit(teacher)}
                          className="p-2 text-[#0d89b1] hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <button className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>O'qituvchini o'chirish</AlertDialogTitle>
                              <AlertDialogDescription>
                                Rostdan ham ushbu o'qituvchini o'chirmoqchimisiz? Bu amal ortga qaytarilmaydi.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Bekor qilish</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(teacher.slug)} className="bg-red-600 hover:bg-red-700">
                                Ha, o'chirish
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTeachers.map((teacher) => (
            <div
              key={teacher.id}
              className="bg-white dark:bg-[#1f2937] rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md dark:hover:shadow-gray-900 transition-all"
            >
              <div className="p-6">
                <div className="flex items-start gap-4">
                  <ImageWithFallback
                    src={getImageUrl(teacher.photo)}
                    alt={teacher.full_name}
                    className="w-20 h-20 rounded-full object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-semibold text-[#1f2937] dark:text-gray-100 truncate">
                      {teacher.full_name}
                    </h3>
                    <p className="text-sm text-[#64748b] dark:text-gray-400 mt-1">
                      {teacher.translations?.uz?.position}
                    </p>
                  </div>
                </div>
                
                <div className="mt-4 space-y-2">
                  <div className="text-sm">
                    <span className="text-[#64748b] dark:text-gray-400">Kafedra:</span>
                    <p className="text-[#1f2937] dark:text-gray-200 mt-1">
                      {teacher.department && typeof teacher.department === 'object' ? teacher.department.name_uz : 
                       (teacher.department ? departments.find(d => d.id === teacher.department)?.name_uz : null) || "Kafedrasiz"}
                    </p>
                  </div>
                  <div className="text-sm">
                    <span className="text-[#64748b] dark:text-gray-400">Tajriba:</span>
                    <p className="text-[#1f2937] dark:text-gray-200 mt-1">{teacher.experience_years} yil</p>
                  </div>
                  <div className="text-sm">
                    <span className="text-[#64748b] dark:text-gray-400">Email:</span>
                    <p className="text-[#1f2937] dark:text-gray-200 mt-1">{teacher.email || "Ko'rsatilmagan"}</p>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex items-center gap-2">
                  <button
                    onClick={() => handleEdit(teacher)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-[#0d89b1] bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                    Tahrirlash
                  </button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button className="px-3 py-2 text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>O'qituvchini o'chirish</AlertDialogTitle>
                        <AlertDialogDescription>
                          Rostdan ham ushbu o'qituvchini o'chirmoqchimisiz? Bu amal ortga qaytarilmaydi.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Bekor qilish</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(teacher.slug)} className="bg-red-600 hover:bg-red-700">
                          Ha, o'chirish
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-[#1f2937] rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto border dark:border-gray-700 shadow-2xl transition-all animate-in fade-in zoom-in duration-200">
              <div className="sticky top-0 bg-white/80 dark:bg-[#1f2937]/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-700 px-8 py-6 flex items-center justify-between z-10">
                <h2 className="text-2xl font-bold text-[#1f2937] dark:text-gray-100">
                  {editingTeacher ? "O'qituvchini tahrirlash" : "Yangi o'qituvchi qo'shish"}
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
                        label="O'qituvchi fotosurati"
                        value={formData.photo}
                        onChange={(file) => setFormData({ ...formData, photo: file as File })}
                        placeholder="Fotosuratni yuklash uchun bosing"
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
                            placeholder="Masalan: Eshmatov Toshmat"
                          />
                        </div>
                        <div className="grid grid-cols-1 gap-4">
                          <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                              Tajriba (yil)
                            </label>
                            <input
                              type="text"
                              value={formData.experience_years}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === "" || /^\d+$/.test(val)) {
                                  setFormData({ ...formData, experience_years: val === "" ? 0 : Number(val) });
                                }
                              }}
                              className="w-full px-5 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-4 focus:ring-[#0d89b1]/10 focus:border-[#0d89b1] outline-none transition-all dark:text-gray-100"
                              placeholder="Masalan: 5"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                            Kafedra
                          </label>
                          <select
                            value={formData.department}
                            onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                            className="w-full px-5 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-4 focus:ring-[#0d89b1]/10 focus:border-[#0d89b1] outline-none transition-all dark:text-gray-100"
                          >
                            <option value="">Kafedrani tanlang</option>
                            {departments.map((dept) => (
                              <option key={dept.id} value={dept.id}>
                                {dept.name_uz}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="p-6 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700 space-y-4">
                      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                        <span className="w-4 h-[1px] bg-gray-300" />
                        Aloqa ma'lumotlari
                      </h3>
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
                            placeholder="misol@mail.com"
                            className="w-full px-5 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-4 focus:ring-[#0d89b1]/10 focus:border-[#0d89b1] outline-none transition-all dark:text-gray-100"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Academic and Translations */}
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
                            placeholder="Masalan: Matematika o'qituvchisi"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                            Fani ({activeTab.toUpperCase()})
                          </label>
                          <input
                            type="text"
                            value={activeTab === "uz" ? formData.subject_uz : formData.subject_ru}
                            onChange={(e) => {
                              const field = `subject_${activeTab}` as keyof typeof formData;
                              setFormData({ ...formData, [field]: e.target.value });
                            }}
                            className="w-full px-5 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-4 focus:ring-[#0d89b1]/10 focus:border-[#0d89b1] outline-none transition-all dark:text-gray-100"
                            placeholder="Masalan: Matematika"
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
                            rows={4}
                            className="w-full px-5 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-4 focus:ring-[#0d89b1]/10 focus:border-[#0d89b1] outline-none transition-all dark:text-gray-100 resize-none"
                            placeholder="O'qituvchi haqida qisqacha ma'lumot..."
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                            Yutuqlari ({activeTab.toUpperCase()})
                          </label>
                          <textarea
                            value={activeTab === "uz" ? formData.achievements_uz : formData.achievements_ru}
                            onChange={(e) => {
                              const field = `achievements_${activeTab}` as keyof typeof formData;
                              setFormData({ ...formData, [field]: e.target.value });
                            }}
                            rows={3}
                            className="w-full px-5 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-4 focus:ring-[#0d89b1]/10 focus:border-[#0d89b1] outline-none transition-all dark:text-gray-100 resize-none"
                            placeholder="O'qituvchining yutuqlari..."
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700">
                      <input
                        type="checkbox"
                        id="is_active_teacher"
                        checked={formData.is_active}
                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                        className="w-5 h-5 rounded-md text-[#0d89b1] focus:ring-[#0d89b1]"
                      />
                      <label htmlFor="is_active_teacher" className="text-sm font-bold text-gray-700 dark:text-gray-300 cursor-pointer">
                        Faol holatda (saytda ko'rinadi)
                      </label>
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
                    {editingTeacher ? "Saqlash" : "Qo'shish"}
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
