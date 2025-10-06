// apps/web/src/pages/Services.tsx
import { BadgeDollarSign, Boxes, ClipboardCheck, Bell, ArrowRight, ShieldCheck, CheckCircle, Zap } from "lucide-react";
import { Link } from "react-router-dom";

export default function Services() {
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
            <h1 className="mt-4 text-3xl font-semibold tracking-tight">Nuestros Servicios</h1>
            <p className="mt-2 text-sm/6 text-slate-300 max-w-2xl mx-auto">
              Soluciones de punta a punta para comprar, valorar y procesar dispositivos con rapidez y transparencia.
            </p>
          </div>
        </div>
      </section>

      {/* Services Content */}
      <section className="mx-auto max-w-6xl px-4 py-8">
        {/* Features Grid */}
        <div className="grid gap-6 md:grid-cols-2">
          <div className="card card-hover">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100">
                <BadgeDollarSign className="h-6 w-6 text-purple-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">Cotizaciones inteligentes</h3>
                <p className="mt-2 text-sm text-gray-600">
                  Obtén precios consistentes en segundos gracias a reglas dinámicas y formularios adaptables por tipo de dispositivo.
                </p>
                <ul className="mt-3 space-y-2">
                  <li className="flex items-center gap-2 text-sm text-gray-600">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Reglas por marca/modelo, año y estado
                  </li>
                  <li className="flex items-center gap-2 text-sm text-gray-600">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Precios preliminares y ofertas finales
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="card card-hover">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100">
                <Boxes className="h-6 w-6 text-purple-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">Catálogo centralizado</h3>
                <p className="mt-2 text-sm text-gray-600">
                  Administra tipos de dispositivos, modelos y formularios de preguntas en un solo lugar.
                </p>
                <ul className="mt-3 space-y-2">
                  <li className="flex items-center gap-2 text-sm text-gray-600">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Control de versiones de formularios
                  </li>
                  <li className="flex items-center gap-2 text-sm text-gray-600">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Integración con reglas de precio
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="card card-hover">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100">
                <ClipboardCheck className="h-6 w-6 text-purple-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">Inspecciones y trazabilidad</h3>
                <p className="mt-2 text-sm text-gray-600">
                  Flujos claros de revisión y registro para garantizar calidad y transparencia en cada paso.
                </p>
                <ul className="mt-3 space-y-2">
                  <li className="flex items-center gap-2 text-sm text-gray-600">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Estados y evidencias por cotización
                  </li>
                  <li className="flex items-center gap-2 text-sm text-gray-600">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Historial de cambios y auditoría
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="card card-hover">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100">
                <Bell className="h-6 w-6 text-purple-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">Notificaciones al usuario</h3>
                <p className="mt-2 text-sm text-gray-600">
                  Mantén a tus clientes informados con alertas oportunas y bandeja de notificaciones.
                </p>
                <ul className="mt-3 space-y-2">
                  <li className="flex items-center gap-2 text-sm text-gray-600">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Mensajes por cambios de estado
                  </li>
                  <li className="flex items-center gap-2 text-sm text-gray-600">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Configurables por rol y evento
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Process Steps */}
        <div className="mt-16">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-semibold text-gray-900">¿Cómo funciona?</h2>
            <p className="mt-2 text-sm text-gray-600">Proceso simple y transparente en 3 pasos</p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-purple-100 mb-4">
                <Zap className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">1. Cotiza</h3>
              <p className="mt-2 text-sm text-gray-600">
                Completa el formulario con los datos de tu dispositivo y obtén una cotización instantánea.
              </p>
            </div>

            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-purple-100 mb-4">
                <ClipboardCheck className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">2. Revisa</h3>
              <p className="mt-2 text-sm text-gray-600">
                Nuestro equipo verifica el estado y características de tu dispositivo.
              </p>
            </div>

            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-purple-100 mb-4">
                <BadgeDollarSign className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">3. Recibe</h3>
              <p className="mt-2 text-sm text-gray-600">
                Aprobamos tu cotización y te pagamos de forma rápida y segura.
              </p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-16 text-center">
          <div className="card max-w-2xl mx-auto">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">¿Listo para comenzar?</h3>
            <p className="text-sm text-gray-600 mb-6">
              Obtén una cotización gratuita para tu dispositivo en menos de 2 minutos.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/quote/new" className="btn-primary">
                Cotizar mi dispositivo
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/login" className="btn-secondary">
                Iniciar sesión
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
