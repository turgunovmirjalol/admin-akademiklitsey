import { motion } from "framer-motion";
import { useState, useEffect, useCallback } from "react";
import {
  Mail, Phone, Search, X, Loader2, Trash2, Inbox, Clock,
} from "lucide-react";
import { toast } from "sonner";
import { CONTACT_MESSAGES_URL, CONTACT_STATS_URL } from "../../config/api";
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

type MessageStatus = "new" | "read" | "replied" | "archived";
type MessageSubject = "admission" | "general" | "complaint" | "suggestion" | "other";

interface ContactMessage {
  id: number;
  full_name: string;
  email: string;
  phone: string;
  subject: MessageSubject;
  subject_display: string;
  message: string;
  status: MessageStatus;
  status_display: string;
  is_new: boolean;
  response_time: number | null;
  created_at: string;
  read_at: string | null;
  replied_at: string | null;
}

interface ContactMessageDetail extends ContactMessage {
  reply: string | null;
  replied_by_name: string | null;
  updated_at: string;
}

interface Stats {
  total: number;
  new: number;
  read: number;
  replied: number;
  archived: number;
  by_subject: Record<MessageSubject, number>;
}

const STATUS_OPTIONS: { id: MessageStatus; label: string }[] = [
  { id: "new", label: "Yangi" },
  { id: "read", label: "O'qilgan" },
  { id: "replied", label: "Javob berilgan" },
  { id: "archived", label: "Arxivlangan" },
];

const SUBJECT_OPTIONS: { id: MessageSubject; label: string }[] = [
  { id: "admission", label: "Qabul" },
  { id: "general", label: "Umumiy savol" },
  { id: "complaint", label: "Shikoyat" },
  { id: "suggestion", label: "Taklif" },
  { id: "other", label: "Boshqa" },
];

const STATUS_STYLES: Record<MessageStatus, string> = {
  new: "bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400",
  read: "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400",
  replied: "bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400",
  archived: "bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400",
};

