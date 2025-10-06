// apps/web/src/pages/MyQuotes.tsx
import { useEffect, useState } from "react";
import { get } from "../lib/api";
import { useNavigate } from "react-router-dom";
import { 
  RefreshCcw, 
  Plus, 
  Eye, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Smartphone,
  Laptop,
  Tablet,
  Tv,
  Watch,
  Headphones,
  Camera,
  Printer,
  Monitor,
  Speaker,
  Box,
  Calendar,
  DollarSign,
  Filter,
  Search
} from "lucide-react";

type Quote = {
  _id: string;
  userId: string;
  deviceType?: string | null;
  modelIdExt?: string | null;
  answers?: Record<string, any>;
  offeredPrice?: number | null;
  prelimPrice?: number | null;
  status: "PENDING" | "APPROVED" | "REJECTED" | "NEEDS_INFO";
  createdAt: string;
  updatedAt?: string;
};

function statusText(st: Quote["status"]) {
  switch (st) {
    case "PENDING":
      return "Pendiente";
    case "APPROVED":
      return "Aprobada";
    case "REJECTED":
      return "Rechazada";
    case "NEEDS_INFO":
      return "Requiere info";
    default:
      return st;
  }
}

function statusBadge(st: Quote["status"]) {
  const base = "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium";
  switch (st) {
    case "PENDING":
      return <span className={`${base} bg-amber-100 text-amber-800`}>Pendiente</span>;
    case "APPROVED":
      return <span className={`${base} bg-emerald-100 text-emerald-800`}>Aprobada</span>;
    case "REJECTED":
      return <span className={`${base} bg-rose-100 text-rose-800`}>Rechazada</span>;
    case "NEEDS_INFO":
      return <span className={`${base} bg-sky-100 text-sky-800`}>Requiere info</span>;
    default:
      return <span className={`${base} bg-gray-100 text-gray-800`}>{st}</span>;
  }
}

function statusIcon(st: Quote["status"]) {
  switch (st) {
    case "PENDING":
      return <Clock className="h-4 w-4 text-amber-600" />;
    case "APPROVED":
      return <CheckCircle className="h-4 w-4 text-emerald-600" />;
    case "REJECTED":
      return <XCircle className="h-4 w-4 text-rose-600" />;
    case "NEEDS_INFO":
      return <AlertCircle className="h-4 w-4 text-sky-600" />;
    default:
      return <Clock className="h-4 w-4 text-gray-600" />;
  }
}

function getDeviceIcon(deviceType?: string | null, modelIdExt?: string | null) {
  const type = deviceType?.toLowerCase() || modelIdExt?.toLowerCase() || "";
  
  if (type.includes("tel") || type.includes("phone") || type.includes("móvil") || type.includes("iphone")) 
    return <Smartphone className="h-5 w-5 text-blue-600" />;
  if (type.includes("laptop") || type.includes("notebook") || type.includes("portátil") || type.includes("macbook")) 
    return <Laptop className="h-5 w-5 text-gray-600" />;
  if (type.includes("tablet") || type.includes("ipad")) 
    return <Tablet className="h-5 w-5 text-purple-600" />;
  if (type.includes("tv") || type.includes("tele")) 
    return <Tv className="h-5 w-5 text-red-600" />;
  if (type.includes("reloj") || type.includes("watch")) 
    return <Watch className="h-5 w-5 text-green-600" />;
  if (type.includes("aud") || type.includes("head") || type.includes("ear")) 
    return <Headphones className="h-5 w-5 text-pink-600" />;
  if (type.includes("cámara") || type.includes("camera")) 
    return <Camera className="h-5 w-5 text-indigo-600" />;
  if (type.includes("impres") || type.includes("print")) 
    return <Printer className="h-5 w-5 text-orange-600" />;
  if (type.includes("monitor")) 
    return <Monitor className="h-5 w-5 text-cyan-600" />;
  if (type.includes("parlante") || type.includes("speaker")) 
    return <Speaker className="h-5 w-5 text-yellow-600" />;
  
  return <Box className="h-5 w-5 text-gray-500" />;
}

