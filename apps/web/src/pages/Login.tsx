// apps/web/src/pages/Login.tsx
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { GoogleLogin, CredentialResponse } from "@react-oauth/google";
import { useAuth } from "../lib/auth";
import { Mail, Lock, ArrowRight, ShieldCheck } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { refresh } = useAuth();

  async function loginLocal(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const base = (import.meta.env.VITE_API_BASE || "http://localhost:8080/api").replace(/\/$/, "");
      const r = await fetch(`${base}/auth/local/login`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || data?.message || `${r.status}`);
      localStorage.setItem("idToken", data.token);
      await refresh();
      navigate("/quotes");
    } catch (e: any) {
      setErr(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  async function onGoogleSuccess(cred: CredentialResponse) {
    const idToken = cred?.credential || "";
    if (!idToken) return;
    localStorage.setItem("idToken", idToken);
    await refresh();
    navigate("/quotes");
  }
  function onGoogleError() {
    setErr("Error con Google");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-hero-gradient text-white">
        <div className="absolute inset-0 bg-dots opacity-20 pointer-events-none" />
        <div className="mx-auto max-w-6xl px-4 py-10 relative">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs text-white/90 ring-1 ring-white/20">
              <ShieldCheck className="h-3 w-3" />
              ReeUtil
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight">Iniciar sesión</h1>
            <p className="mt-2 text-sm/6 text-slate-300">
              Accede a tu cuenta para gestionar tus cotizaciones
            </p>
          </div>
        </div>
      </section>

      {/* Login Form */}
      <section className="mx-auto max-w-md px-4 py-8">
        <div className="card">
          <div className="text-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Bienvenido de vuelta</h2>
            <p className="mt-1 text-sm text-gray-600">Usa tus credenciales o tu cuenta de Google</p>
          </div>

          {err && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" />
              {err}
            </div>
          )}

          <form onSubmit={loginLocal} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <input
                  className="field pl-10"
                  placeholder="tu@email.com"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <input
                  className="field pl-10"
                  placeholder="••••••••"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <button className="btn-primary w-full" disabled={loading}>
              {loading ? "Ingresando…" : "Iniciar sesión"}
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">O continúa con</span>
              </div>
            </div>

            <div className="mt-4 flex justify-center">
              <GoogleLogin onSuccess={onGoogleSuccess} onError={onGoogleError} size="large" theme="outline" />
            </div>
          </div>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              ¿No tienes cuenta?{" "}
              <Link to="/register" className="text-purple-600 hover:text-purple-700 font-medium">
                Regístrate aquí
              </Link>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
