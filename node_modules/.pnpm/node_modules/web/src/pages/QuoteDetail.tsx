// apps/web/src/pages/QuoteDetail.tsx
import { useEffect, useState } from "react";
import { get } from "../lib/api";
import { useParams, useNavigate } from "react-router-dom";
import { 
  ArrowLeft,
  Calendar,
  DollarSign,
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
  RefreshCcw,
  User,
  Tag
} from "lucide-react";

type Quote = {
  _id: string;
  userId: string;
  deviceType?: string | null;
  modelIdExt?: string | null;
  answers?: Record<string, any>;
  offeredPrice?: number | null;
  prelimPrice?: number | null;
  ruleVersion?: number | null;
  ruleSnapshot?: any;
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
  const base = "inline-flex items-center px-3 py-1 rounded-full text-sm font-medium";
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
      return <Clock className="h-5 w-5 text-amber-600" />;
    case "APPROVED":
      return <CheckCircle className="h-5 w-5 text-emerald-600" />;
    case "REJECTED":
      return <XCircle className="h-5 w-5 text-rose-600" />;
    case "NEEDS_INFO":
      return <AlertCircle className="h-5 w-5 text-sky-600" />;
    default:
      return <Clock className="h-5 w-5 text-gray-600" />;
  }
}

function getDeviceIcon(deviceType?: string | null, modelIdExt?: string | null) {
  const type = deviceType?.toLowerCase() || modelIdExt?.toLowerCase() || "";
  
  if (type.includes("tel") || type.includes("phone") || type.includes("móvil") || type.includes("iphone")) 
    return <Smartphone className="h-8 w-8 text-blue-600" />;
  if (type.includes("laptop") || type.includes("notebook") || type.includes("portátil") || type.includes("macbook")) 
    return <Laptop className="h-8 w-8 text-gray-600" />;
  if (type.includes("tablet") || type.includes("ipad")) 
    return <Tablet className="h-8 w-8 text-purple-600" />;
  if (type.includes("tv") || type.includes("tele")) 
    return <Tv className="h-8 w-8 text-red-600" />;
  if (type.includes("reloj") || type.includes("watch")) 
    return <Watch className="h-8 w-8 text-green-600" />;
  if (type.includes("aud") || type.includes("head") || type.includes("ear")) 
    return <Headphones className="h-8 w-8 text-pink-600" />;
  if (type.includes("cámara") || type.includes("camera")) 
    return <Camera className="h-8 w-8 text-indigo-600" />;
  if (type.includes("impres") || type.includes("print")) 
    return <Printer className="h-8 w-8 text-orange-600" />;
  if (type.includes("monitor")) 
    return <Monitor className="h-8 w-8 text-cyan-600" />;
  if (type.includes("parlante") || type.includes("speaker")) 
    return <Speaker className="h-8 w-8 text-yellow-600" />;
  
  return <Box className="h-8 w-8 text-gray-500" />;
}

