import { NavLink } from "react-router";
import { useAuth } from "../context/AuthContext";
import {
  LayoutDashboard,
  Newspaper,
  Bell,
  Users,
  UserCog,
  BookOpen,
  Calendar,
  UserPlus,
  Image,
  Settings,
  LogOut,
  ChevronDown,
  Menu,
  X,
  Grid3x3,
  HelpCircle,
  BarChart3,
  Film,
} from "lucide-react";
import { useState } from "react";
import { ImageWithFallback } from "./figma/ImageWithFallback";

const navItems = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/yangiliklar", label: "Yangiliklar", icon: Newspaper },
  { path: "/elonlar", label: "E'lonlar", icon: Bell },
  { path: "/oqituvchilar", label: "O'qituvchilar", icon: Users },
  { path: "/rahbariyat", label: "Rahbariyat", icon: UserCog },
  { path: "/kafedralar", label: "Kafedralar", icon: Grid3x3 },
  { path: "/savollar", label: "Savollar", icon: HelpCircle },
  { path: "/statistika", label: "Statistika", icon: BarChart3 },
  { path: "/qabul", label: "Qabul", icon: UserPlus },
  { path: "/galereya", label: "Galereya", icon: Image },
  { path: "/videolar", label: "Videolar", icon: Film },
  { path: "/slayderlar", label: "Slayderlar", icon: LayoutDashboard },
  { path: "/sozlamalar", label: "Sozlamalar", icon: Settings },
];

export function Sidebar() {
  const [isEducationOpen, setIsEducationOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { logout } = useAuth();

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-md border border-gray-200"
      >
        {isMobileMenuOpen ? (
          <X className="w-6 h-6 text-[#1f2937]" />
        ) : (
          <Menu className="w-6 h-6 text-[#1f2937]" />
        )}
      </button>

      {/* Overlay */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`${
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 fixed lg:static w-[280px] h-screen bg-white dark:bg-[#1f2937] border-r border-gray-200 dark:border-gray-700 flex flex-col transition-all duration-300 z-40`}
      >
        {/* Logo */}
        <div className="h-[60px] flex items-center justify-center border-b border-gray-200 dark:border-gray-700 px-4">
          <div className="flex items-center gap-3">
            <ImageWithFallback
              src="/logoicon.png"
              alt="FDTU AL Logo"
              className="w-10 h-10"
              objectFit="contain"
            />
            <div className="text-center">
              <h1 className="text-lg font-bold text-[#0d89b1]">FDTU AL</h1>
              <p className="text-xs text-[#64748b] dark:text-gray-400">Admin Panel</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4">
          <ul className="space-y-1">
            {navItems.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  end={item.path === "/"}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      isActive
                        ? "bg-[#0d89b1] text-white"
                        : "text-[#1f2937] dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800"
                    }`
                  }
                >
                  <item.icon className="w-5 h-5" />
                  <span className="text-sm font-medium">{item.label}</span>
                </NavLink>
              </li>
            ))}

            {/* Ta'lim submenu */}
            <li>
              <button
                onClick={() => setIsEducationOpen(!isEducationOpen)}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-lg text-[#1f2937] dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <BookOpen className="w-5 h-5" />
                  <span className="text-sm font-medium">Ta'lim</span>
                </div>
                <ChevronDown
                  className={`w-4 h-4 transition-transform ${
                    isEducationOpen ? "rotate-180" : ""
                  }`}
                />
              </button>
              {isEducationOpen && (
                <ul className="mt-1 ml-12 space-y-1">
                  <li>
                    <NavLink
                      to="/fanlar"
                      className={({ isActive }) =>
                        `w-full text-left px-4 py-2 text-sm transition-colors flex items-center gap-2 ${
                          isActive ? "text-[#0d89b1] font-bold" : "text-[#64748b] dark:text-gray-400 hover:text-[#0d89b1]"
                        }`
                      }
                    >
                      Fanlar
                    </NavLink>
                  </li>
                  <li>
                    <NavLink
                      to="/dars-jadvali"
                      className={({ isActive }) =>
                        `w-full text-left px-4 py-2 text-sm transition-colors flex items-center gap-2 ${
                          isActive ? "text-[#0d89b1] font-bold" : "text-[#64748b] dark:text-gray-400 hover:text-[#0d89b1]"
                        }`
                      }
                    >
                      Dars jadvali
                    </NavLink>
                  </li>
                </ul>
              )}
            </li>
          </ul>
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="text-sm font-medium">Chiqish</span>
          </button>
        </div>
      </aside>
    </>
  );
}