function formatAnswers(answers?: Record<string, any>) {
  if (!answers || Object.keys(answers).length === 0) return null;
  
  const formatted: string[] = [];
  
  if (answers.pantalla) {
    formatted.push(`Pantalla: ${answers.pantalla === "intacta" ? "✅ Intacta" : "❌ Quebrada"}`);
  }
  if (typeof answers.bateria_ok === "boolean") {
    formatted.push(`Batería: ${answers.bateria_ok ? "✅ OK" : "❌ Problemas"}`);
  }
  if (answers.almacenamiento_gb) {
    formatted.push(`Almacenamiento: ${answers.almacenamiento_gb}GB`);
  }
  
  return formatted;
}

export default function MyQuotes() {
  const navigate = useNavigate();
  const [list, setList] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [statusChanged, setStatusChanged] = useState(false);

  async function load(status?: string, force = false) {
    try {
      setLoading(true);
      const qs = status ? `?status=${encodeURIComponent(status)}` : "";
      // Agregar timestamp para evitar cache
      const cacheBuster = force ? `&_t=${Date.now()}` : "";
      const data = await get<Quote[]>(`/quotes${qs}${cacheBuster}`);
      const newList = Array.isArray(data) ? data : [];
      
      
      // Detectar cambios de estado
      if (list.length > 0 && newList.length > 0) {
        const hasStatusChange = list.some(oldQuote => {
          const newQuote = newList.find(q => q._id === oldQuote._id);
          return newQuote && newQuote.status !== oldQuote.status;
        });
        
        if (hasStatusChange) {
          setStatusChanged(true);
          setTimeout(() => setStatusChanged(false), 3000); // Reset después de 3 segundos
        }
      }
      
      setList(newList);
      setLastUpdate(new Date());
      setErr("");
    } catch (e: any) {
      setErr(e?.message || "Error al cargar");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const token = localStorage.getItem("idToken");
    if (!token) return;
    load();
    
    // Actualizar automáticamente cada 5 segundos para cambios más rápidos
    const interval = setInterval(() => {
      load(undefined, true); // Forzar actualización
    }, 5000);
    
    // También actualizar cuando el usuario regresa a la pestaña
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        load(undefined, true); // Forzar actualización
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const filteredList = list.filter(quote => {
    const matchesSearch = !searchTerm || 
      quote.modelIdExt?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quote.deviceType?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quote._id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = !statusFilter || quote.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: list.length,
    pending: list.filter(q => q.status === "PENDING").length,
    approved: list.filter(q => q.status === "APPROVED").length,
    rejected: list.filter(q => q.status === "REJECTED").length,
    needsInfo: list.filter(q => q.status === "NEEDS_INFO").length,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-hero-gradient text-white">
        <div className="absolute inset-0 bg-dots opacity-20 pointer-events-none" />
        <div className="mx-auto max-w-6xl px-4 py-10 relative">
          <div className="flex items-start justify-between gap-6">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">Mis cotizaciones</h1>
              <p className="mt-2 text-sm/6 text-slate-300">
                Gestiona y revisa el estado de todas tus cotizaciones
              </p>
              <div className="mt-6">
                <button
                  onClick={() => navigate("/quote/new")}
                  className="btn-primary"
                >
                  <Plus className="h-4 w-4" />
                  Nueva cotización
                </button>
              </div>
            </div>

            {/* Stats KPIs */}
            <div className="grid grid-cols-2 gap-3">
              <div className="kpi">
                <div className="text-sm/5 text-slate-200">Total</div>
                <div className="text-2xl font-semibold tracking-tight">{stats.total}</div>
              </div>
              <div className="kpi">
                <div className="text-sm/5 text-slate-200">Pendientes</div>
                <div className="text-2xl font-semibold tracking-tight">{stats.pending}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="mx-auto max-w-6xl px-4 py-8">

        {/* Stats Cards */}
        <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-3">
          <div className="card card-hover">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-emerald-100 p-2">
                <CheckCircle className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <div className="text-2xl font-semibold">{stats.approved}</div>
                <div className="text-xs text-gray-500">Aprobadas</div>
              </div>
            </div>
          </div>
          
          <div className="card card-hover">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-rose-100 p-2">
                <XCircle className="h-5 w-5 text-rose-600" />
              </div>
              <div>
                <div className="text-2xl font-semibold">{stats.rejected}</div>
                <div className="text-xs text-gray-500">Rechazadas</div>
              </div>
            </div>
          </div>
          
          <div className="card card-hover">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-sky-100 p-2">
                <AlertCircle className="h-5 w-5 text-sky-600" />
              </div>
              <div>
                <div className="text-2xl font-semibold">{stats.needsInfo}</div>
                <div className="text-xs text-gray-500">Requieren info</div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por modelo, tipo o ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="field pl-10"
              />
            </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="field"
                  aria-label="Filtrar por estado"
                >
              <option value="">Todos los estados</option>
              <option value="PENDING">Pendiente</option>
              <option value="APPROVED">Aprobada</option>
              <option value="REJECTED">Rechazada</option>
              <option value="NEEDS_INFO">Requiere info</option>
            </select>
          </div>
          
          <div className="flex items-center gap-3">
            {lastUpdate && (
              <div className="text-xs text-gray-500">
                Última actualización: {lastUpdate.toLocaleTimeString()}
              </div>
            )}
            <button
              onClick={() => load(undefined, true)}
              disabled={loading}
              className="btn-secondary flex items-center gap-2"
            >
              <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              {loading ? "Cargando..." : "Actualizar"}
            </button>
            
          </div>
        </div>

        {/* Status Change Indicator */}
        {statusChanged && (
          <div className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            ¡Estado actualizado! Los cambios se han sincronizado.
          </div>
        )}

        {/* Error (solo mostrar si no hay datos) */}
        {err && list.length === 0 && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {(/not\s*found/i.test(err) || /404/.test(err)) ? "No se encontraron datos en este momento." : err}
          </div>
        )}

        {/* Empty State */}
        {filteredList.length === 0 && !loading && (
          <div className="card text-center py-12">
            <Box className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">
              {localStorage.getItem("idToken") 
                ? "No tienes cotizaciones aún" 
                : "Inicia sesión para ver tus cotizaciones"}
            </h3>
            <p className="mt-2 text-sm text-gray-500">
              {localStorage.getItem("idToken") 
                ? "Crea tu primera cotización para comenzar" 
                : "Necesitas autenticarte para acceder a tus cotizaciones"}
            </p>
            {localStorage.getItem("idToken") && (
              <button
                onClick={() => navigate("/quote/new")}
                className="btn-primary mt-4"
              >
                Crear cotización
              </button>
            )}
          </div>
        )}

        {/* Quotes List */}
        {filteredList.length > 0 && (
          <div className="grid gap-4">
            {filteredList.map((quote) => {
              const answers = formatAnswers(quote.answers);
              const price = quote.offeredPrice || quote.prelimPrice;
              
              return (
                <div key={quote._id} className="card hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      {/* Device Icon */}
                      <div className="flex-shrink-0">
                        {getDeviceIcon(quote.deviceType, quote.modelIdExt)}
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-gray-900 truncate">
                            {quote.modelIdExt || quote.deviceType || "Cotización"}
                          </h3>
                          {statusBadge(quote.status)}
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {new Date(quote.createdAt).toLocaleDateString()}
                          </div>
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-4 w-4" />
                            {price ? `$${price}` : "Sin precio"}
                          </div>
                          <div className="text-xs bg-gray-100 px-2 py-1 rounded">
                            ID: {quote._id.slice(-8)}
                          </div>
                        </div>
                        
                        {/* Answers Summary */}
                        {answers && answers.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-3">
                            {answers.map((answer, idx) => (
                              <span
                                key={idx}
                                className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded"
                              >
                                {answer}
                              </span>
                            ))}
                          </div>
                        )}
                        
                        {/* Status Message */}
                        <div className="flex items-center gap-2 text-sm">
                          {statusIcon(quote.status)}
                          <span className="text-gray-600">
                            {quote.status === "PENDING" && "Tu cotización está siendo revisada por nuestro equipo"}
                            {quote.status === "APPROVED" && "¡Excelente! Tu cotización fue aprobada"}
                            {quote.status === "REJECTED" && "Tu cotización no fue aprobada en esta ocasión"}
                            {quote.status === "NEEDS_INFO" && "Necesitamos más información para procesar tu cotización"}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Actions */}
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => navigate(`/quotes/${quote._id}`)}
                        className="btn-ghost text-sm"
                        title="Ver detalles"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
