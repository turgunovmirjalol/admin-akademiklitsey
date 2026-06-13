import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { SETTINGS_URL } from "../../config/api";

interface Settings {
  id: number;
  established_year: number;
  phone: string;
  email: string;
  website: string;
  logo: string | null;
  telegram: string | null;
  instagram: string | null;
  facebook: string | null;
  youtube: string | null;
  translations: {
    uz: {
      short_name: string;
      full_name: string;
      address: string;
    };
    ru: {
      short_name: string;
      full_name: string;
      address: string;
    };
  };
}

interface SettingsContextType {
  settings: Settings | null;
  loading: boolean;
  refreshSettings: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSettings = async () => {
    try {
      const token = sessionStorage.getItem("auth_token");
      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      
      const response = await fetch(SETTINGS_URL, { headers });
      const data = await response.json();
      if (response.ok) {
        const settingsData = Array.isArray(data) ? data[0] : (data.results ? data.results[0] : data);
        if (settingsData) {
          setSettings(settingsData);
        }
      } else {
        console.error("Settings fetch failed with status:", response.status);
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, loading, refreshSettings: fetchSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
}