export default function QuoteDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  async function loadQuote(force = false) {
    if (!id) return;
    
    try {
      setLoading(true);
      // Agregar timestamp para evitar cache
      const cacheBuster = force ? `?_t=${Date.now()}` : "";
      const data = await get<Quote>(`/quotes/${id}${cacheBuster}`);
      setQuote(data);
      setErr("");
    } catch (e: any) {
      setErr(e?.message || "Error al cargar la cotización");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadQuote();
    
    // Actualizar automáticamente cada 5 segundos para cambios más rápidos
    const interval = setInterval(() => {
      loadQuote(true); // Forzar actualización
    }, 5000);
    
    // También actualizar cuando el usuario regresa a la pestaña
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadQuote(true); // Forzar actualización
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCcw className="h-8 w-8 animate-spin mx-auto text-gray-400" />
          <p className="mt-2 text-gray-600">Cargando cotización...</p>
        </div>
      </div>
    );
  }

  if (err || !quote) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <XCircle className="h-12 w-12 mx-auto text-red-400" />
          <h2 className="mt-4 text-xl font-semibold text-gray-900">Error</h2>
          <p className="mt-2 text-gray-600">{err || "Cotización no encontrada"}</p>
          <button
            onClick={() => navigate("/quotes")}
            className="btn-primary mt-4"
          >
            Volver a mis cotizaciones
          </button>
        </div>
      </div>
    );
  }

  const price = quote.offeredPrice || quote.prelimPrice;
  const answers = quote.answers || {};

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-hero-gradient text-white">
        <div className="absolute inset-0 bg-dots opacity-20 pointer-events-none" />
        <div className="mx-auto max-w-6xl px-4 py-10 relative">
          <div className="flex items-start justify-between gap-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate("/quotes")}
                className="btn-ghost mb-0 flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Volver
              </button>
            </div>
            <div className="text-right">
              <div className="text-sm/5 text-slate-200">Estado</div>
              <div className="text-2xl font-semibold tracking-tight">{statusText(quote.status)}</div>
            </div>
          </div>
          
          <div className="mt-6 flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-white/10 ring-2 ring-white/20">
              {getDeviceIcon(quote.deviceType, quote.modelIdExt)}
            </div>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">
                {quote.modelIdExt || quote.deviceType || "Cotización"}
              </h1>
              <p className="mt-1 text-sm/6 text-slate-300">ID: {quote._id}</p>
              {price && (
                <div className="mt-2 text-2xl font-bold">
                  ${price}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="mx-auto max-w-4xl px-4 py-8">

        <div className="grid gap-6 md:grid-cols-2">
          {/* Información Principal */}
          <div className="space-y-6">
            {/* Estado */}
            <div className="card">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                {statusIcon(quote.status)}
                Estado de la cotización
              </h3>
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-600">
                    {quote.status === "PENDING" && "Tu cotización está siendo revisada por nuestro equipo"}
                    {quote.status === "APPROVED" && "¡Excelente! Tu cotización fue aprobada"}
                    {quote.status === "REJECTED" && "Tu cotización no fue aprobada en esta ocasión"}
                    {quote.status === "NEEDS_INFO" && "Necesitamos más información para procesar tu cotización"}
                  </span>
                </div>
                <div className="text-xs text-gray-500">
                  Creada: {new Date(quote.createdAt).toLocaleString()}
                  {quote.updatedAt && (
                    <span className="ml-2">
                      • Actualizada: {new Date(quote.updatedAt).toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Precio */}
            <div className="card">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Información de precio
              </h3>
              <div className="space-y-3">
                {price && (
                  <div className="text-2xl font-bold text-green-600">
                    ${price}
                  </div>
                )}
                {quote.prelimPrice && quote.offeredPrice && quote.prelimPrice !== quote.offeredPrice && (
                  <div className="text-sm text-gray-600">
                    Precio preliminar: ${quote.prelimPrice}
                  </div>
                )}
                {quote.ruleVersion && (
                  <div className="text-xs text-gray-500">
                    Calculado con regla v{quote.ruleVersion}
                  </div>
                )}
              </div>
            </div>

            {/* Detalles del dispositivo */}
            <div className="card">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Tag className="h-5 w-5" />
                Detalles del dispositivo
              </h3>
              <div className="space-y-2 text-sm">
                {quote.deviceType && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tipo:</span>
                    <span className="font-medium">{quote.deviceType}</span>
                  </div>
                )}
                {quote.modelIdExt && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Modelo:</span>
                    <span className="font-medium">{quote.modelIdExt}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">Usuario:</span>
                  <span className="font-medium">{quote.userId}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Diagnóstico */}
          <div className="space-y-6">
            <div className="card">
              <h3 className="font-semibold mb-4">Diagnóstico del dispositivo</h3>
              <div className="space-y-3">
                {answers.pantalla && (
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium">Pantalla</span>
                    <span className={`text-sm ${answers.pantalla === "intacta" ? "text-green-600" : "text-red-600"}`}>
                      {answers.pantalla === "intacta" ? "✅ Intacta" : "❌ Quebrada"}
                    </span>
                  </div>
                )}
                
                {typeof answers.bateria_ok === "boolean" && (
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium">Batería</span>
                    <span className={`text-sm ${answers.bateria_ok ? "text-green-600" : "text-red-600"}`}>
                      {answers.bateria_ok ? "✅ OK" : "❌ Problemas"}
                    </span>
                  </div>
                )}
                
                {answers.almacenamiento_gb && (
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium">Almacenamiento</span>
                    <span className="text-sm font-medium">{answers.almacenamiento_gb}GB</span>
                  </div>
                )}
              </div>
            </div>

            {/* Información de cálculo */}
            {quote.ruleSnapshot && Object.keys(quote.ruleSnapshot).length > 0 && (
              <div className="card">
                <h3 className="font-semibold mb-4">Información de cálculo</h3>
                <div className="space-y-3">
                  {quote.ruleSnapshot.basePrice && (
                    <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                      <span className="text-sm font-medium text-blue-900">Precio base</span>
                      <span className="text-sm font-bold text-blue-600">${quote.ruleSnapshot.basePrice}</span>
                    </div>
                  )}
                  
                  {quote.ruleSnapshot.minPrice && (
                    <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                      <span className="text-sm font-medium text-green-900">Precio mínimo</span>
                      <span className="text-sm font-bold text-green-600">${quote.ruleSnapshot.minPrice}</span>
                    </div>
                  )}
                  
                  {quote.ruleSnapshot.adjustments && Array.isArray(quote.ruleSnapshot.adjustments) && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-gray-700">Ajustes aplicados:</h4>
                      {quote.ruleSnapshot.adjustments.map((adj: any, idx: number) => (
                        <div key={idx} className="p-2 bg-gray-50 rounded text-xs">
                          {adj.if && adj.then !== undefined && (
                            <div className="flex items-center gap-2">
                              <span className="text-gray-600">
                                {adj.if["=="] ? 
                                  `Si ${adj.if["=="][0]?.var} es "${adj.if["=="][1]}"` :
                                  "Condición especial"
                                }
                              </span>
                              <span className="font-medium">
                                {adj.then > 0 ? `+$${adj.then}` : `$${adj.then}`}
                              </span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {quote.ruleVersion && (
                    <div className="text-xs text-gray-500 bg-gray-100 p-2 rounded">
                      Regla de precios versión {quote.ruleVersion}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Acciones */}
        <div className="mt-8 flex justify-center">
          <button
            onClick={() => navigate("/quotes")}
            className="btn-primary"
          >
            Volver a mis cotizaciones
          </button>
        </div>
      </section>
    </div>
  );
}
