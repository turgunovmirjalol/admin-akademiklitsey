import { Bell, Sun, Moon, LogOut, ChevronDown } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useTheme } from "next-themes";
import { useAuth } from "../context/AuthContext";
import { ImageWithFallback } from "./figma/ImageWithFallback";

export function Navbar() {
  const { theme, setTheme } = useTheme();
  const { user, logout } = useAuth();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <nav className="h-[60px] bg-white dark:bg-[#1f2937] border-b border-gray-200 dark:border-gray-700 px-4 lg:px-6 flex items-center justify-between fixed lg:static top-0 left-0 right-0 z-30 transition-colors">
      <div className="flex-1" />

      {/* Right side actions */}
      <div className="flex items-center gap-2 lg:gap-4">
        {/* Theme Switcher */}
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-[#64748b] dark:text-gray-400"
          title={theme === "dark" ? "Yorug' rejimga o'tish" : "Tungi rejimga o'tish"}
        >
          {theme === "dark" ? (
            <Sun className="w-5 h-5" />
          ) : (
            <Moon className="w-5 h-5" />
          )}
        </button>

        {/* Notifications */}
        <button className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-[#64748b] dark:text-gray-400">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>

        {/* User Profile */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center gap-3 pl-2 lg:pl-4 border-l border-gray-200 dark:border-gray-700 hover:opacity-80 transition-opacity"
          >
            <div className="text-right hidden lg:block">
              <p className="text-sm font-medium text-[#1f2937] dark:text-gray-100">
                {user?.username || "Admin"}
              </p>
              <p className="text-xs text-[#64748b] dark:text-gray-400">
                {user?.role || "Administrator"}
              </p>
            </div>
            <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-[#0d89b1]/20 relative">
              <ImageWithFallback
                src="/logoicon.png"
                alt="Admin"
                className="w-full h-full"
                objectFit="contain"
              />
            </div>
            <ChevronDown className={`w-4 h-4 text-[#64748b] transition-transform ${isProfileOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Profile Dropdown */}
          {isProfileOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-[#1f2937] rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50 animate-in fade-in zoom-in duration-200">
              <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-700 lg:hidden">
                <p className="text-sm font-medium text-[#1f2937] dark:text-gray-100">
                  {user?.username || "Admin"}
                </p>
                <p className="text-xs text-[#64748b] dark:text-gray-400">
                  {user?.role || "Administrator"}
                </p>
              </div>
              <button
                onClick={logout}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Tizimdan chiqish
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}