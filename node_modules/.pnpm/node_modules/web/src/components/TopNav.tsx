// apps/web/src/components/TopNav.tsx
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import NotificationBell from "./NotificationBell";
import { ShieldCheck, LogOut, User } from "lucide-react";

export default function TopNav() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { me, refresh, setMe } = useAuth();

  // Helper para links
  const link = (to: string, label: string) => {
    const active = pathname === to;
    return (
      <Link
        to={to}
        className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
          active 
            ? "bg-purple-600 text-white shadow-md shadow-purple-200" 
            : "text-gray-700 hover:bg-purple-50 hover:text-purple-700"
        }`}
      >
        {label}
      </Link>
    );
  };

  function logout() {
    localStorage.removeItem("idToken");
    setMe(null);
  }

  const canSeeAdmin = !!me && (me.roles.includes("admin") || me.roles.includes("staff"));

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur-sm shadow-sm">
      <div className="mx-auto max-w-6xl px-4 py-4 flex items-center gap-6">
        {/* Branding */}
        <Link to="/" className="flex items-center gap-2 text-xl font-semibold tracking-tight text-gray-900">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-600">
            <ShieldCheck className="h-5 w-5 text-white" />
          </div>
          ReeUtil
        </Link>

        {/* Nav principal */}
        <nav className="flex gap-1 text-sm">
          {!me ? (
            <>
              {link("/", "Inicio")}
              {link("/services", "Servicios")}
              {link("/contact", "Contacto")}
            </>
          ) : (
            <>
              {link("/", "Inicio")}
              {link("/quote/new", "Nueva cotización")}
              {link("/quotes", "Mis cotizaciones")}
              {canSeeAdmin && link("/admin", "Admin")}
            </>
          )}
        </nav>

        {/* Spacer para empujar a la derecha */}
        <div className="flex-1" />

        {/* Acciones derecha */}
        <div className="flex items-center gap-3">
          {/* Campana sólo si hay sesión */}
          {me && <NotificationBell />}

          {!me ? (
            <div className="flex items-center gap-2">
              <button className="btn-secondary" onClick={() => navigate("/login")}>
                Iniciar sesión
              </button>
              <button className="btn-primary" onClick={() => navigate("/register")}>
                Registrarse
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              {/* User Info */}
              <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-50">
                {me.picture ? (
                  <img 
                    src={me.picture} 
                    className="h-8 w-8 rounded-full ring-2 ring-purple-200" 
                    alt="Avatar del usuario" 
                  />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100">
                    <User className="h-4 w-4 text-purple-600" />
                  </div>
                )}
                <div className="text-sm">
                  <div className="font-medium leading-4 text-gray-900">
                    {me.name || me.email || "Usuario"}
                  </div>
                  <div className="text-xs text-gray-500 capitalize">
                    {me.roles.join(", ")}
                  </div>
                </div>
              </div>
              
              {/* Logout Button */}
              <button 
                className="btn-secondary flex items-center gap-2" 
                onClick={logout}
                title="Cerrar sesión"
              >
                <LogOut className="h-4 w-4" />
                Salir
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