function authHeaders(): Record<string, string> {
  const token = sessionStorage.getItem("auth_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function Murojaatlar() {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<MessageStatus | "">("");
  const [subjectFilter, setSubjectFilter] = useState<MessageSubject | "">("");

  const [selected, setSelected] = useState<ContactMessageDetail | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isStatusUpdating, setIsStatusUpdating] = useState(false);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState<ContactMessage | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      if (subjectFilter) params.set("subject", subjectFilter);
      if (searchQuery) params.set("search", searchQuery);
      params.set("page_size", "100");

      const response = await fetch(`${CONTACT_MESSAGES_URL}?${params.toString()}`, {
        headers: authHeaders(),
      });
      if (response.ok) {
        const data = await response.json();
        setMessages(Array.isArray(data) ? data : data.results || []);
      } else if (response.status === 401 || response.status === 403) {
        toast.error("Ruxsat yo'q. Qayta tizimga kiring");
      } else {
        toast.error("Murojaatlarni yuklashda xatolik");
      }
    } catch {
      toast.error("Server bilan bog'lanishda xatolik");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, subjectFilter, searchQuery]);

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch(CONTACT_STATS_URL, { headers: authHeaders() });
      if (response.ok) {
        setStats(await response.json());
      }
    } catch {
      // Stats are supplementary — silently ignore network errors here.
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    const timer = setTimeout(fetchMessages, searchQuery ? 350 : 0);
    return () => clearTimeout(timer);
  }, [fetchMessages, searchQuery]);

  const openMessage = async (msg: ContactMessage) => {
    setIsDetailLoading(true);
    setSelected({ ...msg, reply: null, replied_by_name: null, updated_at: msg.created_at });
    try {
      const response = await fetch(`${CONTACT_MESSAGES_URL}${msg.id}/`, {
        headers: authHeaders(),
      });
      if (response.ok) {
        const data: ContactMessageDetail = await response.json();
        setSelected(data);
        // Backend auto-marks as read; reflect that in the list without a refetch.
        setMessages((prev) =>
          prev.map((m) => (m.id === data.id ? { ...m, status: data.status, is_new: false } : m))
        );
        fetchStats();
      } else {
        toast.error("Xabarni yuklashda xatolik");
        setSelected(null);
      }
    } catch {
      toast.error("Server bilan bog'lanishda xatolik");
      setSelected(null);
    } finally {
      setIsDetailLoading(false);
    }
  };

  const closeModal = () => {
    setSelected(null);
  };

  const handleStatusChange = async (newStatus: MessageStatus) => {
    if (!selected) return;
    setIsStatusUpdating(true);
    try {
      const response = await fetch(`${CONTACT_MESSAGES_URL}${selected.id}/status/`, {
        method: "PATCH",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (response.ok) {
        const data: ContactMessageDetail = await response.json();
        setSelected(data);
        toast.success("Holat o'zgartirildi");
        fetchMessages();
        fetchStats();
      } else {
        toast.error("Holatni o'zgartirishda xatolik");
      }
    } catch {
      toast.error("Server bilan bog'lanishda xatolik");
    } finally {
      setIsStatusUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!messageToDelete) return;
    setIsDeleting(true);
    try {
      const response = await fetch(`${CONTACT_MESSAGES_URL}${messageToDelete.id}/`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (response.ok) {
        toast.success("Murojaat o'chirildi");
        setIsDeleteDialogOpen(false);
        setMessageToDelete(null);
        if (selected?.id === messageToDelete.id) closeModal();
        fetchMessages();
        fetchStats();
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

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString("uz-UZ", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

  if (loading && messages.length === 0 && !stats) {
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
      <div>
        <h1 className="text-2xl font-bold text-[#1f2937] dark:text-gray-100">Murojaatlar</h1>
        <p className="text-[#64748b] dark:text-gray-400 mt-1">
          Saytdagi aloqa formasi orqali kelgan murojaatlar
        </p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-[#1f2937] rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <p className="text-[#64748b] dark:text-gray-400 text-xs font-bold uppercase tracking-wider">Jami</p>
            <p className="text-3xl font-bold text-[#1f2937] dark:text-gray-100 mt-1">{stats.total}</p>
          </div>
          <div className="bg-white dark:bg-[#1f2937] rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <p className="text-blue-600 dark:text-blue-400 text-xs font-bold uppercase tracking-wider">Yangi</p>
            <p className="text-3xl font-bold text-[#1f2937] dark:text-gray-100 mt-1">{stats.new}</p>
          </div>
          <div className="bg-white dark:bg-[#1f2937] rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <p className="text-green-600 dark:text-green-400 text-xs font-bold uppercase tracking-wider">Javob berilgan</p>
            <p className="text-3xl font-bold text-[#1f2937] dark:text-gray-100 mt-1">{stats.replied}</p>
          </div>
          <div className="bg-white dark:bg-[#1f2937] rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <p className="text-amber-600 dark:text-amber-400 text-xs font-bold uppercase tracking-wider">Arxivlangan</p>
            <p className="text-3xl font-bold text-[#1f2937] dark:text-gray-100 mt-1">{stats.archived}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative group flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-[#0d89b1] transition-colors" />
          <input
            type="text"
            placeholder="Ism, email, telefon yoki matn bo'yicha qidirish..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white dark:bg-[#1f2937] border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-4 focus:ring-[#0d89b1]/10 focus:border-[#0d89b1] outline-none transition-all shadow-sm"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as MessageStatus | "")}
          className="px-4 py-3 bg-white dark:bg-[#1f2937] border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-4 focus:ring-[#0d89b1]/10 focus:border-[#0d89b1] outline-none transition-all shadow-sm"
        >
          <option value="">Barcha holatlar</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s.id} value={s.id}>{s.label}</option>
          ))}
        </select>
        <select
          value={subjectFilter}
          onChange={(e) => setSubjectFilter(e.target.value as MessageSubject | "")}
          className="px-4 py-3 bg-white dark:bg-[#1f2937] border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-4 focus:ring-[#0d89b1]/10 focus:border-[#0d89b1] outline-none transition-all shadow-sm"
        >
          <option value="">Barcha mavzular</option>
          {SUBJECT_OPTIONS.map((s) => (
            <option key={s.id} value={s.id}>{s.label}</option>
          ))}
        </select>
      </div>

      {/* List */}
      <div className="space-y-3">
        {messages.map((msg) => (
          <button
            key={msg.id}
            onClick={() => openMessage(msg)}
            className="w-full text-left group bg-white dark:bg-[#1f2937] border border-gray-200 dark:border-gray-700 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-[#0d89b1]/30 transition-all relative"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4 flex-1 min-w-0">
                {msg.is_new && (
                  <span className="w-2.5 h-2.5 bg-blue-500 rounded-full mt-1.5 shrink-0 animate-pulse" />
                )}
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="font-bold text-[#1f2937] dark:text-gray-100">{msg.full_name}</h3>
                    <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider ${STATUS_STYLES[msg.status]}`}>
                      {msg.status_display}
                    </span>
                    <span className="px-2.5 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-[10px] font-bold rounded-full uppercase tracking-wider">
                      {msg.subject_display}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" />{msg.email}</span>
                    <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" />{msg.phone}</span>
                  </div>
                  <p className="text-gray-500 dark:text-gray-400 text-sm line-clamp-1">{msg.message}</p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                <span className="text-[11px] text-gray-400 font-bold whitespace-nowrap">{formatDate(msg.created_at)}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setMessageToDelete(msg);
                    setIsDeleteDialogOpen(true);
                  }}
                  className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </button>
        ))}

        {!loading && messages.length === 0 && (
          <div className="py-20 flex flex-col items-center justify-center bg-gray-50/50 dark:bg-gray-800/30 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl">
            <Inbox className="w-16 h-16 text-gray-300 mb-4" />
            <p className="text-gray-500 dark:text-gray-400 font-bold text-lg">Murojaatlar topilmadi</p>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative bg-white dark:bg-[#1f2937] w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 animate-in fade-in zoom-in duration-200">
            <div className="sticky top-0 bg-white/80 dark:bg-[#1f2937]/80 backdrop-blur-md px-8 py-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-start z-10">
              <div>
                <h3 className="text-xl font-bold text-[#1f2937] dark:text-gray-100">{selected.full_name}</h3>
                <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mt-1">
                  <a href={`mailto:${selected.email}`} className="flex items-center gap-1.5 hover:text-[#0d89b1]">
                    <Mail className="w-4 h-4" />{selected.email}
                  </a>
                  <a href={`tel:${selected.phone.replace(/\s/g, '')}`} className="flex items-center gap-1.5 hover:text-[#0d89b1]">
                    <Phone className="w-4 h-4" />{selected.phone}
                  </a>
                </div>
              </div>
              <button onClick={closeModal} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors shrink-0">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-8 space-y-6">
              {isDetailLoading ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="w-8 h-8 animate-spin text-[#0d89b1]" />
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className={`px-3 py-1 text-xs font-bold rounded-full uppercase tracking-wider ${STATUS_STYLES[selected.status]}`}>
                      {selected.status_display}
                    </span>
                    <span className="px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-xs font-bold rounded-full uppercase tracking-wider">
                      {selected.subject_display}
                    </span>
                    <span className="flex items-center gap-1.5 text-xs text-gray-400 font-bold">
                      <Clock className="w-3.5 h-3.5" />{formatDate(selected.created_at)}
                    </span>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-6">
                    <p className="text-[#1f2937] dark:text-gray-200 whitespace-pre-line leading-relaxed">
                      {selected.message}
                    </p>
                  </div>

                  <div className="pt-6 border-t border-gray-100 dark:border-gray-700 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Holatni o'zgartirish:</span>
                      <select
                        value={selected.status}
                        onChange={(e) => handleStatusChange(e.target.value as MessageStatus)}
                        disabled={isStatusUpdating}
                        className="px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-bold focus:ring-4 focus:ring-[#0d89b1]/10 focus:border-[#0d89b1] outline-none transition-all disabled:opacity-50"
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s.id} value={s.id}>{s.label}</option>
                        ))}
                      </select>
                      {isStatusUpdating && <Loader2 className="w-4 h-4 animate-spin text-[#0d89b1]" />}
                    </div>
                    <button
                      onClick={() => {
                        setMessageToDelete(selected);
                        setIsDeleteDialogOpen(true);
                      }}
                      className="flex items-center gap-2 px-4 py-2 text-red-600 bg-red-50 dark:bg-red-900/20 rounded-xl hover:bg-red-100 transition-colors text-sm font-bold"
                    >
                      <Trash2 className="w-4 h-4" />
                      O'chirish
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Murojaatni o'chirish</AlertDialogTitle>
            <AlertDialogDescription>
              Haqiqatan ham "{messageToDelete?.full_name}" dan kelgan murojaatni o'chirmoqchimisiz? Bu amalni ortga qaytarib bo'lmaydi.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setMessageToDelete(null)}>
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
