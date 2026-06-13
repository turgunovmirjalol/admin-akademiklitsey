export const API_BASE_URL = "https://api.fdtu1al.uz";

export const SETTINGS_URL = `${API_BASE_URL}/settings/`;
export const STATISTICS_URL = `${API_BASE_URL}/statistics/`;

export const getImageUrl = (path: string | null) => {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  // Ensure the path starts with /
  const formattedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${formattedPath}`;
};
