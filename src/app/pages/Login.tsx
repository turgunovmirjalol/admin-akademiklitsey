import { useState } from "react";
import { Eye, EyeOff, Lock, User, LogIn } from "lucide-react";
import { API_BASE_URL } from "../../config/api";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { SEO } from "../components/SEO";

interface LoginProps {
  onLogin: () => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/token/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Store auth token in sessionStorage
        sessionStorage.setItem("auth_token", data.access);
        sessionStorage.setItem("refresh_token", data.refresh);
        sessionStorage.setItem(
          "auth_user",
          JSON.stringify({
            username: username,
            role: data.role || "Administrator",
          })
        );
        onLogin();
      } else {
        setError(data.detail || "Login yoki parol noto'g'ri!");
      }
    } catch (err) {
      setError("Server bilan bog'lanishda xatolik yuz berdi.");
      console.error("Login error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#0a192f] flex items-center justify-center p-4 transition-colors">
      <SEO 
        title="Kirish" 
        description="FDTU Akademik Litseyi boshqaruv paneliga kirish." 
      />
      {/* Abstract Background Shapes */}
      <div className="absolute top-[-10%] -left-[10%] w-[40%] h-[40%] bg-[#0d89b1]/20 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-[-10%] -right-[10%] w-[40%] h-[40%] bg-[#0d89b1]/10 rounded-full blur-[120px] animate-pulse delay-700" />
      
      <div className="w-full max-w-md relative z-10">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <div className="w-24 h-24 bg-white/10 backdrop-blur-md rounded-3xl shadow-2xl flex items-center justify-center p-5 border border-white/20 transition-all hover:scale-105 duration-300">
              <ImageWithFallback
                src="/logoicon.png"
                alt="FDTU AL Logo"
                className="w-full h-full"
                objectFit="contain"
              />
            </div>
          </div>
          <h1 className="text-4xl font-extrabold text-white tracking-tight mb-2">FDTU AL</h1>
          <p className="text-white/60 font-medium tracking-wide uppercase text-sm">Boshqaruv Paneli</p>
        </div>

        {/* Login Form */}
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] p-10 transition-all border border-white/10">
          <h2 className="text-2xl font-bold text-white mb-8 text-center">
            Tizimga kirish
          </h2>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-sm text-center backdrop-blur-sm animate-shake">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Username */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-white/70 ml-1">
                Login
              </label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-300">
                  <User className="w-5 h-5 text-white/40 group-focus-within:text-[#0d89b1]" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:border-[#0d89b1] focus:ring-4 focus:ring-[#0d89b1]/10 transition-all text-white placeholder-white/20"
                  placeholder="Loginni kiriting"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-white/70 ml-1">
                Parol
              </label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-300">
                  <Lock className="w-5 h-5 text-white/40 group-focus-within:text-[#0d89b1]" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-14 py-4 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:border-[#0d89b1] focus:ring-4 focus:ring-[#0d89b1]/10 transition-all text-white placeholder-white/20"
                  placeholder="Parolni kiriting"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors p-1"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 px-4 py-4 bg-[#0d89b1] hover:bg-[#0a6d8f] text-white rounded-2xl transition-all duration-300 disabled:opacity-50 font-bold text-lg shadow-[0_10px_20px_rgba(13,137,177,0.3)] active:scale-[0.98] mt-8"
            >
              {isLoading ? (
                <>
                  <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                  Tekshirilmoqda...
                </>
              ) : (
                <>
                  <LogIn className="w-6 h-6" />
                  Kirish
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-white/30 text-sm mt-10 font-medium">
          © 2026 FDTU AL. Barcha huquqlar himoyalangan.
        </p>
      </div>
    </div>
  );
}
