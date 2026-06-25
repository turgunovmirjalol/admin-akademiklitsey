export const API_BASE_URL = "https://api.fdtu1al.uz";

export const SETTINGS_URL = `${API_BASE_URL}/settings/`;
export const STATISTICS_URL = `${API_BASE_URL}/statistics/`;
export const TEACHERS_URL = `${API_BASE_URL}/teachers/`;
export const DEPARTMENTS_URL = `${API_BASE_URL}/departments/`;
export const ANNOUNCEMENTS_URL = `${API_BASE_URL}/announcements/`;
export const MANAGEMENT_URL = `${API_BASE_URL}/management/`;
export const FAQ_URL = `${API_BASE_URL}/faq/`;
export const ADMISSION_CURRENT_URL = `${API_BASE_URL}/current/`;
export const DOCUMENTS_URL = `${API_BASE_URL}/documents/`;
export const SUBJECTS_URL = `${API_BASE_URL}/subjects/`;
export const DARS_JADVALI_URL = `${API_BASE_URL}/dars-jadvali/`;
export const GALLERY_ALBUMS_URL = `${API_BASE_URL}/gallery/albums/`;
export const VIDEOS_URL = `${API_BASE_URL}/videos/`;
export const CONTACT_MESSAGES_URL = `${API_BASE_URL}/messages/`;
export const CONTACT_STATS_URL = `${API_BASE_URL}/messages/stats/`;

export function parseListResponse<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object" && "results" in data) {
    return (data as { results: T[] }).results || [];
  }
  return [];
}

export function parseApiErrors(errData: unknown): string {
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

export function toIsoDateTime(dateStr: string): string {
  if (!dateStr) return "";
  return new Date(`${dateStr}T12:00:00`).toISOString();
}

export function toDateInputValue(value: string | null | undefined): string {
  if (!value) return "";
  return value.split("T")[0];
}

export const getImageUrl = (path: string | null) => {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  // Ensure the path starts with /
  const formattedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${formattedPath}`;
};
