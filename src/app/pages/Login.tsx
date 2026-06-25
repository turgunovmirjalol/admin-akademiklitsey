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
      <div className="absolute top-[-10%] -left-[10%] w-[40%] h-[40%] bg-[#0d89b1]/20 blur-[120px] animate-pulse" />
      <div className="absolute bottom-[-10%] -right-[10%] w-[40%] h-[40%] bg-[#0d89b1]/10 blur-[120px] animate-pulse delay-700" />
      
      <div className="w-full max-w-md relative z-10">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-24 h-24 bg-white rounded-xl shadow-lg flex items-center justify-center p-4 border border-gray-200">
              <ImageWithFallback
                src="/litseylogo.png"
                alt="Farg'ona Davlat Texnika Universiteti 1-Son Akademik Litseyi"
                className="w-full h-full"
                objectFit="contain"
              />
            </div>
          </div>
          <h1 className="text-sm font-bold text-white tracking-tight leading-snug max-w-xs mx-auto">
            FARG'ONA DAVLAT TEXNIKA UNIVERSITETI <br />1-SON AKADEMIK LITSEYI
          </h1>
        </div>

        {/* Login Form */}
        <div className="bg-white/10 backdrop-blur-xl rounded-lg shadow-[0_15px_40px_rgba(0,0,0,0.3)] p-8 border border-white/10">
          <h2 className="text-xl font-semibold text-white mb-6 text-center">
            Tizimga kirish
          </h2>

          {error && (
            <div className="mb-5 p-3.5 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm text-center backdrop-blur-sm animate-shake">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-white/60 uppercase tracking-wider">
                Login
              </label>
              <div className="relative group">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors duration-300">
                  <User className="w-4 h-4 text-white/40 group-focus-within:text-[#0d89b1]" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-[#0d89b1] focus:ring-2 focus:ring-[#0d89b1]/10 transition-all text-white placeholder-white/20 text-sm"
                  placeholder="Loginni kiriting"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-white/60 uppercase tracking-wider">
                Parol
              </label>
              <div className="relative group">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors duration-300">
                  <Lock className="w-4 h-4 text-white/40 group-focus-within:text-[#0d89b1]" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-[#0d89b1] focus:ring-2 focus:ring-[#0d89b1]/10 transition-all text-white placeholder-white/20 text-sm"
                  placeholder="Parolni kiriting"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors p-1"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#0d89b1] hover:bg-[#0a6d8f] rounded-lg text-white transition-all duration-300 disabled:opacity-50 font-semibold text-sm shadow-[0_8px_16px_rgba(13,137,177,0.3)] active:scale-[0.98] mt-6"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Tekshirilmoqda...
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  Kirish
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}