// apps/web/src/pages/admin/AdminDashboard.tsx
import { useEffect, useState } from "react";
import { get } from "../../lib/api";
import { ShieldCheck, Users, Settings, Activity, ArrowRight, CheckCircle, XCircle } from "lucide-react";

type StatusMap = Record<string, { ok: boolean; url?: string }>;

export default function AdminDashboard() {
  const [status, setStatus] = useState<StatusMap | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const s = await get<StatusMap>("/_status");
        setStatus(s);
      } catch (e: any) {
        setErr(e.message || String(e));
      }
    })();
  }, []);

  const serviceCount = status ? Object.keys(status).length : 0;
  const healthyCount = status ? Object.values(status).filter(s => s.ok).length : 0;

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-hero-gradient text-white rounded-xl">
        <div className="absolute inset-0 bg-dots opacity-20 pointer-events-none" />
        <div className="relative p-6">
          <div className="flex items-start justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs text-white/90 ring-1 ring-white/20">
                <ShieldCheck className="h-3 w-3" />
                Panel de Administración
              </div>
              <h1 className="mt-4 text-2xl font-semibold tracking-tight">Dashboard</h1>
              <p className="mt-2 text-sm/6 text-slate-300">
                Monitorea el estado de todos los servicios y gestiona la plataforma
              </p>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 gap-3">
              <div className="kpi">
                <div className="text-sm/5 text-slate-200">Servicios</div>
                <div className="text-2xl font-semibold tracking-tight">{serviceCount}</div>
              </div>
              <div className="kpi">
                <div className="text-sm/5 text-slate-200">Activos</div>
                <div className="text-2xl font-semibold tracking-tight">{healthyCount}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Content Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Service Health */}
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
              <Activity className="h-5 w-5 text-purple-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Salud de servicios</h2>
          </div>
          
          {err && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center gap-2">
              <XCircle className="h-4 w-4" />
              {err}
            </div>
          )}
          
          {!status && !err && (
            <div className="text-center py-8">
              <Activity className="h-8 w-8 mx-auto text-gray-400 animate-pulse" />
              <p className="mt-2 text-sm text-gray-600">Cargando estado de servicios...</p>
            </div>
          )}
          
          {status && (
            <div className="space-y-3">
              {Object.entries(status).map(([serviceName, serviceStatus]) => (
                <div key={serviceName} className="flex items-center justify-between p-3 rounded-lg border bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div className={`h-2 w-2 rounded-full ${serviceStatus.ok ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span className="text-sm font-medium capitalize">{serviceName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {serviceStatus.ok ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600" />
                    )}
                    <span className={`text-xs font-medium ${serviceStatus.ok ? 'text-green-700' : 'text-red-700'}`}>
                      {serviceStatus.ok ? 'OK' : 'DOWN'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
              <Settings className="h-5 w-5 text-purple-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Acciones rápidas</h2>
          </div>
          
          <div className="space-y-3">
            <a href="/admin/users" className="flex items-center justify-between p-4 rounded-lg border hover:bg-gray-50 transition-colors group">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100">
                  <Users className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <div className="font-medium text-gray-900">Usuarios</div>
                  <div className="text-sm text-gray-500">Gestionar usuarios y roles</div>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600" />
            </a>

            <a href="/admin/forms" className="flex items-center justify-between p-4 rounded-lg border hover:bg-gray-50 transition-colors group">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-100">
                  <Settings className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <div className="font-medium text-gray-900">Formularios</div>
                  <div className="text-sm text-gray-500">Configurar formularios de cotización</div>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600" />
            </a>

            <a href="/admin/quotes" className="flex items-center justify-between p-4 rounded-lg border hover:bg-gray-50 transition-colors group">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100">
                  <Activity className="h-4 w-4 text-purple-600" />
                </div>
                <div>
                  <div className="font-medium text-gray-900">Cotizaciones</div>
                  <div className="text-sm text-gray-500">Revisar y gestionar cotizaciones</div>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
